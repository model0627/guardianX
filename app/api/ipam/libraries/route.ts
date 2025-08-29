import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/ipam/libraries:
 *   get:
 *     summary: 라이브러리 목록 조회
 *     tags: [IPAM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: device_id
 *         schema:
 *           type: string
 *         description: 특정 디바이스의 라이브러리만 조회
 *     responses:
 *       200:
 *         description: 라이브러리 목록 조회 성공
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
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('device_id');

    let librariesQuery = `
      SELECT 
        l.*,
        d.name as device_display_name,
        d.device_type,
        d.status as device_status,
        u1.email as created_by_email,
        ac.name as api_connection_name,
        u2.email as updated_by_email,
        COUNT(dl.device_id) as connected_devices
      FROM libraries l
      LEFT JOIN devices d ON l.device_id = d.id
      LEFT JOIN device_libraries dl ON l.id = dl.library_id AND dl.is_active = true
      LEFT JOIN users u1 ON l.created_by = u1.id
      LEFT JOIN users u2 ON l.updated_by = u2.id
      LEFT JOIN api_connections ac ON l.api_connection_id = ac.id
      WHERE l.tenant_id = $1 AND l.is_active = true
    `;

    const queryParams: any[] = [tenantId];

    if (deviceId) {
      librariesQuery += ` AND (l.device_id = $2 OR dl.device_id = $2)`;
      queryParams.push(deviceId);
    }

    librariesQuery += ` 
      GROUP BY l.id, d.name, d.device_type, d.status, u1.email, u2.email, ac.name
      ORDER BY l.name, l.version DESC
    `;

    const result = await query(librariesQuery, queryParams);

    return NextResponse.json({
      success: true,
      libraries: result.rows
    });

  } catch (error) {
    console.error('Get libraries error:', error);
    return NextResponse.json(
      { error: '라이브러리 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/libraries:
 *   post:
 *     summary: 새 라이브러리 생성
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
 *             properties:
 *               name:
 *                 type: string
 *               version:
 *                 type: string
 *               vendor:
 *                 type: string
 *               product_type:
 *                 type: string
 *               device_id:
 *                 type: string
 *               process_name:
 *                 type: string
 *               install_path:
 *                 type: string
 *               license_type:
 *                 type: string
 *               license_key:
 *                 type: string
 *               license_expiry:
 *                 type: string
 *               api_endpoint:
 *                 type: string
 *               api_key:
 *                 type: string
 *               status:
 *                 type: string
 *               description:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: 라이브러리 생성 성공
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

    const body = await request.json();
    const {
      name,
      version,
      vendor,
      product_type = 'software',
      device_id,
      process_name,
      install_path,
      install_date,
      license_type,
      license_key,
      license_expiry,
      api_endpoint,
      api_key,
      status = 'active',
      description,
      notes,
      tags
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: '라이브러리 이름은 필수입니다.' },
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

    // If device_id is provided, verify it belongs to the tenant
    let deviceName = null;
    if (device_id) {
      const deviceCheck = await query(`
        SELECT name FROM devices 
        WHERE id = $1 AND tenant_id = $2 AND is_active = true
      `, [device_id, tenantId]);

      if (deviceCheck.rows.length === 0) {
        return NextResponse.json(
          { error: '유효하지 않은 디바이스입니다.' },
          { status: 400 }
        );
      }
      deviceName = deviceCheck.rows[0].name;
    }

    // Create the library
    const insertResult = await query(`
      INSERT INTO libraries (
        tenant_id, name, version, vendor, product_type,
        device_id, device_name, process_name, install_path, install_date,
        license_type, license_key, license_expiry,
        api_endpoint, api_key, status, description, notes, tags,
        created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13,
        $14, $15, $16, $17, $18, $19,
        $20, $20
      ) RETURNING *
    `, [
      tenantId, name, version, vendor, product_type,
      device_id, deviceName, process_name, install_path, install_date,
      license_type, license_key, license_expiry,
      api_endpoint, api_key, status, description, notes, tags,
      user.userId
    ]);

    const newLibrary = insertResult.rows[0];

    // If device_id is provided, also create a device_libraries entry
    if (device_id) {
      await query(`
        INSERT INTO device_libraries (device_id, library_id, tenant_id, installed_by, install_path)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (device_id, library_id) DO UPDATE 
        SET is_active = true, installed_at = CURRENT_TIMESTAMP
      `, [device_id, newLibrary.id, tenantId, user.userId, install_path]);
    }

    // Log history
    await query(`
      INSERT INTO library_history (library_id, device_id, action, new_status, performed_by, notes)
      VALUES ($1, $2, 'installed', $3, $4, $5)
    `, [newLibrary.id, device_id, status, user.userId, `라이브러리 생성: ${name} ${version || ''}`]);

    console.log(`[API] Library created: ${name} by user ${user.userId}`);

    return NextResponse.json({
      success: true,
      library: newLibrary,
      message: '라이브러리가 성공적으로 생성되었습니다.'
    }, { status: 201 });

  } catch (error) {
    console.error('Create library error:', error);
    return NextResponse.json(
      { error: '라이브러리 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/libraries:
 *   put:
 *     summary: 라이브러리 정보 수정
 *     tags: [IPAM]
 *     security:
 *       - bearerAuth: []
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
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: '라이브러리 ID가 필요합니다.' },
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

    // Verify library belongs to tenant
    const libraryCheck = await query(`
      SELECT * FROM libraries WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (libraryCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '라이브러리를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const oldLibrary = libraryCheck.rows[0];

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'version', 'vendor', 'product_type', 'device_id',
      'process_name', 'install_path', 'install_date',
      'license_type', 'license_key', 'license_expiry',
      'api_endpoint', 'api_key', 'api_status',
      'cpu_usage', 'memory_usage', 'disk_usage',
      'status', 'vulnerability_status', 'description', 'notes', 'tags'
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount}`);
        updateValues.push(updateData[field]);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: '수정할 내용이 없습니다.' },
        { status: 400 }
      );
    }

    updateFields.push(`updated_by = $${paramCount}`);
    updateValues.push(user.userId);
    paramCount++;

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    updateValues.push(id);
    updateValues.push(tenantId);

    const updateQuery = `
      UPDATE libraries 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
      RETURNING *
    `;

    const updateResult = await query(updateQuery, updateValues);

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { error: '라이브러리 수정에 실패했습니다.' },
        { status: 500 }
      );
    }

    // Log history if version or status changed
    if (updateData.version && updateData.version !== oldLibrary.version) {
      await query(`
        INSERT INTO library_history (library_id, device_id, action, old_version, new_version, performed_by)
        VALUES ($1, $2, 'updated', $3, $4, $5)
      `, [id, oldLibrary.device_id, oldLibrary.version, updateData.version, user.userId]);
    }

    if (updateData.status && updateData.status !== oldLibrary.status) {
      await query(`
        INSERT INTO library_history (library_id, device_id, action, old_status, new_status, performed_by)
        VALUES ($1, $2, 'status_changed', $3, $4, $5)
      `, [id, oldLibrary.device_id, oldLibrary.status, updateData.status, user.userId]);
    }

    console.log(`[API] Library updated: ${id} by user ${user.userId}`);

    return NextResponse.json({
      success: true,
      library: updateResult.rows[0],
      message: '라이브러리가 성공적으로 수정되었습니다.'
    });

  } catch (error) {
    console.error('Update library error:', error);
    return NextResponse.json(
      { error: '라이브러리 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/libraries:
 *   delete:
 *     summary: 라이브러리 삭제
 *     tags: [IPAM]
 *     security:
 *       - bearerAuth: []
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

    const { searchParams } = new URL(request.url);
    const libraryId = searchParams.get('id');

    if (!libraryId) {
      return NextResponse.json(
        { error: '라이브러리 ID가 필요합니다.' },
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

    // Verify library belongs to tenant
    const libraryCheck = await query(`
      SELECT * FROM libraries WHERE id = $1 AND tenant_id = $2
    `, [libraryId, tenantId]);

    if (libraryCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '라이브러리를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const library = libraryCheck.rows[0];

    // Soft delete the library
    await query(`
      UPDATE libraries 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP, updated_by = $3
      WHERE id = $1 AND tenant_id = $2
    `, [libraryId, tenantId, user.userId]);

    // Also deactivate device_libraries entries
    await query(`
      UPDATE device_libraries 
      SET is_active = false 
      WHERE library_id = $1
    `, [libraryId]);

    // Log history
    await query(`
      INSERT INTO library_history (library_id, device_id, action, performed_by, notes)
      VALUES ($1, $2, 'removed', $3, $4)
    `, [libraryId, library.device_id, user.userId, `라이브러리 삭제: ${library.name}`]);

    console.log(`[API] Library deleted: ${libraryId} by user ${user.userId}`);

    return NextResponse.json({
      success: true,
      message: '라이브러리가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('Delete library error:', error);
    return NextResponse.json(
      { error: '라이브러리 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}