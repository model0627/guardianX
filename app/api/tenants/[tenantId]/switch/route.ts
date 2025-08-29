import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/tenants/{tenantId}/switch:
 *   post:
 *     summary: 테넌트 전환
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         description: 전환할 테넌트 ID
 *     responses:
 *       200:
 *         description: 테넌트 전환 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
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

    // Check if user has access to the tenant
    const membershipCheck = await query(`
      SELECT tm.role, t.name as tenant_name
      FROM tenant_memberships tm
      JOIN tenants t ON tm.tenant_id = t.id
      WHERE tm.tenant_id = $1 AND tm.user_id = $2 AND tm.is_active = true
    `, [tenantId, user.userId]);

    if (membershipCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '해당 테넌트에 대한 접근 권한이 없습니다.' },
        { status: 403 }
      );
    }

    const membership = membershipCheck.rows[0];

    // Update user's current tenant
    await query(`
      UPDATE users 
      SET current_tenant_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [tenantId, user.userId]);

    console.log(`[API] User ${user.userId} switched to tenant ${tenantId}`);

    return NextResponse.json({
      success: true,
      message: `${membership.tenant_name} 테넌트로 전환되었습니다.`,
      tenant: {
        id: tenantId,
        name: membership.tenant_name,
        role: membership.role
      }
    });

  } catch (error) {
    console.error('Switch tenant error:', error);
    return NextResponse.json(
      { error: '테넌트 전환에 실패했습니다.' },
      { status: 500 }
    );
  }
}