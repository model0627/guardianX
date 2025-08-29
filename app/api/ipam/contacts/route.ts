import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/ipam/contacts:
 *   get:
 *     summary: 담당자 목록 조회
 *     tags: [IPAM]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 담당자 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Fetching contacts - starting');
    
    // 토큰 디버깅
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('token')?.value;
    console.log('Auth header:', authHeader);
    console.log('Cookie token:', cookieToken ? cookieToken.substring(0, 20) + '...' : 'none');
    
    const user = await getAuthUser(request);
    console.log('User:', user);
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // Get current user's tenant ID
    const userResult = await query(`
      SELECT id, email, current_tenant_id FROM users WHERE id = $1
    `, [user.userId]);

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const currentUser = userResult.rows[0];
    if (!currentUser.current_tenant_id) {
      console.log('No tenant found for user - returning empty contacts list');
      // 테넌트가 없는 경우 빈 목록 반환
      return NextResponse.json({
        success: true,
        contacts: []
      });
    }

    const tenantId = currentUser.current_tenant_id;
    console.log('Tenant ID:', tenantId);

    // Get contacts with device assignment counts
    console.log('Querying contacts...');
    try {
      // First check if table exists and has data
      const tableCheck = await query(`SELECT COUNT(*) FROM contacts WHERE tenant_id = $1`, [tenantId]);
      console.log(`Found ${tableCheck.rows[0].count} contacts for tenant ${tenantId}`);
    } catch (tableError) {
      console.error('Table check error:', tableError);
      return NextResponse.json({
        success: true,
        contacts: [],
        message: 'Contacts table not found or accessible'
      });
    }

    const result = await query(`
      SELECT 
        c.id,
        c.name,
        c.phone,
        c.email,
        c.title,
        c.department,
        c.mobile,
        c.office_location,
        c.responsibilities,
        c.is_active,
        c.created_at,
        c.updated_at,
        COUNT(DISTINCT da.device_id) as device_count,
        ARRAY_AGG(DISTINCT d.name) FILTER (WHERE d.name IS NOT NULL) as devices
      FROM contacts c
      LEFT JOIN device_assignments da ON c.id = da.contact_id
      LEFT JOIN devices d ON da.device_id = d.id AND d.is_active = true
      WHERE c.tenant_id = $1 AND c.is_active = true
      GROUP BY c.id, c.name, c.phone, c.email, c.title, c.department, c.mobile, c.office_location, c.responsibilities, c.is_active, c.created_at, c.updated_at
      ORDER BY c.created_at DESC
    `, [tenantId]);

    const contacts = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      phone: row.phone || '',
      mobile: row.mobile || '',
      email: row.email || '',
      title: row.title || '',
      department: row.department || '',
      office_location: row.office_location || '',
      responsibilities: row.responsibilities || [],
      status: row.is_active ? 'active' : 'inactive', // Convert is_active to status
      is_active: row.is_active,
      device_count: parseInt(row.device_count) || 0,
      devices: row.devices || [],
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      contacts
    });

  } catch (error) {
    console.error('Contacts list error:', error);
    return NextResponse.json(
      { error: '담당자 목록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/contacts:
 *   post:
 *     summary: 새 담당자 추가
 *     tags: [IPAM]
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
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 description: 담당자 이름
 *               email:
 *                 type: string
 *                 description: 이메일 주소
 *               phone:
 *                 type: string
 *                 description: 전화번호
 *               role:
 *                 type: string
 *                 enum: [primary, backup, viewer]
 *                 default: viewer
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 default: active
 *     responses:
 *       201:
 *         description: 담당자 추가 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       409:
 *         description: 이미 존재하는 이메일
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
    const { name, email, phone, role = 'viewer', status = 'active' } = body;

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: '이름, 이메일, 전화번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // Get current user's tenant ID
    const userResult = await query(`
      SELECT id, email, current_tenant_id FROM users WHERE id = $1
    `, [user.userId]);

    if (userResult.rows.length === 0 || !userResult.rows[0].current_tenant_id) {
      return NextResponse.json(
        { error: '테넌트 정보를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    const tenantId = userResult.rows[0].current_tenant_id;

    // Check if email already exists in this tenant
    const existingContact = await query(`
      SELECT id FROM contacts WHERE email = $1 AND tenant_id = $2
    `, [email, tenantId]);

    if (existingContact.rows.length > 0) {
      return NextResponse.json(
        { error: '이미 존재하는 이메일입니다.' },
        { status: 409 }
      );
    }

    // Create new contact
    const newContactResult = await query(`
      INSERT INTO contacts (tenant_id, name, email, phone, role, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, phone, role, status, created_at, updated_at
    `, [tenantId, name, email, phone, role, status]);

    // Return the created contact
    const contact = {
      id: newContactResult.rows[0].id,
      name: newContactResult.rows[0].name,
      phone: newContactResult.rows[0].phone || '',
      email: newContactResult.rows[0].email,
      role: newContactResult.rows[0].role,
      status: newContactResult.rows[0].status,
      device_count: 0,
      devices: [],
      created_at: newContactResult.rows[0].created_at,
      updated_at: newContactResult.rows[0].updated_at
    };

    return NextResponse.json({
      success: true,
      contact
    }, { status: 201 });

  } catch (error) {
    console.error('Contact creation error:', error);
    return NextResponse.json(
      { error: '담당자 추가에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/contacts/{id}:
 *   put:
 *     summary: 담당자 정보 수정
 *     tags: [IPAM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 담당자 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: 담당자 수정 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 담당자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get('id');

  if (!contactId) {
    return NextResponse.json(
      { error: '담당자 ID가 필요합니다.' },
      { status: 400 }
    );
  }

  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, phone, status } = body;

    // Get current user's tenant ID
    const userResult = await query(`
      SELECT id, email, current_tenant_id FROM users WHERE id = $1
    `, [user.userId]);

    if (userResult.rows.length === 0 || !userResult.rows[0].current_tenant_id) {
      return NextResponse.json(
        { error: '테넌트 정보를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    const tenantId = userResult.rows[0].current_tenant_id;

    // Verify contact belongs to tenant
    const contactCheck = await query(`
      SELECT id FROM contacts WHERE id = $1 AND tenant_id = $2
    `, [contactId, tenantId]);

    if (contactCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '담당자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Update contact information
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (updates.length > 0) {
      values.push(contactId);
      await query(`
        UPDATE contacts 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
      `, values);
    }

    return NextResponse.json({
      success: true,
      message: '담당자가 수정되었습니다.'
    });

  } catch (error) {
    console.error('Contact update error:', error);
    return NextResponse.json(
      { error: '담당자 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/contacts/{id}:
 *   delete:
 *     summary: 담당자 삭제
 *     tags: [IPAM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 담당자 ID
 *     responses:
 *       200:
 *         description: 담당자 삭제 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 담당자를 찾을 수 없음
 *       409:
 *         description: 할당된 디바이스가 있어서 삭제 불가
 *       500:
 *         description: 서버 오류
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get('id');

  if (!contactId) {
    return NextResponse.json(
      { error: '담당자 ID가 필요합니다.' },
      { status: 400 }
    );
  }

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
      SELECT id, email, current_tenant_id FROM users WHERE id = $1
    `, [user.userId]);

    if (userResult.rows.length === 0 || !userResult.rows[0].current_tenant_id) {
      return NextResponse.json(
        { error: '테넌트 정보를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    const tenantId = userResult.rows[0].current_tenant_id;

    // Verify contact belongs to tenant
    const contactCheck = await query(`
      SELECT id FROM contacts WHERE id = $1 AND tenant_id = $2
    `, [contactId, tenantId]);

    if (contactCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '담당자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Check if contact has any device assignments
    const assignmentCheck = await query(`
      SELECT COUNT(*) as count FROM device_assignments WHERE contact_id = $1
    `, [contactId]);

    if (parseInt(assignmentCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: '할당된 디바이스가 있는 담당자는 삭제할 수 없습니다.' },
        { status: 409 }
      );
    }

    // Delete contact
    await query(`
      DELETE FROM contacts WHERE id = $1
    `, [contactId]);

    return NextResponse.json({
      success: true,
      message: '담당자가 삭제되었습니다.'
    });

  } catch (error) {
    console.error('Contact deletion error:', error);
    return NextResponse.json(
      { error: '담당자 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}