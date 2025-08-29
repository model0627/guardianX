import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/user/current-tenant:
 *   get:
 *     summary: 현재 사용자의 테넌트 정보 조회
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 현재 테넌트 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 tenant:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     slug:
 *                       type: string
 *                     role:
 *                       type: string
 *                 hasTenant:
 *                   type: boolean
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

    // 현재 사용자의 테넌트 정보 조회
    const result = await query(`
      SELECT 
        t.id,
        t.name,
        t.description,
        t.slug,
        tm.role
      FROM users u
      LEFT JOIN tenants t ON u.current_tenant_id = t.id AND t.is_active = true
      LEFT JOIN tenant_memberships tm ON t.id = tm.tenant_id AND tm.user_id = u.id
      WHERE u.id = $1
    `, [user.userId]);

    const userTenant = result.rows[0];

    if (!userTenant || !userTenant.id) {
      return NextResponse.json({
        success: true,
        hasTenant: false,
        tenant: null
      });
    }

    return NextResponse.json({
      success: true,
      hasTenant: true,
      tenant: {
        id: userTenant.id,
        name: userTenant.name,
        description: userTenant.description,
        slug: userTenant.slug,
        role: userTenant.role
      }
    });

  } catch (error) {
    console.error('Current tenant error:', error);
    return NextResponse.json(
      { error: '현재 테넌트 정보 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/user/current-tenant:
 *   post:
 *     summary: 현재 사용자의 활성 테넌트 변경
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *             properties:
 *               tenantId:
 *                 type: string
 *                 description: 변경할 테넌트 ID
 *     responses:
 *       200:
 *         description: 현재 테넌트 변경 성공
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

    const { tenantId } = await request.json();

    if (!tenantId) {
      return NextResponse.json(
        { error: '테넌트 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 사용자가 해당 테넌트의 멤버인지 확인
    const membershipResult = await query(`
      SELECT tm.id, t.name
      FROM tenant_memberships tm
      JOIN tenants t ON tm.tenant_id = t.id
      WHERE tm.tenant_id = $1 AND tm.user_id = $2 AND t.is_active = true
    `, [tenantId, user.userId]);

    if (membershipResult.rows.length === 0) {
      return NextResponse.json(
        { error: '해당 테넌트에 접근 권한이 없습니다.' },
        { status: 403 }
      );
    }

    const tenant = membershipResult.rows[0];

    // 현재 테넌트 변경
    await query(`
      UPDATE users SET current_tenant_id = $1 WHERE id = $2
    `, [tenantId, user.userId]);

    return NextResponse.json({
      success: true,
      message: `현재 테넌트가 "${tenant.name}"으로 변경되었습니다.`
    });

  } catch (error) {
    console.error('Switch tenant error:', error);
    return NextResponse.json(
      { error: '테넌트 변경에 실패했습니다.' },
      { status: 500 }
    );
  }
}