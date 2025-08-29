import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/ipam/device-ip-mappings/set-primary:
 *   put:
 *     summary: 디바이스의 주 IP 설정
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
 *               - mapping_id
 *             properties:
 *               device_id:
 *                 type: string
 *                 description: 디바이스 ID
 *               mapping_id:
 *                 type: string
 *                 description: 주 IP로 설정할 매핑 ID
 *     responses:
 *       200:
 *         description: 주 IP 설정 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 매핑을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { device_id, mapping_id } = body;

    if (!device_id || !mapping_id) {
      return NextResponse.json(
        { error: '디바이스 ID와 매핑 ID가 필요합니다.' },
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

    // Verify the mapping exists and belongs to the correct device and tenant
    const mappingCheck = await query(`
      SELECT dim.id, dim.device_id 
      FROM device_ip_mappings dim
      JOIN ip_addresses ip ON dim.ip_address_id = ip.id
      JOIN ip_ranges ir ON ip.ip_range_id = ir.id
      WHERE dim.id = $1 AND dim.device_id = $2 AND ir.tenant_id = $3
    `, [mapping_id, device_id, tenantId]);

    if (mappingCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'IP 매핑을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Set all IPs for this device to non-primary
    await query(`
      UPDATE device_ip_mappings 
      SET is_primary = false 
      WHERE device_id = $1
    `, [device_id]);

    // Set the specified mapping as primary
    await query(`
      UPDATE device_ip_mappings 
      SET is_primary = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [mapping_id]);

    return NextResponse.json({
      success: true,
      message: '주 IP가 설정되었습니다.'
    });

  } catch (error) {
    console.error('Set primary IP error:', error);
    return NextResponse.json(
      { error: '주 IP 설정에 실패했습니다.' },
      { status: 500 }
    );
  }
}