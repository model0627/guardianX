import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/ipam/device-ip-mappings:
 *   get:
 *     summary: 디바이스 IP 매핑 조회
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
 *         description: IP 매핑 조회 성공
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

    // Get device IP mappings
    const result = await query(`
      SELECT 
        dim.id,
        dim.device_id,
        dim.ip_address_id,
        dim.is_primary,
        dim.created_at,
        ip.ip_address,
        ip.status as ip_status,
        ir.network_address,
        ir.subnet_mask,
        ir.name as range_name
      FROM device_ip_mappings dim
      JOIN ip_addresses ip ON dim.ip_address_id = ip.id
      JOIN ip_ranges ir ON ip.ip_range_id = ir.id
      WHERE dim.device_id = $1 AND ir.tenant_id = $2
      ORDER BY dim.is_primary DESC, dim.created_at ASC
    `, [deviceId, tenantId]);

    return NextResponse.json({
      success: true,
      mappings: result.rows
    });

  } catch (error) {
    console.error('Device IP mappings list error:', error);
    return NextResponse.json(
      { error: 'IP 매핑 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/device-ip-mappings:
 *   post:
 *     summary: 디바이스에 IP 주소 할당
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
 *               - ip_address_id
 *             properties:
 *               device_id:
 *                 type: string
 *                 description: 디바이스 ID
 *               ip_address_id:
 *                 type: string
 *                 description: IP 주소 ID
 *               is_primary:
 *                 type: boolean
 *                 default: false
 *                 description: 주 IP 여부
 *     responses:
 *       201:
 *         description: IP 할당 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       409:
 *         description: IP 주소가 이미 할당됨
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
    const { device_id, ip_address_id, is_primary = false } = body;

    if (!device_id || !ip_address_id) {
      return NextResponse.json(
        { error: '디바이스 ID와 IP 주소 ID가 필요합니다.' },
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

    // Verify IP address belongs to tenant and is available
    const ipCheck = await query(`
      SELECT ip.id, ip.status, ip.ip_address 
      FROM ip_addresses ip
      JOIN ip_ranges ir ON ip.ip_range_id = ir.id
      WHERE ip.id = $1 AND ir.tenant_id = $2
    `, [ip_address_id, tenantId]);

    if (ipCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'IP 주소를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const ipAddress = ipCheck.rows[0];
    if (ipAddress.status !== 'available') {
      return NextResponse.json(
        { error: `IP 주소 ${ipAddress.ip_address}는 이미 사용 중입니다.` },
        { status: 409 }
      );
    }

    // Check if mapping already exists
    const existingMapping = await query(`
      SELECT id FROM device_ip_mappings 
      WHERE device_id = $1 AND ip_address_id = $2
    `, [device_id, ip_address_id]);

    if (existingMapping.rows.length > 0) {
      return NextResponse.json(
        { error: '이미 할당된 IP 주소입니다.' },
        { status: 409 }
      );
    }

    // Check if device has existing primary IP
    const existingPrimary = await query(`
      SELECT id FROM device_ip_mappings 
      WHERE device_id = $1 AND is_primary = true
    `, [device_id]);

    // If no existing primary IP and not explicitly set as non-primary, make it primary
    const shouldBePrimary = is_primary || existingPrimary.rows.length === 0;

    // If setting as primary, remove primary flag from other IPs for this device
    if (shouldBePrimary) {
      await query(`
        UPDATE device_ip_mappings 
        SET is_primary = false 
        WHERE device_id = $1
      `, [device_id]);
    }

    // Create IP mapping
    const result = await query(`
      INSERT INTO device_ip_mappings (device_id, ip_address_id, is_primary)
      VALUES ($1, $2, $3)
      RETURNING id, device_id, ip_address_id, is_primary, created_at
    `, [device_id, ip_address_id, shouldBePrimary]);

    // Update IP address status to allocated
    await query(`
      UPDATE ip_addresses 
      SET status = 'allocated', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [ip_address_id]);

    return NextResponse.json({
      success: true,
      mapping: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('IP assignment error:', error);
    return NextResponse.json(
      { error: 'IP 할당에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/device-ip-mappings:
 *   delete:
 *     summary: 디바이스에서 IP 주소 해제
 *     tags: [IPAM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mapping_id
 *         required: true
 *         schema:
 *           type: string
 *         description: 매핑 ID
 *     responses:
 *       200:
 *         description: IP 해제 성공
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 매핑을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mappingId = searchParams.get('mapping_id');

  if (!mappingId) {
    return NextResponse.json(
      { error: '매핑 ID가 필요합니다.' },
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

    // Verify mapping belongs to tenant
    const mappingCheck = await query(`
      SELECT dim.id, dim.ip_address_id, dim.device_id
      FROM device_ip_mappings dim
      JOIN ip_addresses ip ON dim.ip_address_id = ip.id
      JOIN ip_ranges ir ON ip.ip_range_id = ir.id
      WHERE dim.id = $1 AND ir.tenant_id = $2
    `, [mappingId, tenantId]);

    if (mappingCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'IP 매핑을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const mapping = mappingCheck.rows[0];

    // Check if this is a primary IP
    const isPrimaryCheck = await query(`
      SELECT is_primary FROM device_ip_mappings WHERE id = $1
    `, [mappingId]);

    const wasPrimary = isPrimaryCheck.rows[0]?.is_primary;

    // Delete mapping
    await query(`
      DELETE FROM device_ip_mappings WHERE id = $1
    `, [mappingId]);

    // If we deleted the primary IP, set another IP as primary if available
    if (wasPrimary) {
      await query(`
        UPDATE device_ip_mappings 
        SET is_primary = true 
        WHERE device_id = $1 
        AND id = (
          SELECT id FROM device_ip_mappings 
          WHERE device_id = $1 
          ORDER BY created_at ASC 
          LIMIT 1
        )
      `, [mapping.device_id, mapping.device_id]);
    }

    // Update IP address status back to available
    await query(`
      UPDATE ip_addresses 
      SET status = 'available', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [mapping.ip_address_id]);

    return NextResponse.json({
      success: true,
      message: 'IP 주소가 해제되었습니다.'
    });

  } catch (error) {
    console.error('IP unassignment error:', error);
    return NextResponse.json(
      { error: 'IP 해제에 실패했습니다.' },
      { status: 500 }
    );
  }
}