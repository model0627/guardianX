import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/ipam/ip-addresses/deleted:
 *   get:
 *     summary: 삭제된 IP 주소 목록 조회
 *     tags: [IPAM]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 삭제된 IP 주소 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    if (!user.userId) {
      return NextResponse.json(
        { error: '사용자 ID가 유효하지 않습니다.' },
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

    // Get deleted IP addresses with IP range information
    const result = await query(`
      SELECT 
        ip.id,
        ip.ip_address,
        ip.status,
        ip.hostname,
        ip.description,
        ip.mac_address,
        ip.ip_range_id,
        ir.name as ip_range_name,
        ip.lease_start,
        ip.lease_end,
        ip.created_at,
        ip.updated_at,
        ip.assigned_device,
        u.email as deleted_by_email
      FROM ip_addresses ip
      JOIN ip_ranges ir ON ip.ip_range_id = ir.id
      LEFT JOIN users u ON ip.updated_by = u.id
      WHERE ir.tenant_id = $1 AND ip.is_active = false
      ORDER BY ip.updated_at DESC
    `, [tenantId]);

    return NextResponse.json({
      success: true,
      deletedIPAddresses: result.rows
    });

  } catch (error) {
    console.error('Get deleted IP addresses error:', error);
    return NextResponse.json(
      { error: '삭제된 IP 주소 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}