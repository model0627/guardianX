import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken, getUserWithTenant } from '@/lib/auth';

/**
 * @swagger
 * /api/libraries:
 *   get:
 *     summary: 라이브러리 목록 조회
 *     tags: [Libraries]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: 라이브러리 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   version:
 *                     type: string
 *                   vendor:
 *                     type: string
 *                   product_type:
 *                     type: string
 *                   device_name:
 *                     type: string
 *                   process_name:
 *                     type: string
 *                   install_path:
 *                     type: string
 *                   install_date:
 *                     type: string
 *                   license_type:
 *                     type: string
 *                   license_expiry:
 *                     type: string
 *                   vulnerability_status:
 *                     type: string
 *                   linkedDevices:
 *                     type: array
 *                     items:
 *                       type: string
 *                   status:
 *                     type: string
 *                   description:
 *                     type: string
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 테넌트 정보가 토큰에 없으면 데이터베이스에서 가져오기
    if (!user.tenantId) {
      const userWithTenant = await getUserWithTenant(user.userId);
      if (!userWithTenant || !userWithTenant.tenantId) {
        return NextResponse.json({ error: 'No tenant selected' }, { status: 400 });
      }
      user.tenantId = userWithTenant.tenantId;
    }

    const result = await query(
      `SELECT 
        l.id, l.name, l.version, l.vendor, l.product_type,
        l.device_name, l.process_name, l.install_path, l.install_date,
        l.license_type, l.license_expiry, l.last_update,
        l.security_patch_level, l.vulnerability_status,
        l.cpu_usage, l.memory_usage, l.disk_usage,
        l.status, l.description, l.tags, l.created_at, l.updated_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', ld.device_id,
              'name', d.name
            )
          ) FILTER (WHERE ld.device_id IS NOT NULL),
          '[]'::json
        ) as linked_devices
      FROM libraries l
      LEFT JOIN library_devices ld ON l.id = ld.library_id
      LEFT JOIN devices d ON ld.device_id = d.id
      WHERE l.deleted_at IS NULL AND l.tenant_id = $1
      GROUP BY l.id, l.name, l.version, l.vendor, l.product_type,
               l.device_name, l.process_name, l.install_path, l.install_date,
               l.license_type, l.license_expiry, l.last_update,
               l.security_patch_level, l.vulnerability_status,
               l.cpu_usage, l.memory_usage, l.disk_usage,
               l.status, l.description, l.tags, l.created_at, l.updated_at
      ORDER BY l.created_at DESC`,
      [user.tenantId]
    );

    const libraries = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      version: row.version || '-',
      vendor: row.vendor || '-',
      type: row.product_type || 'software',
      product_type: row.product_type || 'software',
      device_name: row.device_name || '',
      process_name: row.process_name || '',
      install_path: row.install_path || '',
      install_date: row.install_date || '',
      license_type: row.license_type || '',
      license_expiry: row.license_expiry || '',
      last_update: row.last_update || '',
      security_patch_level: row.security_patch_level || '',
      vulnerability_status: row.vulnerability_status || 'unknown',
      cpu_usage: row.cpu_usage || 0,
      memory_usage: row.memory_usage || 0,
      disk_usage: row.disk_usage || 0,
      linkedDevices: row.linked_devices
        .filter((d: any) => d.id)
        .map((d: any) => d.name),
      apiLinks: 'API 동기화',
      status: row.status || 'active',
      description: row.description || '',
      tags: row.tags || []
    }));

    return NextResponse.json(libraries);
  } catch (error) {
    console.error('Error fetching libraries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch libraries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, version, vendor, type } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Library name is required' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO libraries (name, version, vendor, type, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, version, vendor, type || 'software', user.userId]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating library:', error);
    return NextResponse.json(
      { error: 'Failed to create library' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      id,
      name, 
      version, 
      vendor, 
      type,
      product_type,
      device_name,
      process_name,
      install_path,
      install_date,
      license_type,
      license_expiry,
      security_patch_level,
      vulnerability_status,
      cpu_usage,
      memory_usage,
      disk_usage,
      status,
      description,
      tags
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Library ID is required' },
        { status: 400 }
      );
    }

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Library name is required' },
        { status: 400 }
      );
    }

    // Validate CPU usage
    if (cpu_usage !== null && cpu_usage !== undefined && (cpu_usage < 0 || cpu_usage > 100)) {
      return NextResponse.json(
        { error: 'CPU usage must be between 0 and 100' },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE libraries 
       SET name = $1, version = $2, vendor = $3, type = $4,
           product_type = $5, device_name = $6, process_name = $7,
           install_path = $8, install_date = $9, license_type = $10,
           license_expiry = $11, security_patch_level = $12,
           vulnerability_status = $13, cpu_usage = $14, memory_usage = $15,
           disk_usage = $16, status = $17, description = $18, tags = $19,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $20 AND deleted_at IS NULL
       RETURNING *`,
      [
        name.trim(),
        version || '',
        vendor || '',
        type || 'software',
        product_type || 'software',
        device_name || '',
        process_name || '',
        install_path || '',
        install_date || null,
        license_type || '',
        license_expiry || null,
        security_patch_level || '',
        vulnerability_status || 'unknown',
        cpu_usage || null,
        memory_usage || null,
        disk_usage || null,
        status || 'active',
        description || '',
        tags || [],
        id
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Library not found or already deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '라이브러리가 성공적으로 업데이트되었습니다.',
      library: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating library:', error);
    return NextResponse.json(
      { error: 'Failed to update library' },
      { status: 500 }
    );
  }
}