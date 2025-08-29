import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const libraryId = params.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(libraryId)) {
      return NextResponse.json(
        { error: '잘못된 라이브러리 ID 형식입니다.' },
        { status: 400 }
      );
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Check if library exists and is not already deleted
      const checkResult = await query(
        'SELECT name, deleted_at FROM libraries WHERE id = $1',
        [libraryId]
      );

      if (checkResult.rows.length === 0) {
        await query('ROLLBACK');
        return NextResponse.json(
          { error: '라이브러리를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      if (checkResult.rows[0].deleted_at) {
        await query('ROLLBACK');
        return NextResponse.json(
          { error: '이미 삭제된 라이브러리입니다.' },
          { status: 400 }
        );
      }

      // Soft delete related library_devices
      await query(
        'DELETE FROM library_devices WHERE library_id = $1',
        [libraryId]
      );

      // Soft delete the library
      const result = await query(
        `UPDATE libraries 
         SET deleted_at = CURRENT_TIMESTAMP, 
             deleted_by = $1, 
             deletion_reason = 'User deletion',
             status = 'deleted'
         WHERE id = $2 
         RETURNING name`,
        [user.userId, libraryId]
      );

      if (result.rows.length === 0) {
        await query('ROLLBACK');
        return NextResponse.json(
          { error: '라이브러리를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `${result.rows[0].name} 라이브러리가 삭제되었습니다.`
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error deleting library:', error);
    return NextResponse.json(
      { error: '라이브러리 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}