import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/tenants:
 *   get:
 *     summary: 사용자가 접근 가능한 테넌트 목록 조회
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *       - apiKeyAuthAlt: []
 *     responses:
 *       200:
 *         description: 테넌트 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 tenants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       slug:
 *                         type: string
 *                       role:
 *                         type: string
 *                       memberCount:
 *                         type: number
 *                       createdAt:
 *                         type: string
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

    // 사용자가 멤버인 테넌트 목록 조회
    const result = await query(`
      SELECT 
        t.id,
        t.name,
        t.description,
        t.slug,
        tm.role,
        (SELECT COUNT(*) FROM tenant_memberships WHERE tenant_id = t.id) as member_count,
        t.created_at
      FROM tenants t
      JOIN tenant_memberships tm ON t.id = tm.tenant_id
      WHERE tm.user_id = $1 AND t.is_active = true
      ORDER BY tm.joined_at DESC
    `, [user.userId]);

    const tenants = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      slug: row.slug,
      role: row.role,
      memberCount: parseInt(row.member_count),
      createdAt: row.created_at
    }));

    return NextResponse.json({
      success: true,
      tenants
    });
  } catch (error) {
    console.error('Tenants list error:', error);
    return NextResponse.json(
      { error: '테넌트 목록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/tenants:
 *   post:
 *     summary: 새 테넌트 생성
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *       - apiKeyAuthAlt: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: 테넌트 이름
 *               description:
 *                 type: string
 *                 description: 테넌트 설명
 *     responses:
 *       201:
 *         description: 테넌트 생성 성공
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
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
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

    const { name, description } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: '테넌트 이름은 필수입니다.' },
        { status: 400 }
      );
    }

    if (name.length > 255) {
      return NextResponse.json(
        { error: '테넌트 이름은 255자를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 슬러그 생성 (이름을 기반으로)
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    let slug = baseSlug;
    let counter = 1;

    // 중복되지 않는 슬러그 찾기
    while (true) {
      const existingSlug = await query(
        'SELECT id FROM tenants WHERE slug = $1',
        [slug]
      );
      
      if (existingSlug.rows.length === 0) {
        break;
      }
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 트랜잭션으로 테넌트 생성 및 소유자 멤버십 추가
    await query('BEGIN');

    try {
      // 테넌트 생성
      const tenantResult = await query(`
        INSERT INTO tenants (name, description, slug, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, description, slug, created_at
      `, [name, description || null, slug, user.userId]);

      const newTenant = tenantResult.rows[0];

      // 생성자를 소유자로 멤버십 추가
      await query(`
        INSERT INTO tenant_memberships (tenant_id, user_id, role)
        VALUES ($1, $2, 'owner')
      `, [newTenant.id, user.userId]);

      // 사용자의 현재 테넌트를 새로 생성한 테넌트로 설정
      await query(`
        UPDATE users SET current_tenant_id = $1 WHERE id = $2
      `, [newTenant.id, user.userId]);

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        tenant: {
          id: newTenant.id,
          name: newTenant.name,
          description: newTenant.description,
          slug: newTenant.slug,
          createdAt: newTenant.created_at
        }
      }, { status: 201 });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Tenant creation error:', error);
    return NextResponse.json(
      { error: '테넌트 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}