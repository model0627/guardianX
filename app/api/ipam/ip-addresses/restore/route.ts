import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/ipam/ip-addresses/restore:
 *   post:
 *     summary: 삭제된 IP 주소 복구
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
 *               - ip_address_ids
 *             properties:
 *               ip_address_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 복구할 IP 주소 ID 목록
 *     responses:
 *       200:
 *         description: IP 주소 복구 성공
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

    if (!user.userId) {
      console.error('[API] user.userId is null or undefined:', user);
      return NextResponse.json(
        { error: '사용자 ID가 유효하지 않습니다.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { ip_address_ids } = body;

    if (!ip_address_ids || !Array.isArray(ip_address_ids) || ip_address_ids.length === 0) {
      return NextResponse.json(
        { error: 'IP 주소 ID 목록이 필요합니다.' },
        { status: 400 }
      );
    }

    // Limit to 100 IPs at once for safety
    if (ip_address_ids.length > 100) {
      return NextResponse.json(
        { error: '한 번에 최대 100개의 IP 주소만 복구할 수 있습니다.' },
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

    // Verify all IP addresses belong to user's tenant and are deleted
    const ipAddressCheck = await query(`
      SELECT ip.id, ip.ip_address, ir.name as ip_range_name
      FROM ip_addresses ip
      JOIN ip_ranges ir ON ip.ip_range_id = ir.id
      WHERE ip.id = ANY($1::uuid[]) AND ir.tenant_id = $2 AND ip.is_active = false
    `, [ip_address_ids, tenantId]);

    if (ipAddressCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '복구할 수 있는 삭제된 IP 주소가 없습니다.' },
        { status: 404 }
      );
    }

    const foundIPIds = ipAddressCheck.rows.map(row => row.id);
    const notFoundCount = ip_address_ids.length - foundIPIds.length;

    if (notFoundCount > 0) {
      console.warn(`[API] ${notFoundCount}개의 삭제된 IP 주소를 찾을 수 없습니다.`);
    }

    // Restore IP addresses (set is_active back to true)
    const restoreResult = await query(`
      UPDATE ip_addresses 
      SET is_active = true, updated_at = NOW(), updated_by = $2
      WHERE id = ANY($1::uuid[])
    `, [foundIPIds, user.userId]);

    const restoredCount = restoreResult.rowCount || 0;

    console.log(`[API] Restored ${restoredCount} IP addresses by user ${user.userId}`);

    // Get summary of restored IPs for response
    const restoredIPs = ipAddressCheck.rows.map(row => ({
      id: row.id,
      ip_address: row.ip_address,
      ip_range_name: row.ip_range_name
    }));

    return NextResponse.json({
      success: true,
      restored: restoredCount,
      notFound: notFoundCount,
      restoredIPs: restoredIPs,
      message: `${restoredCount}개의 IP 주소가 성공적으로 복구되었습니다.${notFoundCount > 0 ? ` (${notFoundCount}개는 찾을 수 없음)` : ''}`
    });

  } catch (error) {
    console.error('IP restoration error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { error: `IP 주소 복구에 실패했습니다: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}