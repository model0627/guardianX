import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/ipam/ip-addresses/hard-delete:
 *   post:
 *     summary: 여러 IP 주소 완전 삭제 (데이터베이스에서 영구 제거)
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
 *                 description: 완전 삭제할 IP 주소 ID 목록
 *     responses:
 *       200:
 *         description: IP 주소 완전 삭제 성공
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

    // Validate user.userId before proceeding
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

    // Limit to 50 IPs at once for safety (less than soft delete due to permanent nature)
    if (ip_address_ids.length > 50) {
      return NextResponse.json(
        { error: '한 번에 최대 50개의 IP 주소만 완전 삭제할 수 있습니다.' },
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

    // Verify all IP addresses belong to user's tenant and get their details
    const ipAddressCheck = await query(`
      SELECT ip.id, ip.ip_address, ir.name as ip_range_name
      FROM ip_addresses ip
      JOIN ip_ranges ir ON ip.ip_range_id = ir.id
      WHERE ip.id = ANY($1::uuid[]) AND ir.tenant_id = $2
    `, [ip_address_ids, tenantId]);

    if (ipAddressCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '완전 삭제할 수 있는 IP 주소가 없습니다.' },
        { status: 404 }
      );
    }

    const foundIPIds = ipAddressCheck.rows.map(row => row.id);
    const notFoundCount = ip_address_ids.length - foundIPIds.length;

    if (notFoundCount > 0) {
      console.warn(`[API] ${notFoundCount}개의 IP 주소를 찾을 수 없습니다.`);
    }

    // HARD DELETE - permanently remove from database
    const deleteResult = await query(`
      DELETE FROM ip_addresses 
      WHERE id = ANY($1::uuid[])
    `, [foundIPIds]);

    const deletedCount = deleteResult.rowCount || 0;

    console.log(`[API] Hard deleted ${deletedCount} IP addresses by user ${user.userId}`);
    console.warn(`[WARNING] PERMANENT DELETION: ${deletedCount} IP addresses permanently removed from database`);

    // Get summary of deleted IPs for response
    const deletedIPs = ipAddressCheck.rows.map(row => ({
      id: row.id,
      ip_address: row.ip_address,
      ip_range_name: row.ip_range_name
    }));

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      notFound: notFoundCount,
      deletedIPs: deletedIPs,
      message: `${deletedCount}개의 IP 주소가 영구적으로 삭제되었습니다.${notFoundCount > 0 ? ` (${notFoundCount}개는 찾을 수 없음)` : ''}`,
      warning: '이 작업은 되돌릴 수 없습니다.'
    });

  } catch (error) {
    console.error('Hard IP deletion error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { error: `IP 주소 완전 삭제에 실패했습니다: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}