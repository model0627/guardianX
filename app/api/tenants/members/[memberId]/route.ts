import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/tenants/members/{memberId}:
 *   put:
 *     summary: 테넌트 멤버 역할 수정
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         description: 멤버 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, member]
 *     responses:
 *       200:
 *         description: 멤버 역할 수정 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 멤버를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { role } = body;

    if (!role || !['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: '유효하지 않은 역할입니다.' },
        { status: 400 }
      );
    }

    // Get current user's tenant and role
    const userTenantResult = await query(`
      SELECT tm.tenant_id, tm.role
      FROM users u
      JOIN tenant_memberships tm ON u.current_tenant_id = tm.tenant_id AND tm.user_id = u.id
      WHERE u.id = $1 AND tm.is_active = true
    `, [user.userId]);

    if (userTenantResult.rows.length === 0) {
      return NextResponse.json(
        { error: '테넌트 정보를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    const { tenant_id: tenantId, role: userRole } = userTenantResult.rows[0];

    // Check if user has permission (owner or admin)
    if (!['owner', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: '멤버 역할을 수정할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // Get member info to check if it exists and belongs to the tenant
    const memberResult = await query(`
      SELECT tm.*, u.email
      FROM tenant_memberships tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.id = $1 AND tm.tenant_id = $2
    `, [memberId, tenantId]);

    if (memberResult.rows.length === 0) {
      return NextResponse.json(
        { error: '멤버를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const member = memberResult.rows[0];

    // Cannot modify owner role
    if (member.role === 'owner') {
      return NextResponse.json(
        { error: '소유자의 역할은 수정할 수 없습니다.' },
        { status: 403 }
      );
    }

    // Update member role
    await query(`
      UPDATE tenant_memberships 
      SET role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [role, memberId]);

    console.log(`[API] Member ${member.email} role updated to ${role} by ${user.userId}`);

    return NextResponse.json({
      success: true,
      message: `${member.email}님의 역할이 ${role === 'admin' ? '관리자' : '멤버'}로 변경되었습니다.`
    });

  } catch (error) {
    console.error('Update member role error:', error);
    return NextResponse.json(
      { error: '멤버 역할 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/tenants/members/{memberId}:
 *   delete:
 *     summary: 테넌트 멤버 제거
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         description: 멤버 ID
 *     responses:
 *       200:
 *         description: 멤버 제거 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 멤버를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // Get current user's tenant and role
    const userTenantResult = await query(`
      SELECT tm.tenant_id, tm.role
      FROM users u
      JOIN tenant_memberships tm ON u.current_tenant_id = tm.tenant_id AND tm.user_id = u.id
      WHERE u.id = $1 AND tm.is_active = true
    `, [user.userId]);

    if (userTenantResult.rows.length === 0) {
      return NextResponse.json(
        { error: '테넌트 정보를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    const { tenant_id: tenantId, role: userRole } = userTenantResult.rows[0];

    // Check if user has permission (owner or admin)
    if (!['owner', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: '멤버를 제거할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // Get member info to check if it exists and belongs to the tenant
    const memberResult = await query(`
      SELECT tm.*, u.email
      FROM tenant_memberships tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.id = $1 AND tm.tenant_id = $2
    `, [memberId, tenantId]);

    if (memberResult.rows.length === 0) {
      return NextResponse.json(
        { error: '멤버를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const member = memberResult.rows[0];

    // Cannot remove owner
    if (member.role === 'owner') {
      return NextResponse.json(
        { error: '소유자는 제거할 수 없습니다.' },
        { status: 403 }
      );
    }

    // Remove member from tenant
    await query(`
      DELETE FROM tenant_memberships WHERE id = $1
    `, [memberId]);

    // If this was the user's current tenant, reset their current_tenant_id
    if (member.user_id === user.userId) {
      await query(`
        UPDATE users SET current_tenant_id = NULL WHERE id = $1
      `, [user.userId]);
    }

    console.log(`[API] Member ${member.email} removed from tenant ${tenantId} by ${user.userId}`);

    return NextResponse.json({
      success: true,
      message: `${member.email}님이 테넌트에서 제거되었습니다.`
    });

  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json(
      { error: '멤버 제거에 실패했습니다.' },
      { status: 500 }
    );
  }
}