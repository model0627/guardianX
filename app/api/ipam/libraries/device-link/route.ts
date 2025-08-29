import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/ipam/libraries/device-link:
 *   post:
 *     summary: 라이브러리를 디바이스에 연결
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
 *               - library_id
 *               - device_id
 *             properties:
 *               library_id:
 *                 type: string
 *               device_id:
 *                 type: string
 *               install_path:
 *                 type: string
 *               configuration:
 *                 type: string
 *               is_primary:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: 연결 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       409:
 *         description: 이미 연결됨
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
    const { library_id, device_id, install_path, configuration, is_primary = false } = body;

    if (!library_id || !device_id) {
      return NextResponse.json(
        { error: '라이브러리 ID와 디바이스 ID가 필요합니다.' },
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

    // Verify library and device belong to the same tenant
    const verifyResult = await query(`
      SELECT 
        l.id as library_id, l.name as library_name,
        d.id as device_id, d.name as device_name
      FROM libraries l, devices d
      WHERE l.id = $1 AND d.id = $2 
        AND l.tenant_id = $3 AND d.tenant_id = $3
        AND l.is_active = true AND d.is_active = true
    `, [library_id, device_id, tenantId]);

    if (verifyResult.rows.length === 0) {
      return NextResponse.json(
        { error: '유효하지 않은 라이브러리 또는 디바이스입니다.' },
        { status: 400 }
      );
    }

    const { library_name, device_name } = verifyResult.rows[0];

    // Check if already linked
    const existingLink = await query(`
      SELECT * FROM device_libraries 
      WHERE device_id = $1 AND library_id = $2
    `, [device_id, library_id]);

    if (existingLink.rows.length > 0) {
      if (existingLink.rows[0].is_active) {
        return NextResponse.json(
          { error: '이미 연결된 라이브러리입니다.' },
          { status: 409 }
        );
      } else {
        // Reactivate existing link
        await query(`
          UPDATE device_libraries 
          SET is_active = true, 
              installed_at = CURRENT_TIMESTAMP, 
              installed_by = $3,
              install_path = $4,
              configuration = $5,
              is_primary = $6
          WHERE device_id = $1 AND library_id = $2
        `, [device_id, library_id, user.userId, install_path, configuration, is_primary]);
      }
    } else {
      // Create new link
      await query(`
        INSERT INTO device_libraries (
          device_id, library_id, tenant_id, installed_by, 
          install_path, configuration, is_primary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [device_id, library_id, tenantId, user.userId, install_path, configuration, is_primary]);
    }

    // If is_primary is true, unset other primary libraries for this device
    if (is_primary) {
      await query(`
        UPDATE device_libraries 
        SET is_primary = false 
        WHERE device_id = $1 AND library_id != $2
      `, [device_id, library_id]);
    }

    // Update library's primary device if not set
    await query(`
      UPDATE libraries 
      SET device_id = $2, device_name = $3
      WHERE id = $1 AND device_id IS NULL
    `, [library_id, device_id, device_name]);

    // Log history
    await query(`
      INSERT INTO library_history (library_id, device_id, action, performed_by, notes)
      VALUES ($1, $2, 'installed', $3, $4)
    `, [library_id, device_id, user.userId, `${library_name} installed on ${device_name}`]);

    console.log(`[API] Library ${library_id} linked to device ${device_id} by user ${user.userId}`);

    return NextResponse.json({
      success: true,
      message: '라이브러리가 디바이스에 성공적으로 연결되었습니다.'
    }, { status: 201 });

  } catch (error) {
    console.error('Link library to device error:', error);
    return NextResponse.json(
      { error: '라이브러리 연결에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/libraries/device-link:
 *   delete:
 *     summary: 라이브러리와 디바이스 연결 해제
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
    const libraryId = searchParams.get('library_id');
    const deviceId = searchParams.get('device_id');

    if (!libraryId || !deviceId) {
      return NextResponse.json(
        { error: '라이브러리 ID와 디바이스 ID가 필요합니다.' },
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

    // Verify the link exists and belongs to tenant
    const linkCheck = await query(`
      SELECT dl.*, l.name as library_name, d.name as device_name
      FROM device_libraries dl
      JOIN libraries l ON dl.library_id = l.id
      JOIN devices d ON dl.device_id = d.id
      WHERE dl.library_id = $1 AND dl.device_id = $2 AND dl.tenant_id = $3
    `, [libraryId, deviceId, tenantId]);

    if (linkCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '연결 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const { library_name, device_name } = linkCheck.rows[0];

    // Soft delete the link
    await query(`
      UPDATE device_libraries 
      SET is_active = false, last_checked = CURRENT_TIMESTAMP
      WHERE library_id = $1 AND device_id = $2
    `, [libraryId, deviceId]);

    // Log history
    await query(`
      INSERT INTO library_history (library_id, device_id, action, performed_by, notes)
      VALUES ($1, $2, 'removed', $3, $4)
    `, [libraryId, deviceId, user.userId, `${library_name} removed from ${device_name}`]);

    console.log(`[API] Library ${libraryId} unlinked from device ${deviceId} by user ${user.userId}`);

    return NextResponse.json({
      success: true,
      message: '라이브러리 연결이 해제되었습니다.'
    });

  } catch (error) {
    console.error('Unlink library from device error:', error);
    return NextResponse.json(
      { error: '라이브러리 연결 해제에 실패했습니다.' },
      { status: 500 }
    );
  }
}