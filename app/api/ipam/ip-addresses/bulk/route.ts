import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/ipam/ip-addresses/bulk:
 *   post:
 *     summary: 여러 IP 주소 일괄 생성
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
 *               - ip_range_id
 *               - ip_addresses
 *             properties:
 *               ip_range_id:
 *                 type: string
 *                 description: IP 대역 ID
 *               ip_addresses:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 생성할 IP 주소 목록
 *               status:
 *                 type: string
 *                 enum: [available, reserved, allocated, disabled]
 *                 default: available
 *               description:
 *                 type: string
 *                 description: IP 주소 설명
 *     responses:
 *       201:
 *         description: IP 주소 생성 성공
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

    // Validate user.userId before proceeding
    if (!user.userId) {
      console.error('[API] user.userId is null or undefined:', user);
      return NextResponse.json(
        { error: '사용자 ID가 유효하지 않습니다.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { 
      ip_range_id, 
      ip_addresses, 
      status = 'available', 
      description = '' 
    } = body;

    if (!ip_range_id || !ip_addresses || !Array.isArray(ip_addresses) || ip_addresses.length === 0) {
      return NextResponse.json(
        { error: 'IP 대역 ID와 IP 주소 목록이 필요합니다.' },
        { status: 400 }
      );
    }

    // Limit to 256 IPs at once
    if (ip_addresses.length > 256) {
      return NextResponse.json(
        { error: '한 번에 최대 256개의 IP 주소만 생성할 수 있습니다.' },
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

    // Verify IP range belongs to tenant
    const rangeCheck = await query(`
      SELECT id, network_address, subnet_mask 
      FROM ip_ranges 
      WHERE id = $1 AND tenant_id = $2
    `, [ip_range_id, tenantId]);

    if (rangeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'IP 대역을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const ipRange = rangeCheck.rows[0];

    // Check which IPs already exist
    const existingIPs = await query(`
      SELECT ip_address 
      FROM ip_addresses 
      WHERE ip_range_id = $1 AND ip_address = ANY($2::inet[])
    `, [ip_range_id, ip_addresses]);

    const existingIPSet = new Set(existingIPs.rows.map(row => row.ip_address.split('/')[0]));
    const newIPs = ip_addresses.filter(ip => !existingIPSet.has(ip));

    if (newIPs.length === 0) {
      return NextResponse.json({
        success: true,
        created: 0,
        skipped: ip_addresses.length,
        message: '모든 IP 주소가 이미 존재합니다.'
      });
    }

    // Build bulk insert values with created_by
    const values = newIPs.map((ip, index) => {
      const paramOffset = index * 5;
      return `($${paramOffset + 1}::uuid, $${paramOffset + 2}::inet, $${paramOffset + 3}, $${paramOffset + 4}, $${paramOffset + 5}::uuid)`;
    }).join(', ');

    const insertParams = newIPs.flatMap(ip => [
      ip_range_id,
      ip,
      status,
      description || null,
      user.userId
    ]);

    console.log('[API] Bulk creating IP addresses with user info:', { userId: user.userId, email: user.email, role: user.role });
    console.log('[API] Creating', newIPs.length, 'IP addresses');

    // Bulk insert new IPs
    await query(`
      INSERT INTO ip_addresses (ip_range_id, ip_address, status, description, created_by)
      VALUES ${values}
    `, insertParams);

    return NextResponse.json({
      success: true,
      created: newIPs.length,
      skipped: existingIPSet.size,
      message: `${newIPs.length}개의 IP 주소가 생성되었습니다.`
    }, { status: 201 });

  } catch (error) {
    console.error('Bulk IP creation error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { error: `IP 주소 생성에 실패했습니다: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}