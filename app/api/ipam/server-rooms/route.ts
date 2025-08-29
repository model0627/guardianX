import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/ipam/server-rooms:
 *   get:
 *     summary: 서버실 목록 조회
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
 *         description: 특정 서버실 ID (상세 조회용)
 *     responses:
 *       200:
 *         description: 서버실 목록/상세 조회 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serverRoomId = searchParams.get('id');
  
  // If ID is provided, return single server room detail
  if (serverRoomId) {
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

      // Get server room details with office info
      const result = await query(`
        SELECT 
          sr.id, sr.name, sr.description, sr.floor_level as floor, sr.room_number,
          sr.temperature_monitoring, sr.humidity_monitoring, sr.access_control,
          sr.created_at, sr.updated_at, sr.office_id,
          o.name as office_name
        FROM server_rooms sr
        JOIN offices o ON sr.office_id = o.id
        WHERE sr.id = $1 AND o.tenant_id = $2
      `, [serverRoomId, tenantId]);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: '서버실을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      // Add counts (simplified for now)
      const serverRoom = {
        ...result.rows[0],
        racks_count: 0,
        devices_count: 0
      };

      return NextResponse.json({
        success: true,
        serverRoom: serverRoom
      });

    } catch (error) {
      console.error('[API] Server room detail error:', error);
      return NextResponse.json(
        { error: '서버실 상세 정보 조회에 실패했습니다.' },
        { status: 500 }
      );
    }
  }

  // List server rooms
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

    // Get server rooms list with office info and counts
    const result = await query(`
      SELECT 
        sr.id, sr.name, sr.description, sr.floor_level as floor, sr.room_number,
        sr.temperature_monitoring, sr.humidity_monitoring, sr.access_control,
        sr.created_at, sr.office_id,
        o.name as office_name,
        COUNT(DISTINCT r.id) as racks_count,
        COUNT(DISTINCT d.id) as devices_count
      FROM server_rooms sr
      JOIN offices o ON sr.office_id = o.id
      LEFT JOIN racks r ON sr.id = r.server_room_id
      LEFT JOIN devices d ON r.id = d.rack_id
      WHERE o.tenant_id = $1
      GROUP BY sr.id, sr.name, sr.description, sr.floor_level, sr.room_number, sr.temperature_monitoring, sr.humidity_monitoring, sr.access_control, sr.created_at, sr.office_id, o.name
      ORDER BY sr.created_at DESC
      LIMIT $2 OFFSET $3
    `, [tenantId, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total 
      FROM server_rooms sr
      JOIN offices o ON sr.office_id = o.id
      WHERE o.tenant_id = $1
    `, [tenantId]);

    return NextResponse.json({
      success: true,
      serverRooms: result.rows,
      total: parseInt(countResult.rows[0].total)
    });

  } catch (error) {
    console.error('Server room list error:', error);
    return NextResponse.json(
      { error: '서버실 목록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/server-rooms:
 *   post:
 *     summary: 새 서버실 추가
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
 *               - office_id
 *             properties:
 *               name:
 *                 type: string
 *                 description: 서버실명
 *               description:
 *                 type: string
 *                 description: 서버실 설명
 *               office_id:
 *                 type: string
 *                 description: 사무실 ID
 *               floor:
 *                 type: string
 *                 description: 층수
 *               temperature:
 *                 type: number
 *                 description: 온도
 *               humidity:
 *                 type: number
 *                 description: 습도
 *     responses:
 *       201:
 *         description: 서버실 생성 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API DEBUG] Server room creation request received');
    const user = await getAuthUser(request);
    if (!user) {
      console.log('[API DEBUG] No authentication found');
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('[API DEBUG] Request body:', body);
    const { name, description, office_id, floor, room_number, temperature_monitoring, humidity_monitoring, access_control } = body;

    if (!name || !office_id) {
      console.log('[API DEBUG] Missing required fields:', { name, office_id });
      return NextResponse.json(
        { error: '서버실명과 사무실은 필수입니다.' },
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

    // Verify office belongs to user's tenant
    const officeCheck = await query(`
      SELECT id FROM offices WHERE id = $1 AND tenant_id = $2
    `, [office_id, tenantId]);

    if (officeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '선택한 사무실을 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    // Create server room
    console.log('[API DEBUG] Creating server room with data:', {
      office_id, name, description, floor, room_number, temperature_monitoring, humidity_monitoring, access_control
    });
    
    const result = await query(`
      INSERT INTO server_rooms (office_id, name, description, floor_level, room_number, temperature_monitoring, humidity_monitoring, access_control, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name, description, office_id, floor_level as floor, room_number, temperature_monitoring, humidity_monitoring, access_control, created_at
    `, [office_id, name, description, floor, room_number, temperature_monitoring || false, humidity_monitoring || false, access_control || false, user.userId]);

    return NextResponse.json({
      success: true,
      serverRoom: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('[API DEBUG] Server room creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `서버실 생성에 실패했습니다: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/server-rooms:
 *   put:
 *     summary: 서버실 정보 수정
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
 *               - office_id
 *             properties:
 *               id:
 *                 type: string
 *                 description: 서버실 ID
 *               name:
 *                 type: string
 *                 description: 서버실명
 *               description:
 *                 type: string
 *                 description: 서버실 설명
 *               office_id:
 *                 type: string
 *                 description: 사무실 ID
 *               floor:
 *                 type: string
 *                 description: 층수
 *               temperature:
 *                 type: number
 *                 description: 온도
 *               humidity:
 *                 type: number
 *                 description: 습도
 *     responses:
 *       200:
 *         description: 서버실 수정 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 서버실을 찾을 수 없음
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
    const { id, name, description, office_id, floor, temperature, humidity } = body;

    if (!id || !name || !office_id) {
      return NextResponse.json(
        { error: '서버실 ID, 서버실명, 사무실은 필수입니다.' },
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

    // Verify server room exists and belongs to user's tenant
    const serverRoomCheck = await query(`
      SELECT sr.id FROM server_rooms sr
      JOIN offices o ON sr.office_id = o.id
      WHERE sr.id = $1 AND o.tenant_id = $2
    `, [id, tenantId]);

    if (serverRoomCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '서버실을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Verify office belongs to user's tenant
    const officeCheck = await query(`
      SELECT id FROM offices WHERE id = $1 AND tenant_id = $2
    `, [office_id, tenantId]);

    if (officeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '선택한 사무실을 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    // Update server room
    const result = await query(`
      UPDATE server_rooms 
      SET name = $1, description = $2, office_id = $3, floor = $4, temperature = $5, humidity = $6, updated_at = NOW()
      WHERE id = $7
      RETURNING id, name, description, office_id, floor, temperature, humidity, created_at, updated_at
    `, [name, description, office_id, floor, temperature, humidity, id]);

    return NextResponse.json({
      success: true,
      serverRoom: result.rows[0]
    });

  } catch (error) {
    console.error('Server room update error:', error);
    return NextResponse.json(
      { error: '서버실 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/server-rooms:
 *   delete:
 *     summary: 서버실 삭제
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
 *                 description: 삭제할 서버실 ID
 *     responses:
 *       200:
 *         description: 서버실 삭제 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 서버실을 찾을 수 없음
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
        { error: '서버실 ID는 필수입니다.' },
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

    // Verify server room exists and belongs to user's tenant
    const serverRoomCheck = await query(`
      SELECT sr.id, sr.name FROM server_rooms sr
      JOIN offices o ON sr.office_id = o.id
      WHERE sr.id = $1 AND o.tenant_id = $2
    `, [id, tenantId]);

    if (serverRoomCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '서버실을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Check for related racks
    const racksCheck = await query(`
      SELECT COUNT(*) as count FROM racks WHERE server_room_id = $1
    `, [id]);

    if (parseInt(racksCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: '이 서버실에 연결된 랙이 있어 삭제할 수 없습니다. 먼저 랙을 삭제해주세요.' },
        { status: 409 }
      );
    }

    // Delete server room
    await query(`
      DELETE FROM server_rooms WHERE id = $1
    `, [id]);

    return NextResponse.json({
      success: true,
      message: `서버실 '${serverRoomCheck.rows[0].name}'이(가) 성공적으로 삭제되었습니다.`
    });

  } catch (error) {
    console.error('Server room deletion error:', error);
    return NextResponse.json(
      { error: '서버실 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}