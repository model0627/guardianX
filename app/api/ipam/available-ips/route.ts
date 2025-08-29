import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/ipam/available-ips:
 *   get:
 *     summary: 사용 가능한 IP 주소 목록 조회
 *     tags: [IPAM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 조회할 최대 개수
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: IP 주소 검색
 *     responses:
 *       200:
 *         description: 사용 가능한 IP 주소 목록
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const search = searchParams.get('search') || '';

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

    // Build search condition
    let searchCondition = '';
    const params = [tenantId];
    
    if (search) {
      searchCondition = ` AND ip.ip_address::text ILIKE $2`;
      params.push(`%${search}%`);
    }

    params.push(limit);
    const limitParamIndex = params.length;

    // Get available IP addresses
    const result = await query(`
      SELECT 
        ip.id,
        ip.ip_address,
        ip.status,
        ip.description,
        ir.network_address,
        ir.subnet_mask,
        ir.name as range_name,
        '' as office_name,
        '' as server_room_name
      FROM ip_addresses ip
      JOIN ip_ranges ir ON ip.ip_range_id = ir.id
      WHERE ir.tenant_id = $1 AND ip.status = 'available'
        ${searchCondition}
      ORDER BY ip.ip_address
      LIMIT $${limitParamIndex}
    `, params);

    return NextResponse.json({
      success: true,
      available_ips: result.rows
    });

  } catch (error) {
    console.error('Available IPs list error:', error);
    return NextResponse.json(
      { error: '사용 가능한 IP 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}