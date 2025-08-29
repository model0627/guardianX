import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/ipam/ip-addresses:
 *   get:
 *     summary: IP 주소 목록 조회
 *     tags: [IPAM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: 조회할 최대 개수
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 건너뛸 개수
 *       - in: query
 *         name: ip_range_id
 *         schema:
 *           type: string
 *         description: 특정 IP 대역으로 필터링
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, allocated, reserved, disabled]
 *         description: 상태로 필터링
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: 특정 IP 주소 ID (상세 조회용)
 *     responses:
 *       200:
 *         description: IP 주소 목록/상세 조회 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ipAddressId = searchParams.get('id');
  
  // If ID is provided, return single IP address detail
  if (ipAddressId) {
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

      // Get IP address details
      const result = await query(`
        SELECT 
          ip.id, ip.ip_address, ip.status, ip.hostname, ip.description,
          ip.mac_address, ip.lease_start, ip.lease_end, ip.created_at, ip.updated_at,
          ir.id as ip_range_id, ir.name as ip_range_name, ir.network_address, ir.subnet_mask
        FROM ip_addresses ip
        JOIN ip_ranges ir ON ip.ip_range_id = ir.id
        WHERE ip.id = $1 AND ir.tenant_id = $2 AND ip.is_active = true
      `, [ipAddressId, tenantId]);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'IP 주소를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        ipAddress: result.rows[0]
      });

    } catch (error) {
      console.error('[API] IP address detail error:', error);
      return NextResponse.json(
        { error: 'IP 주소 상세 정보 조회에 실패했습니다.' },
        { status: 500 }
      );
    }
  }

  // List IP addresses
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const ipRangeId = searchParams.get('ip_range_id');
    const statusFilter = searchParams.get('status');

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

    // Build query with filters
    let whereClause = 'WHERE ir.tenant_id = $1 AND ip.is_active = true';
    const params = [tenantId];
    let paramIndex = 2;

    if (ipRangeId) {
      whereClause += ` AND ip.ip_range_id = $${paramIndex}`;
      params.push(ipRangeId);
      paramIndex++;
    }

    if (statusFilter) {
      whereClause += ` AND ip.status = $${paramIndex}`;
      params.push(statusFilter);
      paramIndex++;
    }

    // Add limit and offset parameters
    params.push(limit, offset);

    // Get IP addresses list with proper device mappings
    const result = await query(`
      SELECT 
        ip.id, ip.ip_address, ip.status, ip.hostname, ip.description,
        ip.mac_address, ip.lease_start, ip.lease_end, ip.created_at,
        ir.id as ip_range_id, ir.name as ip_range_name,
        ir.network_address, ir.subnet_mask,
        -- Get assigned device info from device_ip_mappings
        d.name as assigned_device,
        d.id as assigned_device_id,
        d.is_active as device_is_active,
        dim.id as mapping_id,
        dim.is_primary as is_primary_ip
      FROM ip_addresses ip
      JOIN ip_ranges ir ON ip.ip_range_id = ir.id
      LEFT JOIN device_ip_mappings dim ON ip.id = dim.ip_address_id
      LEFT JOIN devices d ON dim.device_id = d.id
      ${whereClause}
      ORDER BY inet(ip.ip_address)
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    // Get total count
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await query(`
      SELECT COUNT(*) as total 
      FROM ip_addresses ip
      JOIN ip_ranges ir ON ip.ip_range_id = ir.id
      ${whereClause}
    `, countParams);

    return NextResponse.json({
      success: true,
      ipAddresses: result.rows,
      total: parseInt(countResult.rows[0].total)
    });

  } catch (error) {
    console.error('IP addresses list error:', error);
    return NextResponse.json(
      { error: 'IP 주소 목록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/ip-addresses:
 *   post:
 *     summary: 새 IP 주소 추가
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
 *               - ip_address
 *               - status
 *             properties:
 *               ip_range_id:
 *                 type: string
 *                 description: IP 대역 ID
 *               ip_address:
 *                 type: string
 *                 description: IP 주소
 *               status:
 *                 type: string
 *                 enum: [available, allocated, reserved, disabled]
 *                 description: 상태
 *               hostname:
 *                 type: string
 *                 description: 호스트명
 *               description:
 *                 type: string
 *                 description: 설명
 *               mac_address:
 *                 type: string
 *                 description: MAC 주소
 *               lease_start:
 *                 type: string
 *                 format: date-time
 *                 description: 임대 시작일
 *               lease_end:
 *                 type: string
 *                 format: date-time
 *                 description: 임대 종료일
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
    console.log('[API] IP address creation started');
    
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
    const { ip_range_id, ip_address, status, hostname, description, mac_address, lease_start, lease_end } = body;

    if (!ip_range_id || !ip_address || !status) {
      console.log('[API] Missing required fields:', { ip_range_id, ip_address, status });
      return NextResponse.json(
        { error: 'IP 대역, IP 주소, 상태는 필수입니다.' },
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

    // Verify IP range belongs to user's tenant
    const ipRangeCheck = await query(`
      SELECT id FROM ip_ranges WHERE id = $1 AND tenant_id = $2 AND is_active = true
    `, [ip_range_id, tenantId]);

    if (ipRangeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '선택한 IP 대역을 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    // Check if IP address already exists in the range
    const existingIP = await query(`
      SELECT id FROM ip_addresses 
      WHERE ip_address = $1 AND ip_range_id = $2 AND is_active = true
    `, [ip_address, ip_range_id]);

    if (existingIP.rows.length > 0) {
      return NextResponse.json(
        { error: '이미 등록된 IP 주소입니다.' },
        { status: 400 }
      );
    }

    // Validate user.userId before creating IP address
    if (!user.userId) {
      console.error('[API] user.userId is null or undefined:', user);
      return NextResponse.json(
        { error: '사용자 ID가 유효하지 않습니다.' },
        { status: 400 }
      );
    }

    // Create IP address
    console.log('[API] Creating IP address with user info:', { userId: user.userId, email: user.email, role: user.role });
    console.log('[API] Creating IP address with params:', [ip_range_id, ip_address, status, hostname, description, mac_address, lease_start, lease_end, user.userId]);
    
    const result = await query(`
      INSERT INTO ip_addresses (ip_range_id, ip_address, status, hostname, description, mac_address, lease_start, lease_end, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, ip_range_id, ip_address, status, hostname, description, mac_address, lease_start, lease_end, created_at
    `, [ip_range_id, ip_address, status, hostname, description, mac_address, lease_start, lease_end, user.userId]);

    console.log('[API] IP address created successfully:', result.rows[0]);
    return NextResponse.json({
      success: true,
      ipAddress: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('IP address creation error:', error);
    return NextResponse.json(
      { error: 'IP 주소 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/ip-addresses:
 *   delete:
 *     summary: IP 주소 삭제
 *     tags: [IPAM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 삭제할 IP 주소 ID
 *     responses:
 *       200:
 *         description: IP 주소 삭제 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: IP 주소를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ipAddressId = searchParams.get('id');

    if (!ipAddressId) {
      return NextResponse.json(
        { error: 'IP 주소 ID가 필요합니다.' },
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

    // Check if IP address exists and belongs to user's tenant
    const ipAddressCheck = await query(`
      SELECT ip.id, ip.ip_address, ir.name as ip_range_name
      FROM ip_addresses ip
      JOIN ip_ranges ir ON ip.ip_range_id = ir.id
      WHERE ip.id = $1 AND ir.tenant_id = $2 AND ip.is_active = true
    `, [ipAddressId, tenantId]);

    if (ipAddressCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'IP 주소를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const ipAddress = ipAddressCheck.rows[0];

    // Soft delete the IP address
    await query(`
      UPDATE ip_addresses 
      SET is_active = false, updated_at = NOW() 
      WHERE id = $1
    `, [ipAddressId]);

    console.log(`[API] IP address deleted successfully: ${ipAddress.ip_address} (ID: ${ipAddressId})`);

    return NextResponse.json({
      success: true,
      message: `IP 주소 '${ipAddress.ip_address}'이(가) 성공적으로 삭제되었습니다.`
    });

  } catch (error) {
    console.error('IP address deletion error:', error);
    return NextResponse.json(
      { error: 'IP 주소 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}