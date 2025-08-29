import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: libraryId } = await params;
    const { deviceIds } = await request.json();

    if (!Array.isArray(deviceIds)) {
      return NextResponse.json(
        { error: 'deviceIds must be an array' },
        { status: 400 }
      );
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Remove all existing device links for this library
      await query(
        'DELETE FROM library_devices WHERE library_id = $1',
        [libraryId]
      );

      // Add new device links
      if (deviceIds.length > 0) {
        const values = deviceIds.map((deviceId, index) => 
          `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`
        ).join(', ');

        const queryParams: any[] = [];
        deviceIds.forEach((deviceId) => {
          queryParams.push(libraryId, deviceId, user.userId);
        });

        await query(
          `INSERT INTO library_devices (library_id, device_id, linked_by)
           VALUES ${values}`,
          queryParams
        );
      }

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        message: '디바이스 연결이 업데이트되었습니다.',
        linkedDevices: deviceIds.length
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error linking devices:', error);
    return NextResponse.json(
      { error: 'Failed to link devices' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: libraryId } = await params;

    // Get linked devices
    const result = await query(
      `SELECT 
        d.id, d.name, d.device_type, d.status,
        ld.linked_at
      FROM library_devices ld
      JOIN devices d ON ld.device_id = d.id
      WHERE ld.library_id = $1
      ORDER BY ld.linked_at DESC`,
      [libraryId]
    );

    return NextResponse.json({
      success: true,
      devices: result.rows
    });

  } catch (error) {
    console.error('Error fetching linked devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch linked devices' },
      { status: 500 }
    );
  }
}