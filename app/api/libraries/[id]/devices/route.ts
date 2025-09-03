import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

/**
 * @swagger
 * /api/libraries/{id}/devices:
 *   post:
 *     summary: 라이브러리와 디바이스 연결
 *     description: 특정 라이브러리와 여러 디바이스를 연결합니다. 기존 연결은 대체됩니다.
 *     tags: [Libraries]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 라이브러리 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceIds
 *             properties:
 *               deviceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: 연결할 디바이스 ID 배열
 *     responses:
 *       200:
 *         description: 디바이스 연결 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 디바이스 연결이 업데이트되었습니다.
 *                 linkedDevices:
 *                   type: integer
 *                   description: 연결된 디바이스 수
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /api/libraries/{id}/devices:
 *   get:
 *     summary: 라이브러리와 연결된 디바이스 조회
 *     description: 특정 라이브러리와 연결된 디바이스 목록을 조회합니다.
 *     tags: [Libraries]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 라이브러리 ID
 *     responses:
 *       200:
 *         description: 디바이스 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 devices:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       manufacturer:
 *                         type: string
 *                       model:
 *                         type: string
 *                       status:
 *                         type: string
 *                       linked_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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