import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import * as db from '@/lib/database';

/**
 * @swagger
 * /api/contacts/{id}:
 *   get:
 *     summary: 특정 담당자 정보 조회
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 담당자 ID
 *     responses:
 *       200:
 *         description: 담당자 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 담당자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    const dbQuery = `
      SELECT 
        id,
        name,
        email,
        phone,
        role,
        status,
        notes,
        created_at,
        updated_at
      FROM contacts
      WHERE id = $1 AND tenant_id = $2
    `;

    const result = await db.query(dbQuery, [id, currentTenantId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/contacts/{id}:
 *   put:
 *     summary: 담당자 정보 수정
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *                 description: 상태
 *               notes:
 *                 type: string
 *                 description: 메모
 *     responses:
 *       200:
 *         description: 담당자 정보 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 담당자를 찾을 수 없음
 *       409:
 *         description: 이메일 중복
 *       500:
 *         description: 서버 오류
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const { name, email, phone, role, status, notes } = body;

    // 담당자 존재 확인
    const checkQuery = `
      SELECT id FROM contacts
      WHERE id = $1 AND tenant_id = $2
    `;
    const checkResult = await db.query(checkQuery, [id, currentTenantId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // 업데이트할 필드만 포함하는 동적 쿼리 생성
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updateFields.push(`name = $${paramCount}`);
      updateValues.push(name);
    }

    if (email !== undefined) {
      paramCount++;
      updateFields.push(`email = $${paramCount}`);
      updateValues.push(email);
    }

    if (phone !== undefined) {
      paramCount++;
      updateFields.push(`phone = $${paramCount}`);
      updateValues.push(phone);
    }

    if (role !== undefined) {
      if (!['primary', 'backup', 'viewer'].includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be primary, backup, or viewer' },
          { status: 400 }
        );
      }
      paramCount++;
      updateFields.push(`role = $${paramCount}`);
      updateValues.push(role);
    }

    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be active or inactive' },
          { status: 400 }
        );
      }
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      updateValues.push(status);
    }

    if (notes !== undefined) {
      paramCount++;
      updateFields.push(`notes = $${paramCount}`);
      updateValues.push(notes);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const dbQuery = `
      UPDATE contacts
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount + 1} AND tenant_id = $${paramCount + 2}
      RETURNING id, name, email, phone, role, status, notes, created_at, updated_at
    `;

    updateValues.push(id, currentTenantId);

    const result = await db.query(dbQuery, updateValues);

    return NextResponse.json(result.rows[0]);

  } catch (error: any) {
    console.error('Error updating contact:', error);
    
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

/**
 * @swagger
 * /api/contacts/{id}:
 *   delete:
 *     summary: 담당자 삭제
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 담당자 ID
 *     responses:
 *       200:
 *         description: 담당자 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deleted_contact:
 *                   $ref: '#/components/schemas/Contact'
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 담당자를 찾을 수 없음
 *       409:
 *         description: 삭제할 수 없음 (다른 리소스에서 참조됨)
 *       500:
 *         description: 서버 오류
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    // 담당자 정보 조회 (삭제 전 반환용)
    const getQuery = `
      SELECT id, name, email, phone, role, status, notes, created_at, updated_at
      FROM contacts
      WHERE id = $1 AND tenant_id = $2
    `;
    const getResult = await db.query(getQuery, [id, currentTenantId]);

    if (getResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // 디바이스 할당 확인
    const assignmentCheckQuery = `
      SELECT COUNT(*) as count
      FROM device_assignments
      WHERE contact_id = $1
    `;
    const assignmentResult = await db.query(assignmentCheckQuery, [id]);
    const assignmentCount = parseInt(assignmentResult.rows[0].count);

    if (assignmentCount > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete contact. This contact is assigned to devices.',
          assigned_devices: assignmentCount
        },
        { status: 409 }
      );
    }

    // 담당자 삭제
    const deleteQuery = `
      DELETE FROM contacts
      WHERE id = $1 AND tenant_id = $2
    `;
    await db.query(deleteQuery, [id, currentTenantId]);

    return NextResponse.json({
      message: 'Contact deleted successfully',
      deleted_contact: getResult.rows[0]
    });

  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}