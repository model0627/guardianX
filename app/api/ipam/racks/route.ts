import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/ipam/racks:
 *   get:
 *     summary: 랙 목록 조회
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
 *         description: 특정 랙 ID (상세 조회용)
 *     responses:
 *       200:
 *         description: 랙 목록/상세 조회 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rackId = searchParams.get('id');
  
  // If ID is provided, return single rack detail
  if (rackId) {
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

      // Get rack details with server room and office info
      const result = await query(`
        SELECT 
          r.id, r.name, r.rack_number, r.size_u, r.used_u, r.description,
          r.created_at, r.updated_at, r.server_room_id,
          sr.name as server_room_name,
          o.name as office_name
        FROM racks r
        JOIN server_rooms sr ON r.server_room_id = sr.id
        JOIN offices o ON sr.office_id = o.id
        WHERE r.id = $1 AND o.tenant_id = $2
      `, [rackId, tenantId]);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: '랙을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      // Get devices in this rack with their positions
      const devicesResult = await query(`
        SELECT 
          id, name, description, device_type, manufacturer, model,
          rack_position, rack_size, status
        FROM devices 
        WHERE rack_id = $1 AND is_active = true
        ORDER BY rack_position DESC
      `, [rackId]);

      // Calculate actual used U based on devices
      const actualUsedU = devicesResult.rows.reduce((total, device) => {
        return total + (device.rack_size || 1);
      }, 0);

      const rack = {
        ...result.rows[0],
        devices: devicesResult.rows,
        device_count: devicesResult.rows.length,
        actual_used_u: actualUsedU,
        usage_percentage: result.rows[0].size_u > 0 
          ? Math.round((actualUsedU / result.rows[0].size_u) * 100)
          : 0
      };

      return NextResponse.json({
        success: true,
        rack: rack
      });

    } catch (error) {
      console.error('[API] Rack detail error:', error);
      return NextResponse.json(
        { error: '랙 상세 정보 조회에 실패했습니다.' },
        { status: 500 }
      );
    }
  }

  // List racks
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

    // Get racks list with server room info and device count
    const result = await query(`
      SELECT 
        r.id, r.name, r.rack_number, r.size_u, r.used_u, r.description,
        r.created_at, r.server_room_id,
        sr.name as server_room_name,
        o.name as office_name,
        COUNT(DISTINCT d.id) as device_count
      FROM racks r
      JOIN server_rooms sr ON r.server_room_id = sr.id
      JOIN offices o ON sr.office_id = o.id
      LEFT JOIN devices d ON r.id = d.rack_id
      WHERE o.tenant_id = $1
      GROUP BY r.id, r.name, r.rack_number, r.size_u, r.used_u, r.description, r.created_at, r.server_room_id, sr.name, o.name
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [tenantId, limit, offset]);

    // Calculate usage percentage for each rack
    const racks = result.rows.map(rack => ({
      ...rack,
      usage_percentage: rack.size_u > 0 
        ? Math.round((rack.used_u / rack.size_u) * 100)
        : 0
    }));

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total 
      FROM racks r
      JOIN server_rooms sr ON r.server_room_id = sr.id
      JOIN offices o ON sr.office_id = o.id
      WHERE o.tenant_id = $1
    `, [tenantId]);

    return NextResponse.json({
      success: true,
      racks: racks,
      total: parseInt(countResult.rows[0].total)
    });

  } catch (error) {
    console.error('Rack list error:', error);
    return NextResponse.json(
      { error: '랙 목록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/racks:
 *   post:
 *     summary: 새 랙 추가
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
 *               - server_room_id
 *               - size_u
 *             properties:
 *               name:
 *                 type: string
 *                 description: 랙명
 *               rack_number:
 *                 type: string
 *                 description: 랙 번호
 *               server_room_id:
 *                 type: string
 *                 description: 서버실 ID
 *               size_u:
 *                 type: integer
 *                 description: 랙 크기 (U)
 *               used_u:
 *                 type: integer
 *                 description: 사용중인 U
 *               description:
 *                 type: string
 *                 description: 설명
 *     responses:
 *       201:
 *         description: 랙 생성 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API] Rack creation started');
    
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
    const { name, rack_number, server_room_id, size_u, used_u, description } = body;

    if (!name || !server_room_id || !size_u) {
      console.log('[API] Missing required fields:', { name, server_room_id, size_u });
      return NextResponse.json(
        { error: '랙명, 서버실, 크기는 필수입니다.' },
        { status: 400 }
      );
    }

    if (size_u < 1 || size_u > 100) {
      return NextResponse.json(
        { error: '랙 크기는 1U ~ 100U 범위여야 합니다.' },
        { status: 400 }
      );
    }

    if (used_u && (used_u < 0 || used_u > size_u)) {
      return NextResponse.json(
        { error: '사용중인 U는 0 ~ 전체 크기 범위여야 합니다.' },
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

    // Verify server room belongs to user's tenant
    const serverRoomCheck = await query(`
      SELECT sr.id FROM server_rooms sr
      JOIN offices o ON sr.office_id = o.id
      WHERE sr.id = $1 AND o.tenant_id = $2
    `, [server_room_id, tenantId]);

    if (serverRoomCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '선택한 서버실을 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    // Create rack
    console.log('[API] Creating rack with params:', [server_room_id, name, rack_number, size_u, used_u || 0, description, user.userId]);
    const result = await query(`
      INSERT INTO racks (server_room_id, name, rack_number, size_u, used_u, description, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, rack_number, server_room_id, size_u, used_u, description, created_at
    `, [server_room_id, name, rack_number, size_u, used_u || 0, description, user.userId]);

    console.log('[API] Rack created successfully:', result.rows[0]);
    return NextResponse.json({
      success: true,
      rack: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Rack creation error:', error);
    return NextResponse.json(
      { error: '랙 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/racks:
 *   put:
 *     summary: 랙 정보 수정
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
 *               - id
 *               - name
 *               - server_room_id
 *               - size_u
 *             properties:
 *               id:
 *                 type: string
 *                 description: 랙 ID
 *               name:
 *                 type: string
 *                 description: 랙명
 *               rack_number:
 *                 type: string
 *                 description: 랙 번호
 *               server_room_id:
 *                 type: string
 *                 description: 서버실 ID
 *               size_u:
 *                 type: integer
 *                 description: 랙 크기 (U)
 *               used_u:
 *                 type: integer
 *                 description: 사용중인 U
 *               description:
 *                 type: string
 *                 description: 설명
 *     responses:
 *       200:
 *         description: 랙 수정 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 랙을 찾을 수 없음
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
    const { id, name, rack_number, server_room_id, size_u, used_u, description } = body;

    if (!id || !name || !server_room_id || !size_u) {
      return NextResponse.json(
        { error: '랙 ID, 랙명, 서버실, 크기는 필수입니다.' },
        { status: 400 }
      );
    }

    if (size_u < 1 || size_u > 100) {
      return NextResponse.json(
        { error: '랙 크기는 1U ~ 100U 범위여야 합니다.' },
        { status: 400 }
      );
    }

    if (used_u !== undefined && (used_u < 0 || used_u > size_u)) {
      return NextResponse.json(
        { error: '사용중인 U는 0 ~ 전체 크기 범위여야 합니다.' },
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

    // Verify rack exists and belongs to user's tenant
    const rackCheck = await query(`
      SELECT r.id FROM racks r
      JOIN server_rooms sr ON r.server_room_id = sr.id
      JOIN offices o ON sr.office_id = o.id
      WHERE r.id = $1 AND o.tenant_id = $2
    `, [id, tenantId]);

    if (rackCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '랙을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Verify server room belongs to user's tenant
    const serverRoomCheck = await query(`
      SELECT sr.id FROM server_rooms sr
      JOIN offices o ON sr.office_id = o.id
      WHERE sr.id = $1 AND o.tenant_id = $2
    `, [server_room_id, tenantId]);

    if (serverRoomCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '선택한 서버실을 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    // Update rack
    const result = await query(`
      UPDATE racks 
      SET name = $1, rack_number = $2, server_room_id = $3, size_u = $4, used_u = $5, description = $6, updated_at = NOW()
      WHERE id = $7
      RETURNING id, name, rack_number, server_room_id, size_u, used_u, description, created_at, updated_at
    `, [name, rack_number, server_room_id, size_u, used_u || 0, description, id]);

    return NextResponse.json({
      success: true,
      rack: result.rows[0]
    });

  } catch (error) {
    console.error('Rack update error:', error);
    return NextResponse.json(
      { error: '랙 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/racks:
 *   delete:
 *     summary: 랙 삭제
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
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 description: 삭제할 랙 ID
 *     responses:
 *       200:
 *         description: 랙 삭제 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 랙을 찾을 수 없음
 *       409:
 *         description: 연관된 데이터가 있어 삭제할 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: '랙 ID는 필수입니다.' },
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

    // Verify rack exists and belongs to user's tenant
    const rackCheck = await query(`
      SELECT r.id, r.name FROM racks r
      JOIN server_rooms sr ON r.server_room_id = sr.id
      JOIN offices o ON sr.office_id = o.id
      WHERE r.id = $1 AND o.tenant_id = $2
    `, [id, tenantId]);

    if (rackCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '랙을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Check for related devices
    const devicesCheck = await query(`
      SELECT COUNT(*) as count FROM devices WHERE rack_id = $1
    `, [id]);

    if (parseInt(devicesCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: '이 랙에 연결된 디바이스가 있어 삭제할 수 없습니다. 먼저 디바이스를 삭제해주세요.' },
        { status: 409 }
      );
    }

    // Delete rack
    await query(`
      DELETE FROM racks WHERE id = $1
    `, [id]);

    return NextResponse.json({
      success: true,
      message: `랙 '${rackCheck.rows[0].name}'이(가) 성공적으로 삭제되었습니다.`
    });

  } catch (error) {
    console.error('Rack deletion error:', error);
    return NextResponse.json(
      { error: '랙 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}