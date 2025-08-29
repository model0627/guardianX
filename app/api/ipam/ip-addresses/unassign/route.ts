import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/ipam/ip-addresses/unassign:
 *   post:
 *     summary: IP 주소 할당 해제
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
 *               - mapping_id
 *             properties:
 *               mapping_id:
 *                 type: string
 *                 description: device_ip_mappings 테이블의 매핑 ID
 *               ip_address_id:
 *                 type: string
 *                 description: IP 주소 ID (추가 검증용)
 *     responses:
 *       200:
 *         description: IP 주소 할당 해제 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 매핑을 찾을 수 없음
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

    const { mapping_id, ip_address_id } = await request.json();

    if (!mapping_id) {
      return NextResponse.json(
        { error: '매핑 ID가 필요합니다.' },
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

    // Verify the mapping exists and belongs to the user's tenant
    const mappingCheck = await query(`
      SELECT 
        dim.id as mapping_id,
        ip.id as ip_address_id, 
        ip.ip_address,
        d.name as device_name,
        d.id as device_id,
        dim.is_primary
      FROM device_ip_mappings dim
      JOIN ip_addresses ip ON dim.ip_address_id = ip.id
      JOIN ip_ranges ir ON ip.ip_range_id = ir.id
      JOIN devices d ON dim.device_id = d.id
      WHERE dim.id = $1 AND ir.tenant_id = $2 AND ip.is_active = true
    `, [mapping_id, tenantId]);

    if (mappingCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'IP 할당 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const mapping = mappingCheck.rows[0];

    // Check if this is trying to unassign a primary IP
    if (mapping.is_primary) {
      // Check if there are other IPs assigned to this device
      const otherMappingsResult = await query(`
        SELECT COUNT(*) as count
        FROM device_ip_mappings dim
        JOIN ip_addresses ip ON dim.ip_address_id = ip.id
        JOIN ip_ranges ir ON ip.ip_range_id = ir.id
        WHERE dim.device_id = $1 AND dim.id != $2 AND ir.tenant_id = $3 AND ip.is_active = true
      `, [mapping.device_id, mapping_id, tenantId]);

      const otherMappingsCount = parseInt(otherMappingsResult.rows[0].count);

      if (otherMappingsCount > 0) {
        // Promote another IP to primary before removing this one
        await query(`
          UPDATE device_ip_mappings 
          SET is_primary = true
          WHERE device_id = $1 AND id != $2 AND id = (
            SELECT dim.id
            FROM device_ip_mappings dim
            JOIN ip_addresses ip ON dim.ip_address_id = ip.id
            JOIN ip_ranges ir ON ip.ip_range_id = ir.id
            WHERE dim.device_id = $1 AND dim.id != $2 AND ir.tenant_id = $3 AND ip.is_active = true
            ORDER BY dim.created_at ASC
            LIMIT 1
          )
        `, [mapping.device_id, mapping_id, tenantId]);
      }
    }

    // Remove the IP assignment mapping
    await query(`
      DELETE FROM device_ip_mappings WHERE id = $1
    `, [mapping_id]);

    // Update IP address status to available if it was allocated
    await query(`
      UPDATE ip_addresses 
      SET status = 'available', description = NULL, hostname = NULL
      WHERE id = $1 AND status = 'allocated'
    `, [mapping.ip_address_id]);

    console.log(`[API] IP assignment removed successfully: ${mapping.ip_address} from device ${mapping.device_name}`);

    return NextResponse.json({
      success: true,
      message: `IP 주소 '${mapping.ip_address}'의 할당이 해제되었습니다.`,
      data: {
        ip_address: mapping.ip_address,
        device_name: mapping.device_name,
        was_primary: mapping.is_primary
      }
    });

  } catch (error) {
    console.error('IP unassign error:', error);
    return NextResponse.json(
      { error: 'IP 할당 해제에 실패했습니다.' },
      { status: 500 }
    );
  }
}