import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

/**
 * @swagger
 * /api/api-connections/{id}/toggle-auto-sync:
 *   put:
 *     summary: 자동 동기화 토글
 *     description: API 연결의 자동 동기화를 활성화 또는 비활성화합니다.
 *     tags: [API Connections]
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
 *         description: API 연결 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enabled
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: 자동 동기화 활성화 여부
 *     responses:
 *       200:
 *         description: 자동 동기화 설정 변경 성공
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
 *                   example: 자동 동기화가 활성화되었습니다.
 *                 connection:
 *                   type: object
 *                   description: 업데이트된 API 연결 정보
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: API 연결을 찾을 수 없음
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