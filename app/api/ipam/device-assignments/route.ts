import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/ipam/device-assignments:
 *   get:
 *     summary: 디바이스 담당자 조회
 *     tags: [IPAM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: device_id
 *         required: true
 *         schema:
 *           type: string
 *         description: 디바이스 ID
 *     responses:
 *       200:
 *         description: 담당자 조회 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('device_id');

  if (!deviceId) {
    return NextResponse.json(
      { error: '디바이스 ID가 필요합니다.' },
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
      SELECT current_tenant_id FROM users WHERE id = $1
    `, [user.userId]);

    if (userResult.rows.length === 0 || !userResult.rows[0].current_tenant_id) {
      return NextResponse.json(
        { error: '테넌트 정보를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    const tenantId = userResult.rows[0].current_tenant_id;

    // Get device assignments
    const result = await query(`
      SELECT 
        da.id,
        da.device_id,
        da.contact_id,
        da.role,
        da.created_at,
        c.name,
        c.email,
        c.phone
      FROM device_assignments da
      JOIN contacts c ON da.contact_id = c.id
      WHERE da.device_id = $1 AND c.tenant_id = $2
      ORDER BY da.created_at ASC
    `, [deviceId, tenantId]);

    return NextResponse.json({
      success: true,
      assignments: result.rows
    });

  } catch (error) {
    console.error('Device assignments list error:', error);
    return NextResponse.json(
      { error: '담당자 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/device-assignments:
 *   post:
 *     summary: 디바이스에 담당자 할당
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
 *               - device_id
 *               - user_id
 *               - role
 *             properties:
 *               device_id:
 *                 type: string
 *                 description: 디바이스 ID
 *               user_id:
 *                 type: string
 *                 description: 사용자 ID
 *               role:
 *                 type: string
 *                 enum: [primary, backup, viewer]
 *                 description: 담당자 역할
 *     responses:
 *       201:
 *         description: 담당자 할당 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       409:
 *         description: 이미 할당된 담당자
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
    const { device_id, contact_id, role } = body;

    if (!device_id || !contact_id || !role) {
      return NextResponse.json(
        { error: '디바이스 ID, 담당자 ID, 역할이 필요합니다.' },
        { status: 400 }
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

    // Verify device belongs to tenant
    const deviceCheck = await query(`
      SELECT d.id FROM devices d
      LEFT JOIN racks r ON d.rack_id = r.id
      LEFT JOIN server_rooms sr ON r.server_room_id = sr.id
      LEFT JOIN offices o ON sr.office_id = o.id
      WHERE d.id = $1 AND d.is_active = true
        AND (o.tenant_id = $2 OR d.rack_id IS NULL)
    `, [device_id, tenantId]);

    if (deviceCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Verify contact belongs to same tenant
    const contactCheck = await query(`
      SELECT id FROM contacts WHERE id = $1 AND tenant_id = $2
    `, [contact_id, tenantId]);

    if (contactCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '담당자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Check if assignment already exists
    const existingAssignment = await query(`
      SELECT id FROM device_assignments 
      WHERE device_id = $1 AND contact_id = $2
    `, [device_id, contact_id]);

    if (existingAssignment.rows.length > 0) {
      return NextResponse.json(
        { error: '이미 할당된 담당자입니다.' },
        { status: 409 }
      );
    }

    // If assigning as primary, remove primary flag from other assignments
    if (role === 'primary') {
      await query(`
        UPDATE device_assignments 
        SET role = 'backup' 
        WHERE device_id = $1 AND role = 'primary'
      `, [device_id]);
    }

    // Create assignment
    const result = await query(`
      INSERT INTO device_assignments (device_id, contact_id, role, assigned_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id, device_id, contact_id, role, created_at
    `, [device_id, contact_id, role, user.userId]);

    return NextResponse.json({
      success: true,
      assignment: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Device assignment error:', error);
    return NextResponse.json(
      { error: '담당자 할당에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/device-assignments:
 *   delete:
 *     summary: 디바이스 담당자 해제
 *     tags: [IPAM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assignment_id
 *         required: true
 *         schema:
 *           type: string
 *         description: 할당 ID
 *     responses:
 *       200:
 *         description: 담당자 해제 성공
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 할당을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get('assignment_id');

  if (!assignmentId) {
    return NextResponse.json(
      { error: '할당 ID가 필요합니다.' },
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
      SELECT current_tenant_id FROM users WHERE id = $1
    `, [user.userId]);

    if (userResult.rows.length === 0 || !userResult.rows[0].current_tenant_id) {
      return NextResponse.json(
        { error: '테넌트 정보를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    const tenantId = userResult.rows[0].current_tenant_id;

    // Verify assignment belongs to tenant
    const assignmentCheck = await query(`
      SELECT da.id, da.device_id, da.contact_id
      FROM device_assignments da
      JOIN contacts c ON da.contact_id = c.id
      WHERE da.id = $1 AND c.tenant_id = $2
    `, [assignmentId, tenantId]);

    if (assignmentCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '담당자 할당을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Delete assignment
    await query(`
      DELETE FROM device_assignments WHERE id = $1
    `, [assignmentId]);

    return NextResponse.json({
      success: true,
      message: '담당자가 해제되었습니다.'
    });

  } catch (error) {
    console.error('Device assignment deletion error:', error);
    return NextResponse.json(
      { error: '담당자 해제에 실패했습니다.' },
      { status: 500 }
    );
  }
}