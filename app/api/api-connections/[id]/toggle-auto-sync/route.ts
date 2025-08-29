import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function PUT(
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
    const connectionId = params.id;
    const { enabled } = await request.json();

    const result = await query(
      `UPDATE api_connections 
       SET auto_sync_enabled = $1, 
           sync_frequency = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [enabled, enabled ? 'auto' : 'manual', connectionId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'API connection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: enabled ? '자동 동기화가 활성화되었습니다.' : '자동 동기화가 비활성화되었습니다.',
      connection: result.rows[0]
    });

  } catch (error) {
    console.error('Error toggling auto-sync:', error);
    return NextResponse.json(
      { error: '자동 동기화 설정 변경에 실패했습니다.' },
      { status: 500 }
    );
  }
}