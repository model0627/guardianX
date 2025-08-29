import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/tenants/members:
 *   get:
 *     summary: 테넌트 멤버 목록 조회
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 멤버 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // Get current user's tenant ID
    const userResult = await query(`
      SELECT current_tenant_id FROM users WHERE id = $1
    `, [user.userId]);

    if (userResult.rows.length === 0 || !userResult.rows[0].current_tenant_id) {
      return NextResponse.json(
        { error: '테넌트 정보를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    const tenantId = userResult.rows[0].current_tenant_id;

    // Get all members of the tenant
    const membersResult = await query(`
      SELECT 
        tm.id,
        tm.user_id,
        tm.role,
        tm.is_active,
        tm.joined_at,
        u.email,
        u.last_login_at as last_active
      FROM tenant_memberships tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.tenant_id = $1
      ORDER BY 
        CASE tm.role 
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'member' THEN 3
          ELSE 4
        END,
        tm.joined_at DESC
    `, [tenantId]);

    return NextResponse.json({
      success: true,
      members: membersResult.rows
    });

  } catch (error) {
    console.error('Get tenant members error:', error);
    return NextResponse.json(
      { error: '멤버 목록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/tenants/members:
 *   post:
 *     summary: 테넌트 멤버 초대
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, member]
 *     responses:
 *       201:
 *         description: 멤버 초대 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: '이메일과 역할이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: '유효하지 않은 역할입니다.' },
        { status: 400 }
      );
    }

    // Get current user's tenant and check if they can invite
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

    // Check if user has permission to invite (owner or admin)
    if (!['owner', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: '멤버를 초대할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // Check if user to be invited exists
    const inviteeResult = await query(`
      SELECT id FROM users WHERE email = $1
    `, [email]);

    let inviteeUserId;
    if (inviteeResult.rows.length === 0) {
      // Create a new user account (inactive until they verify)
      const newUserResult = await query(`
        INSERT INTO users (email, is_active) 
        VALUES ($1, false) 
        RETURNING id
      `, [email]);
      inviteeUserId = newUserResult.rows[0].id;
    } else {
      inviteeUserId = inviteeResult.rows[0].id;
    }

    // Check if user is already a member
    const existingMemberResult = await query(`
      SELECT id FROM tenant_memberships 
      WHERE tenant_id = $1 AND user_id = $2
    `, [tenantId, inviteeUserId]);

    if (existingMemberResult.rows.length > 0) {
      return NextResponse.json(
        { error: '이미 테넌트의 멤버입니다.' },
        { status: 400 }
      );
    }

    // Add user to tenant
    const memberResult = await query(`
      INSERT INTO tenant_memberships (tenant_id, user_id, role, invited_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [tenantId, inviteeUserId, role, user.userId]);

    // TODO: Send invitation email

    console.log(`[API] User ${email} invited to tenant ${tenantId} as ${role} by ${user.userId}`);

    return NextResponse.json({
      success: true,
      member: memberResult.rows[0],
      message: `${email}님을 ${role === 'admin' ? '관리자' : '멤버'}로 초대했습니다.`
    }, { status: 201 });

  } catch (error) {
    console.error('Invite member error:', error);
    return NextResponse.json(
      { error: '멤버 초대에 실패했습니다.' },
      { status: 500 }
    );
  }
}