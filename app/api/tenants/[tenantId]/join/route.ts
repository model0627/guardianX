import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/tenants/{tenantId}/join:
 *   post:
 *     summary: 테넌트에 가입 요청
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: 테넌트 ID
 *     responses:
 *       200:
 *         description: 테넌트 가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 테넌트를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 테넌트 존재 확인
    const tenantResult = await query(
      'SELECT id, name, is_active FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { error: '테넌트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const tenant = tenantResult.rows[0];

    if (!tenant.is_active) {
      return NextResponse.json(
        { error: '비활성화된 테넌트입니다.' },
        { status: 400 }
      );
    }

    // 이미 멤버인지 확인
    const membershipResult = await query(
      'SELECT id FROM tenant_memberships WHERE tenant_id = $1 AND user_id = $2',
      [tenantId, user.userId]
    );

    if (membershipResult.rows.length > 0) {
      return NextResponse.json(
        { error: '이미 해당 테넌트의 멤버입니다.' },
        { status: 400 }
      );
    }

    // 트랜잭션으로 멤버십 추가 및 현재 테넌트 설정
    await query('BEGIN');

    try {
      // 멤버십 추가 (기본 role: member)
      await query(`
        INSERT INTO tenant_memberships (tenant_id, user_id, role)
        VALUES ($1, $2, 'member')
      `, [tenantId, user.userId]);

      // 사용자의 현재 테넌트 설정
      await query(`
        UPDATE users SET current_tenant_id = $1 WHERE id = $2
      `, [tenantId, user.userId]);

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `${tenant.name} 테넌트에 성공적으로 가입되었습니다.`
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Tenant join error:', error);
    return NextResponse.json(
      { error: '테넌트 가입에 실패했습니다.' },
      { status: 500 }
    );
  }
}