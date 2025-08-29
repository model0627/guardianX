import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/ipam/ip-ranges:
 *   get:
 *     summary: IP 대역 목록 조회
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
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 건너뛸 개수
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: 특정 IP 대역 ID (상세 조회용)
 *     responses:
 *       200:
 *         description: IP 대역 목록/상세 조회 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ipRangeId = searchParams.get('id');
  
  // If ID is provided, return single IP range detail
  if (ipRangeId) {
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

      // Get IP range details
      const result = await query(`
        SELECT 
          ir.id, ir.name, ir.description, ir.network_address, ir.subnet_mask,
          ir.gateway, ir.dns_servers, ir.vlan_id, ir.ip_version,
          ir.created_at, ir.updated_at,
          COUNT(ip.id) as total_ips,
          COUNT(CASE WHEN ip.status = 'allocated' THEN 1 END) as used_ips,
          COUNT(CASE WHEN ip.status = 'available' THEN 1 END) as available_ips
        FROM ip_ranges ir
        LEFT JOIN ip_addresses ip ON ir.id = ip.ip_range_id AND ip.is_active = true
        WHERE ir.id = $1 AND ir.tenant_id = $2 AND ir.is_active = true
        GROUP BY ir.id, ir.name, ir.description, ir.network_address, ir.subnet_mask,
                 ir.gateway, ir.dns_servers, ir.vlan_id, ir.ip_version,
                 ir.created_at, ir.updated_at
      `, [ipRangeId, tenantId]);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'IP 대역을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const ipRange = {
        ...result.rows[0],
        total_ips: parseInt(result.rows[0].total_ips),
        used_ips: parseInt(result.rows[0].used_ips),
        available_ips: parseInt(result.rows[0].available_ips),
        usage_percentage: result.rows[0].total_ips > 0 
          ? Math.round((result.rows[0].used_ips / result.rows[0].total_ips) * 100)
          : 0
      };

      return NextResponse.json({
        success: true,
        ipRange: ipRange
      });

    } catch (error) {
      console.error('[API] IP range detail error:', error);
      return NextResponse.json(
        { error: 'IP 대역 상세 정보 조회에 실패했습니다.' },
        { status: 500 }
      );
    }
  }

  // List IP ranges
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    // Get IP ranges list with statistics
    const result = await query(`
      SELECT 
        ir.id, ir.name, ir.description, ir.network_address, ir.subnet_mask,
        ir.gateway, ir.dns_servers, ir.vlan_id, ir.ip_version, ir.created_at,
        COUNT(ip.id) as total_ips,
        COUNT(CASE WHEN ip.status = 'allocated' THEN 1 END) as used_ips,
        COUNT(CASE WHEN ip.status = 'available' THEN 1 END) as available_ips
      FROM ip_ranges ir
      LEFT JOIN ip_addresses ip ON ir.id = ip.ip_range_id AND ip.is_active = true
      WHERE ir.tenant_id = $1 AND ir.is_active = true
      GROUP BY ir.id, ir.name, ir.description, ir.network_address, ir.subnet_mask,
               ir.gateway, ir.dns_servers, ir.vlan_id, ir.ip_version, ir.created_at
      ORDER BY ir.created_at DESC
      LIMIT $2 OFFSET $3
    `, [tenantId, limit, offset]);

    // Calculate usage percentage for each IP range
    const ipRanges = result.rows.map(ipRange => {
      const totalIps = parseInt(ipRange.total_ips);
      const usedIps = parseInt(ipRange.used_ips);
      const availableIps = parseInt(ipRange.available_ips);
      
      // If no IPs are generated yet, calculate potential IPs from CIDR
      const potentialIPs = totalIps === 0 ? Math.pow(2, (32 - ipRange.subnet_mask)) - 2 : totalIps;
      
      return {
        ...ipRange,
        total_ips: Math.max(totalIps, potentialIPs),
        used_ips: usedIps,
        available_ips: Math.max(availableIps, potentialIPs - usedIps),
        usage_percentage: potentialIPs > 0 
          ? Math.round((usedIps / potentialIPs) * 100)
          : 0
      };
    });

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total 
      FROM ip_ranges 
      WHERE tenant_id = $1 AND is_active = true
    `, [tenantId]);

    return NextResponse.json({
      success: true,
      ipRanges: ipRanges,
      total: parseInt(countResult.rows[0].total)
    });

  } catch (error) {
    console.error('IP ranges list error:', error);
    return NextResponse.json(
      { error: 'IP 대역 목록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/ip-ranges:
 *   post:
 *     summary: 새 IP 대역 추가
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
 *               - name
 *               - network_address
 *               - subnet_mask
 *             properties:
 *               name:
 *                 type: string
 *                 description: IP 대역명
 *               description:
 *                 type: string
 *                 description: 설명
 *               network_address:
 *                 type: string
 *                 description: 네트워크 주소
 *               subnet_mask:
 *                 type: integer
 *                 description: 서브넷 마스크 (CIDR)
 *               gateway:
 *                 type: string
 *                 description: 게이트웨이 주소
 *               dns_servers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: DNS 서버 목록
 *               vlan_id:
 *                 type: integer
 *                 description: VLAN ID
 *               ip_version:
 *                 type: integer
 *                 description: IP 버전 (4 또는 6)
 *     responses:
 *       201:
 *         description: IP 대역 생성 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API] IP range creation started');
    
    const user = await getAuthUser(request);
    if (!user) {
      console.log('[API] Authentication failed');
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('[API] Request body:', body);
    const { name, description, network_address, subnet_mask, gateway, dns_servers, vlan_id, ip_version } = body;

    if (!name || !network_address || !subnet_mask) {
      console.log('[API] Missing required fields:', { name, network_address, subnet_mask });
      return NextResponse.json(
        { error: 'IP 대역명, 네트워크 주소, 서브넷 마스크는 필수입니다.' },
        { status: 400 }
      );
    }

    if (subnet_mask < 8 || subnet_mask > 32) {
      return NextResponse.json(
        { error: '서브넷 마스크는 8 ~ 32 범위여야 합니다.' },
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

    // Validate user.userId before creating IP range
    if (!user.userId) {
      console.error('[API] user.userId is null or undefined:', user);
      return NextResponse.json(
        { error: '사용자 ID가 유효하지 않습니다.' },
        { status: 400 }
      );
    }

    // Create IP range
    console.log('[API] Creating IP range with user info:', { userId: user.userId, email: user.email, role: user.role });
    console.log('[API] Creating IP range with params:', [tenantId, name, description, network_address, subnet_mask, gateway, dns_servers, vlan_id, ip_version || 4, user.userId]);
    
    const result = await query(`
      INSERT INTO ip_ranges (tenant_id, name, description, network_address, subnet_mask, gateway, dns_servers, vlan_id, ip_version, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, description, network_address, subnet_mask, gateway, dns_servers, vlan_id, ip_version, created_at
    `, [tenantId, name, description, network_address, subnet_mask, gateway, dns_servers, vlan_id, ip_version || 4, user.userId]);

    console.log('[API] IP range created successfully:', result.rows[0]);
    return NextResponse.json({
      success: true,
      ipRange: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('IP range creation error:', error);
    return NextResponse.json(
      { error: 'IP 대역 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/ip-ranges:
 *   delete:
 *     summary: IP 대역 삭제
 *     tags: [IPAM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 삭제할 IP 대역 ID
 *     responses:
 *       200:
 *         description: IP 대역 삭제 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: IP 대역을 찾을 수 없음
 *       409:
 *         description: 삭제할 수 없음 (연관된 IP 주소가 있음)
 *       500:
 *         description: 서버 오류
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ipRangeId = searchParams.get('id');

    if (!ipRangeId) {
      return NextResponse.json(
        { error: 'IP 대역 ID가 필요합니다.' },
        { status: 400 }
      );
    }

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

    // Check if IP range exists and belongs to user's tenant
    const ipRangeCheck = await query(`
      SELECT id, name FROM ip_ranges 
      WHERE id = $1 AND tenant_id = $2 AND is_active = true
    `, [ipRangeId, tenantId]);

    if (ipRangeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'IP 대역을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const ipRange = ipRangeCheck.rows[0];

    // Check if there are any active IP addresses in this range
    const ipAddressCount = await query(`
      SELECT COUNT(*) as count 
      FROM ip_addresses 
      WHERE ip_range_id = $1 AND is_active = true
    `, [ipRangeId]);

    const activeIPCount = parseInt(ipAddressCount.rows[0].count);

    if (activeIPCount > 0) {
      return NextResponse.json(
        { 
          error: `이 IP 대역에 ${activeIPCount}개의 활성 IP 주소가 있어 삭제할 수 없습니다. 먼저 모든 IP 주소를 삭제하세요.`,
          activeIPCount 
        },
        { status: 409 }
      );
    }

    // Soft delete the IP range
    await query(`
      UPDATE ip_ranges 
      SET is_active = false, updated_at = NOW() 
      WHERE id = $1
    `, [ipRangeId]);

    console.log(`[API] IP range deleted successfully: ${ipRange.name} (ID: ${ipRangeId})`);

    return NextResponse.json({
      success: true,
      message: `IP 대역 '${ipRange.name}'이(가) 성공적으로 삭제되었습니다.`
    });

  } catch (error) {
    console.error('IP range deletion error:', error);
    return NextResponse.json(
      { error: 'IP 대역 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}