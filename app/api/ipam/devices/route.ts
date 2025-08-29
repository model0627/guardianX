import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/ipam/devices:
 *   get:
 *     summary: 디바이스 목록 조회
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
 *         name: device_type
 *         schema:
 *           type: string
 *         description: 디바이스 타입으로 필터링
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, maintenance, decommissioned]
 *         description: 상태로 필터링
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: 특정 디바이스 ID (상세 조회용)
 *     responses:
 *       200:
 *         description: 디바이스 목록/상세 조회 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('id');
  
  // If ID is provided, return single device detail
  if (deviceId) {
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

      // Get device details with rack and location info
      const result = await query(`
        SELECT 
          d.id, d.name, d.description, d.device_type, d.manufacturer, d.model,
          d.serial_number, d.rack_position, d.rack_size, d.power_consumption,
          d.status, d.purchase_date, d.warranty_end, d.created_at, d.updated_at,
          r.id as rack_id, r.name as rack_name,
          sr.name as server_room_name,
          o.name as office_name,
          -- Get primary IP address
          (SELECT host(ip.ip_address) 
           FROM device_ip_mappings dim 
           JOIN ip_addresses ip ON dim.ip_address_id = ip.id 
           WHERE dim.device_id = d.id AND dim.is_primary = true 
           LIMIT 1) as primary_ip,
          -- Get all assigned IP addresses
          ARRAY(SELECT host(ip.ip_address) 
                FROM device_ip_mappings dim 
                JOIN ip_addresses ip ON dim.ip_address_id = ip.id 
                WHERE dim.device_id = d.id) as assigned_ips
        FROM devices d
        LEFT JOIN racks r ON d.rack_id = r.id
        LEFT JOIN server_rooms sr ON r.server_room_id = sr.id
        LEFT JOIN offices o ON sr.office_id = o.id
        WHERE d.id = $1 AND d.is_active = true
          AND (o.tenant_id = $2 OR d.tenant_id = $2)
      `, [deviceId, tenantId]);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: '디바이스를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        device: result.rows[0]
      });

    } catch (error) {
      console.error('[API] Device detail error:', error);
      return NextResponse.json(
        { error: '디바이스 상세 정보 조회에 실패했습니다.' },
        { status: 500 }
      );
    }
  }

  // List devices
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
    const deviceTypeFilter = searchParams.get('device_type');
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
    let whereClause = 'WHERE d.is_active = true AND (o.tenant_id = $1 OR d.tenant_id = $1)';
    const params = [tenantId];
    let paramIndex = 2;

    if (deviceTypeFilter) {
      whereClause += ` AND d.device_type = $${paramIndex}`;
      params.push(deviceTypeFilter);
      paramIndex++;
    }

    if (statusFilter) {
      whereClause += ` AND d.status = $${paramIndex}`;
      params.push(statusFilter);
      paramIndex++;
    }

    // Add limit and offset parameters
    params.push(limit, offset);

    // Get devices list with location and IP info
    const result = await query(`
      SELECT 
        d.id, d.name, d.description, d.device_type, d.manufacturer, d.model,
        d.serial_number, d.rack_position, d.rack_size, d.power_consumption,
        d.status, d.purchase_date, d.warranty_end, d.created_at,
        r.id as rack_id, r.name as rack_name,
        sr.name as server_room_name,
        o.name as office_name,
        -- Get primary IP address
        (SELECT host(ip.ip_address) 
         FROM device_ip_mappings dim 
         JOIN ip_addresses ip ON dim.ip_address_id = ip.id 
         WHERE dim.device_id = d.id AND dim.is_primary = true 
         LIMIT 1) as primary_ip,
        -- Get all assigned IP addresses
        ARRAY(SELECT host(ip.ip_address)
              FROM device_ip_mappings dim 
              JOIN ip_addresses ip ON dim.ip_address_id = ip.id 
              WHERE dim.device_id = d.id) as assigned_ips,
        -- Get assigned contacts count
        (SELECT COUNT(DISTINCT da.contact_id)
         FROM device_assignments da
         JOIN contacts c ON da.contact_id = c.id
         WHERE da.device_id = d.id
        ) as contact_count,
        -- Get assigned contacts
        ARRAY(
          SELECT json_build_object(
            'id', da.id,
            'contact_id', da.contact_id,
            'name', c.name,
            'email', c.email,
            'role', da.role
          )
          FROM device_assignments da
          JOIN contacts c ON da.contact_id = c.id
          WHERE da.device_id = d.id
          ORDER BY da.role, da.created_at
        ) as assigned_contacts
      FROM devices d
      LEFT JOIN racks r ON d.rack_id = r.id
      LEFT JOIN server_rooms sr ON r.server_room_id = sr.id
      LEFT JOIN offices o ON sr.office_id = o.id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    // Get total count
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await query(`
      SELECT COUNT(*) as total 
      FROM devices d
      LEFT JOIN racks r ON d.rack_id = r.id
      LEFT JOIN server_rooms sr ON r.server_room_id = sr.id
      LEFT JOIN offices o ON sr.office_id = o.id
      ${whereClause}
    `, countParams);

    return NextResponse.json({
      success: true,
      devices: result.rows,
      total: parseInt(countResult.rows[0].total)
    });

  } catch (error) {
    console.error('Devices list error:', error);
    return NextResponse.json(
      { error: '디바이스 목록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/devices:
 *   post:
 *     summary: 새 디바이스 추가
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
 *               - device_type
 *             properties:
 *               name:
 *                 type: string
 *                 description: 디바이스명
 *               description:
 *                 type: string
 *                 description: 설명
 *               device_type:
 *                 type: string
 *                 description: 디바이스 타입
 *               manufacturer:
 *                 type: string
 *                 description: 제조사
 *               model:
 *                 type: string
 *                 description: 모델명
 *               serial_number:
 *                 type: string
 *                 description: 시리얼 번호
 *               rack_id:
 *                 type: string
 *                 description: 랙 ID
 *               rack_position:
 *                 type: integer
 *                 description: 랙 내 위치 (U)
 *               rack_size:
 *                 type: integer
 *                 description: 랙 사용 크기 (U)
 *               power_consumption:
 *                 type: integer
 *                 description: 전력 소비량 (W)
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance, decommissioned]
 *                 description: 상태
 *               purchase_date:
 *                 type: string
 *                 format: date
 *                 description: 구매일
 *               warranty_end:
 *                 type: string
 *                 format: date
 *                 description: 보증 종료일
 *     responses:
 *       201:
 *         description: 디바이스 생성 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API] Device creation started');
    
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
    const { 
      name, description, device_type, manufacturer, model, serial_number,
      rack_id, rack_position, rack_size, power_consumption, status,
      purchase_date, warranty_end
    } = body;

    if (!name || !device_type) {
      console.log('[API] Missing required fields:', { name, device_type });
      return NextResponse.json(
        { error: '디바이스명과 타입은 필수입니다.' },
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

    // If rack_id is provided, verify it belongs to user's tenant and check for space conflicts
    if (rack_id) {
      const rackCheck = await query(`
        SELECT r.id, r.size_u, r.used_u FROM racks r
        JOIN server_rooms sr ON r.server_room_id = sr.id
        JOIN offices o ON sr.office_id = o.id
        WHERE r.id = $1 AND o.tenant_id = $2
      `, [rack_id, tenantId]);

      if (rackCheck.rows.length === 0) {
        return NextResponse.json(
          { error: '선택한 랙을 찾을 수 없습니다.' },
          { status: 400 }
        );
      }

      const rack = rackCheck.rows[0];
      const deviceRackSize = rack_size || 1;

      // Check if rack has enough total space
      if (rack.used_u + deviceRackSize > rack.size_u) {
        return NextResponse.json(
          { error: `랙에 공간이 부족합니다. 사용 가능: ${rack.size_u - rack.used_u}U, 필요: ${deviceRackSize}U` },
          { status: 400 }
        );
      }

      // Check for position conflicts if rack_position is specified
      if (rack_position) {
        const positionConflict = await query(`
          SELECT d.name FROM devices d
          WHERE d.rack_id = $1 AND d.is_active = true
            AND d.rack_position IS NOT NULL
            AND (
              -- Check if positions overlap
              (d.rack_position <= $2 AND d.rack_position + d.rack_size - 1 >= $2) OR
              (d.rack_position <= $3 AND d.rack_position + d.rack_size - 1 >= $3) OR
              ($2 <= d.rack_position AND $3 >= d.rack_position + d.rack_size - 1)
            )
        `, [rack_id, rack_position, rack_position + deviceRackSize - 1]);

        if (positionConflict.rows.length > 0) {
          return NextResponse.json(
            { error: `랙 위치 ${rack_position}U에서 ${rack_position + deviceRackSize - 1}U까지는 이미 디바이스 "${positionConflict.rows[0].name}"가 할당되어 있습니다.` },
            { status: 400 }
          );
        }

        // Check if position is within rack bounds
        if (rack_position < 1 || rack_position + deviceRackSize - 1 > rack.size_u) {
          return NextResponse.json(
            { error: `랙 위치가 유효하지 않습니다. 랙 크기: ${rack.size_u}U, 요청된 위치: ${rack_position}U-${rack_position + deviceRackSize - 1}U` },
            { status: 400 }
          );
        }
      }
    }

    // Start transaction
    await query('BEGIN');
    
    try {
      // Create device
      console.log('[API] Creating device with params:', [
        rack_id, name, description, device_type, manufacturer, model, 
        serial_number, rack_position, rack_size || 1, power_consumption,
        status || 'active', purchase_date, warranty_end, user.userId
      ]);
      
      const result = await query(`
        INSERT INTO devices (
          rack_id, name, description, device_type, manufacturer, model,
          serial_number, rack_position, rack_size, power_consumption,
          status, purchase_date, warranty_end, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, name, description, device_type, manufacturer, model, 
                  serial_number, rack_position, rack_size, power_consumption,
                  status, purchase_date, warranty_end, created_at
      `, [
        rack_id, name, description, device_type, manufacturer, model, 
        serial_number, rack_position, rack_size || 1, power_consumption,
        status || 'active', purchase_date, warranty_end, user.userId
      ]);

      // Update rack used_u if rack_id is provided
      if (rack_id) {
        await query(`
          UPDATE racks 
          SET used_u = COALESCE((
            SELECT SUM(rack_size) 
            FROM devices 
            WHERE rack_id = $1 AND is_active = true
          ), 0)
          WHERE id = $1
        `, [rack_id]);
      }

      await query('COMMIT');
      
      console.log('[API] Device created successfully:', result.rows[0]);
      return NextResponse.json({
        success: true,
        device: result.rows[0]
      }, { status: 201 });
      
    } catch (transactionError) {
      await query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Device creation error:', error);
    return NextResponse.json(
      { error: '디바이스 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/devices:
 *   put:
 *     summary: 디바이스 정보 수정
 *     tags: [IPAM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 수정할 디바이스 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - device_type
 *             properties:
 *               name:
 *                 type: string
 *                 description: 디바이스명
 *               description:
 *                 type: string
 *                 description: 설명
 *               device_type:
 *                 type: string
 *                 description: 디바이스 타입
 *               manufacturer:
 *                 type: string
 *                 description: 제조사
 *               model:
 *                 type: string
 *                 description: 모델명
 *               serial_number:
 *                 type: string
 *                 description: 시리얼 번호
 *               rack_id:
 *                 type: string
 *                 description: 랙 ID
 *               rack_position:
 *                 type: integer
 *                 description: 랙 내 위치 (U)
 *               rack_size:
 *                 type: integer
 *                 description: 랙 사용 크기 (U)
 *               power_consumption:
 *                 type: integer
 *                 description: 전력 소비량 (W)
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance, decommissioned]
 *                 description: 상태
 *               purchase_date:
 *                 type: string
 *                 format: date
 *                 description: 구매일
 *               warranty_end:
 *                 type: string
 *                 format: date
 *                 description: 보증 종료일
 *     responses:
 *       200:
 *         description: 디바이스 수정 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 디바이스를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('id');

  if (!deviceId) {
    return NextResponse.json(
      { error: '디바이스 ID가 필요합니다.' },
      { status: 400 }
    );
  }

  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      name, description, device_type, manufacturer, model, serial_number,
      rack_id, rack_position, rack_size, power_consumption, status,
      purchase_date, warranty_end
    } = body;

    if (!name || !device_type) {
      return NextResponse.json(
        { error: '디바이스명과 타입은 필수입니다.' },
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

    // Check device exists and belongs to user's tenant
    const deviceCheck = await query(`
      SELECT d.id FROM devices d
      LEFT JOIN racks r ON d.rack_id = r.id
      LEFT JOIN server_rooms sr ON r.server_room_id = sr.id
      LEFT JOIN offices o ON sr.office_id = o.id
      WHERE d.id = $1 AND d.is_active = true
        AND (o.tenant_id = $2 OR d.rack_id IS NULL)
    `, [deviceId, tenantId]);

    if (deviceCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // If rack_id is provided, verify it belongs to user's tenant and check for space conflicts
    if (rack_id) {
      const rackCheck = await query(`
        SELECT r.id, r.size_u, r.used_u FROM racks r
        JOIN server_rooms sr ON r.server_room_id = sr.id
        JOIN offices o ON sr.office_id = o.id
        WHERE r.id = $1 AND o.tenant_id = $2
      `, [rack_id, tenantId]);

      if (rackCheck.rows.length === 0) {
        return NextResponse.json(
          { error: '선택한 랙을 찾을 수 없습니다.' },
          { status: 400 }
        );
      }

      const rack = rackCheck.rows[0];
      const deviceRackSize = rack_size || 1;

      // Get current device info to exclude from space calculations
      const currentDeviceInfo = await query(`
        SELECT rack_id, rack_size FROM devices WHERE id = $1
      `, [deviceId]);
      
      const currentDevice = currentDeviceInfo.rows[0];
      const currentRackSize = (currentDevice.rack_id === rack_id) ? (currentDevice.rack_size || 1) : 0;

      // Check if rack has enough total space (excluding current device if it's already in this rack)
      if (rack.used_u - currentRackSize + deviceRackSize > rack.size_u) {
        return NextResponse.json(
          { error: `랙에 공간이 부족합니다. 사용 가능: ${rack.size_u - rack.used_u + currentRackSize}U, 필요: ${deviceRackSize}U` },
          { status: 400 }
        );
      }

      // Check for position conflicts if rack_position is specified
      if (rack_position) {
        const positionConflict = await query(`
          SELECT d.name FROM devices d
          WHERE d.rack_id = $1 AND d.is_active = true
            AND d.id != $4
            AND d.rack_position IS NOT NULL
            AND (
              -- Check if positions overlap
              (d.rack_position <= $2 AND d.rack_position + d.rack_size - 1 >= $2) OR
              (d.rack_position <= $3 AND d.rack_position + d.rack_size - 1 >= $3) OR
              ($2 <= d.rack_position AND $3 >= d.rack_position + d.rack_size - 1)
            )
        `, [rack_id, rack_position, rack_position + deviceRackSize - 1, deviceId]);

        if (positionConflict.rows.length > 0) {
          return NextResponse.json(
            { error: `랙 위치 ${rack_position}U에서 ${rack_position + deviceRackSize - 1}U까지는 이미 디바이스 "${positionConflict.rows[0].name}"가 할당되어 있습니다.` },
            { status: 400 }
          );
        }

        // Check if position is within rack bounds
        if (rack_position < 1 || rack_position + deviceRackSize - 1 > rack.size_u) {
          return NextResponse.json(
            { error: `랙 위치가 유효하지 않습니다. 랙 크기: ${rack.size_u}U, 요청된 위치: ${rack_position}U-${rack_position + deviceRackSize - 1}U` },
            { status: 400 }
          );
        }
      }
    }

    // Get current device rack_id for comparison
    const currentDeviceResult = await query(`
      SELECT rack_id FROM devices WHERE id = $1
    `, [deviceId]);
    
    const currentRackId = currentDeviceResult.rows[0]?.rack_id;

    // Start transaction
    await query('BEGIN');
    
    try {
      // Update device
      const result = await query(`
        UPDATE devices SET
          rack_id = $1,
          name = $2,
          description = $3,
          device_type = $4,
          manufacturer = $5,
          model = $6,
          serial_number = $7,
          rack_position = $8,
          rack_size = $9,
          power_consumption = $10,
          status = $11,
          purchase_date = $12,
          warranty_end = $13,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $14
        RETURNING id, name, description, device_type, manufacturer, model, 
                  serial_number, rack_position, rack_size, power_consumption,
                  status, purchase_date, warranty_end, updated_at
      `, [
        rack_id, name, description, device_type, manufacturer, model, 
        serial_number, rack_position, rack_size || 1, power_consumption,
        status || 'active', purchase_date, warranty_end, deviceId
      ]);

      // Update rack used_u for both old and new racks if changed
      if (currentRackId !== rack_id) {
        // Update old rack if it exists
        if (currentRackId) {
          await query(`
            UPDATE racks 
            SET used_u = COALESCE((
              SELECT SUM(rack_size) 
              FROM devices 
              WHERE rack_id = $1 AND is_active = true
            ), 0)
            WHERE id = $1
          `, [currentRackId]);
        }
        
        // Update new rack if it exists
        if (rack_id) {
          await query(`
            UPDATE racks 
            SET used_u = COALESCE((
              SELECT SUM(rack_size) 
              FROM devices 
              WHERE rack_id = $1 AND is_active = true
            ), 0)
            WHERE id = $1
          `, [rack_id]);
        }
      }

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        device: result.rows[0]
      });
      
    } catch (transactionError) {
      await query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Device update error:', error);
    return NextResponse.json(
      { error: '디바이스 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/devices:
 *   delete:
 *     summary: 디바이스 삭제
 *     tags: [IPAM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 삭제할 디바이스 ID
 *     responses:
 *       200:
 *         description: 디바이스 삭제 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 디바이스를 찾을 수 없음
 *       409:
 *         description: 삭제할 수 없는 디바이스 (연결된 자원 존재)
 *       500:
 *         description: 서버 오류
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('id');

  if (!deviceId) {
    return NextResponse.json(
      { error: '디바이스 ID가 필요합니다.' },
      { status: 400 }
    );
  }

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

    // Check device exists and belongs to user's tenant
    const deviceCheck = await query(`
      SELECT d.id, d.name FROM devices d
      LEFT JOIN racks r ON d.rack_id = r.id
      LEFT JOIN server_rooms sr ON r.server_room_id = sr.id
      LEFT JOIN offices o ON sr.office_id = o.id
      WHERE d.id = $1 AND d.is_active = true
        AND (o.tenant_id = $2 OR d.rack_id IS NULL)
    `, [deviceId, tenantId]);

    if (deviceCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '디바이스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Check for IP mappings (safe deletion)
    const ipMappingCheck = await query(`
      SELECT COUNT(*) as count FROM device_ip_mappings WHERE device_id = $1
    `, [deviceId]);

    if (parseInt(ipMappingCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: '디바이스에 할당된 IP 주소가 있습니다. 먼저 IP 할당을 해제해주세요.' },
        { status: 409 }
      );
    }

    // Get device rack_id before deletion
    const deviceResult = await query(`
      SELECT rack_id FROM devices WHERE id = $1
    `, [deviceId]);
    
    const deviceRackId = deviceResult.rows[0]?.rack_id;

    // Start transaction
    await query('BEGIN');
    
    try {
      // Soft delete device (set is_active = false)
      await query(`
        UPDATE devices 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `, [deviceId]);

      // Update rack used_u if device was in a rack
      if (deviceRackId) {
        await query(`
          UPDATE racks 
          SET used_u = COALESCE((
            SELECT SUM(rack_size) 
            FROM devices 
            WHERE rack_id = $1 AND is_active = true
          ), 0)
          WHERE id = $1
        `, [deviceRackId]);
      }

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        message: '디바이스가 삭제되었습니다.'
      });
      
    } catch (transactionError) {
      await query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Device deletion error:', error);
    return NextResponse.json(
      { error: '디바이스 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}