import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import * as db from '@/lib/database';

/**
 * @swagger
 * /api/contacts:
 *   get:
 *     summary: 담당자 목록 조회
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: db.query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: db.query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 페이지당 항목 수
 *       - in: db.query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: 상태 필터
 *       - in: db.query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [primary, backup, viewer]
 *         description: 역할 필터
 *     responses:
 *       200:
 *         description: 담당자 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contacts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contact'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 현재 사용자의 테넌트 정보 조회
    const tenantResult = await db.query(`
      SELECT current_tenant_id 
      FROM users 
      WHERE id = $1
    `, [user.userId]);

    if (tenantResult.rows.length === 0 || !tenantResult.rows[0].current_tenant_id) {
      return NextResponse.json({ error: 'No tenant selected' }, { status: 400 });
    }

    const currentTenantId = tenantResult.rows[0].current_tenant_id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const offset = (page - 1) * limit;

    let whereConditions = ['tenant_id = $1'];
    let queryParams: any[] = [currentTenantId];
    let paramCount = 1;

    // Only add is_active filter for status (active/inactive)
    if (status) {
      paramCount++;
      const isActive = status === 'active';
      whereConditions.push(`is_active = $${paramCount}`);
      queryParams.push(isActive);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 총 개수 조회
    const countQuery = `
      SELECT COUNT(*) as total
      FROM contacts
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // 담당자 목록 조회
    const contactsQuery = `
      SELECT 
        id,
        name,
        email,
        phone,
        mobile,
        title,
        department,
        office_location,
        responsibilities,
        is_active,
        created_at,
        updated_at
      FROM contacts
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    queryParams.push(limit, offset);
    const contactsResult = await db.query(contactsQuery, queryParams);

    return NextResponse.json({
      contacts: contactsResult.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/contacts:
 *   post:
 *     summary: 새 담당자 추가
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 description: 담당자 이름
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 이메일 주소
 *               phone:
 *                 type: string
 *                 description: 전화번호
 *               role:
 *                 type: string
 *                 enum: [primary, backup, viewer]
 *                 description: 역할
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 default: active
 *                 description: 상태
 *               notes:
 *                 type: string
 *                 description: 메모
 *     responses:
 *       201:
 *         description: 담당자 추가 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       409:
 *         description: 이메일 중복
 *       500:
 *         description: 서버 오류
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 현재 사용자의 테넌트 정보 조회
    const tenantResult = await db.query(`
      SELECT current_tenant_id 
      FROM users 
      WHERE id = $1
    `, [user.userId]);

    if (tenantResult.rows.length === 0 || !tenantResult.rows[0].current_tenant_id) {
      return NextResponse.json({ error: 'No tenant selected' }, { status: 400 });
    }

    const currentTenantId = tenantResult.rows[0].current_tenant_id;

    const body = await request.json();
    const { name, email, phone, mobile, title, department, office_location, responsibilities, is_active = true } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const dbQuery = `
      INSERT INTO contacts (tenant_id, name, email, phone, mobile, title, department, office_location, responsibilities, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, name, email, phone, mobile, title, department, office_location, responsibilities, is_active, created_at, updated_at
    `;

    const result = await db.query(dbQuery, [
      currentTenantId,
      name,
      email,
      phone,
      mobile,
      title,
      department,
      office_location,
      responsibilities,
      is_active,
      user.userId
    ]);

    return NextResponse.json(result.rows[0], { status: 201 });

  } catch (error: any) {
    console.error('Error creating contact:', error);
    
    if (error.constraint === 'contacts_tenant_email_unique') {
      return NextResponse.json(
        { error: 'Email already exists for this tenant' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}