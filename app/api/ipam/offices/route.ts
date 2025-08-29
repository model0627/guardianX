import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/ipam/offices:
 *   get:
 *     summary: 사무실 목록 조회
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
 *     responses:
 *       200:
 *         description: 사무실 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 offices:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       address:
 *                         type: string
 *                       contact_person:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       email:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                       server_rooms_count:
 *                         type: integer
 *                       devices_count:
 *                         type: integer
 *                 total:
 *                   type: integer
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const officeId = searchParams.get('id');
  
  // If ID is provided, return single office detail
  if (officeId) {
    try {
      console.log('[API DEBUG] Office detail requested for ID:', officeId);
      
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

      // Get office details
      const result = await query(`
        SELECT 
          id, name, description, address, contact_person, phone, email, created_at, updated_at
        FROM offices 
        WHERE id = $1 AND tenant_id = $2
      `, [officeId, tenantId]);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: '사무실을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      // Add counts (simplified for now)
      const office = {
        ...result.rows[0],
        server_rooms_count: 0,
        devices_count: 0
      };

      return NextResponse.json({
        success: true,
        office: office
      });

    } catch (error) {
      console.error('[API] Office detail error:', error);
      return NextResponse.json(
        { error: '사무실 상세 정보 조회에 실패했습니다.' },
        { status: 500 }
      );
    }
  }
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 현재 사용자의 테넌트 ID 가져오기
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

    // 사무실 목록 조회 (서버실 및 디바이스 수 포함)
    const result = await query(`
      SELECT 
        o.id,
        o.name,
        o.description,
        o.address,
        o.contact_person,
        o.phone,
        o.email,
        o.created_at,
        COUNT(DISTINCT sr.id) as server_rooms_count,
        COUNT(DISTINCT d.id) as devices_count
      FROM offices o
      LEFT JOIN server_rooms sr ON o.id = sr.office_id
      LEFT JOIN racks r ON sr.id = r.server_room_id
      LEFT JOIN devices d ON r.id = d.rack_id
      WHERE o.tenant_id = $1
      GROUP BY o.id, o.name, o.description, o.address, o.contact_person, o.phone, o.email, o.created_at
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `, [tenantId, limit, offset]);

    // 총 개수 조회
    const countResult = await query(`
      SELECT COUNT(*) as total FROM offices WHERE tenant_id = $1
    `, [tenantId]);

    return NextResponse.json({
      success: true,
      offices: result.rows,
      total: parseInt(countResult.rows[0].total)
    });

  } catch (error) {
    console.error('Office list error:', error);
    return NextResponse.json(
      { error: '사무실 목록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/offices:
 *   post:
 *     summary: 새 사무실 추가
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
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *                 description: 사무실명
 *               description:
 *                 type: string
 *                 description: 사무실 설명
 *               address:
 *                 type: string
 *                 description: 사무실 주소
 *               contact_person:
 *                 type: string
 *                 description: 담당자명
 *               phone:
 *                 type: string
 *                 description: 전화번호
 *               email:
 *                 type: string
 *                 description: 이메일
 *     responses:
 *       201:
 *         description: 사무실 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 office:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     address:
 *                       type: string
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
    const { name, description, address, contact_person, phone, email } = body;

    if (!name || !address) {
      return NextResponse.json(
        { error: '사무실명과 주소는 필수입니다.' },
        { status: 400 }
      );
    }

    // 현재 사용자의 테넌트 ID 가져오기
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

    // 사무실 추가
    const result = await query(`
      INSERT INTO offices (tenant_id, name, description, address, contact_person, phone, email, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, description, address, contact_person, phone, email, created_at
    `, [tenantId, name, description, address, contact_person, phone, email, user.userId]);

    return NextResponse.json({
      success: true,
      office: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Office creation error:', error);
    return NextResponse.json(
      { error: '사무실 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/offices:
 *   put:
 *     summary: 사무실 정보 수정
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
 *               - address
 *             properties:
 *               id:
 *                 type: string
 *                 description: 사무실 ID
 *               name:
 *                 type: string
 *                 description: 사무실명
 *               description:
 *                 type: string
 *                 description: 사무실 설명
 *               address:
 *                 type: string
 *                 description: 사무실 주소
 *               contact_person:
 *                 type: string
 *                 description: 담당자명
 *               phone:
 *                 type: string
 *                 description: 전화번호
 *               email:
 *                 type: string
 *                 description: 이메일
 *     responses:
 *       200:
 *         description: 사무실 수정 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 사무실을 찾을 수 없음
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
    const { id, name, description, address, contact_person, phone, email } = body;

    if (!id || !name || !address) {
      return NextResponse.json(
        { error: '사무실 ID, 사무실명, 주소는 필수입니다.' },
        { status: 400 }
      );
    }

    // 현재 사용자의 테넌트 ID 가져오기
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

    // 사무실이 현재 테넌트에 속하는지 확인
    const officeCheck = await query(`
      SELECT id FROM offices WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (officeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '사무실을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 사무실 정보 수정
    const result = await query(`
      UPDATE offices 
      SET name = $1, description = $2, address = $3, contact_person = $4, phone = $5, email = $6, updated_at = NOW()
      WHERE id = $7 AND tenant_id = $8
      RETURNING id, name, description, address, contact_person, phone, email, created_at, updated_at
    `, [name, description, address, contact_person, phone, email, id, tenantId]);

    return NextResponse.json({
      success: true,
      office: result.rows[0]
    });

  } catch (error) {
    console.error('Office update error:', error);
    return NextResponse.json(
      { error: '사무실 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/ipam/offices:
 *   delete:
 *     summary: 사무실 삭제
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
 *                 description: 삭제할 사무실 ID
 *     responses:
 *       200:
 *         description: 사무실 삭제 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 사무실을 찾을 수 없음
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
        { error: '사무실 ID는 필수입니다.' },
        { status: 400 }
      );
    }

    // 현재 사용자의 테넌트 ID 가져오기
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

    // 사무실이 현재 테넌트에 속하는지 확인
    const officeCheck = await query(`
      SELECT id, name FROM offices WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (officeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: '사무실을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 서버실이 있는지 확인 (연관된 데이터 체크)
    const serverRoomsCheck = await query(`
      SELECT COUNT(*) as count FROM server_rooms WHERE office_id = $1
    `, [id]);

    if (parseInt(serverRoomsCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: '이 사무실에 연결된 서버실이 있어 삭제할 수 없습니다. 먼저 서버실을 삭제해주세요.' },
        { status: 409 }
      );
    }

    // 사무실 삭제
    await query(`
      DELETE FROM offices WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    return NextResponse.json({
      success: true,
      message: `사무실 '${officeCheck.rows[0].name}'이(가) 성공적으로 삭제되었습니다.`
    });

  } catch (error) {
    console.error('Office deletion error:', error);
    return NextResponse.json(
      { error: '사무실 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}