import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/soar/events:
 *   get:
 *     summary: SOAR 위협 이벤트 목록 조회
 *     tags: [SOAR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [critical, high, medium, low]
 *         description: 심각도 필터
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, investigating, resolved, false_positive]
 *         description: 상태 필터
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 결과 개수 제한
 *     responses:
 *       200:
 *         description: 위협 이벤트 목록 조회 성공
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
      SELECT id, email, current_tenant_id FROM users WHERE id = $1
    `, [user.userId]);

    if (userResult.rows.length === 0 || !userResult.rows[0].current_tenant_id) {
      return NextResponse.json(
        { error: '테넌트 정보를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    const tenantId = userResult.rows[0].current_tenant_id;
    const { searchParams } = new URL(request.url);
    
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query with filters
    let whereClause = 'WHERE se.tenant_id = $1';
    const queryParams: any[] = [tenantId];
    let paramIndex = 2;

    if (severity) {
      whereClause += ` AND se.severity = $${paramIndex}`;
      queryParams.push(severity);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND se.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    const result = await query(`
      SELECT 
        se.id,
        se.timestamp,
        se.severity,
        se.event_type,
        se.source_ip,
        se.target_ip,
        se.description,
        se.status,
        se.automated_response,
        se.response_time,
        d.name as target_device,
        l.name as library_affected,
        se.created_at,
        se.updated_at
      FROM security_events se
      LEFT JOIN devices d ON se.target_device_id = d.id
      LEFT JOIN libraries l ON se.library_id = l.id
      ${whereClause}
      ORDER BY se.timestamp DESC, se.created_at DESC
      LIMIT $${paramIndex}
    `, [...queryParams, limit]);

    const events = result.rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      severity: row.severity,
      type: row.event_type,
      source_ip: row.source_ip,
      target_ip: row.target_ip,
      target_device: row.target_device,
      library_affected: row.library_affected,
      description: row.description,
      status: row.status,
      automated_response: row.automated_response,
      response_time: row.response_time,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      events,
      total: events.length
    });

  } catch (error) {
    console.error('SOAR events error:', error);
    return NextResponse.json(
      { error: '위협 이벤트 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/soar/events:
 *   post:
 *     summary: 새 위협 이벤트 생성
 *     tags: [SOAR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - severity
 *               - event_type
 *               - source_ip
 *               - target_ip
 *               - description
 *             properties:
 *               severity:
 *                 type: string
 *                 enum: [critical, high, medium, low]
 *               event_type:
 *                 type: string
 *               source_ip:
 *                 type: string
 *               target_ip:
 *                 type: string
 *               target_device_id:
 *                 type: string
 *               library_id:
 *                 type: string
 *               description:
 *                 type: string
 *               automated_response:
 *                 type: string
 *     responses:
 *       201:
 *         description: 위협 이벤트 생성 성공
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

    // Get current user's tenant ID
    const userResult = await query(`
      SELECT id, email, current_tenant_id FROM users WHERE id = $1
    `, [user.userId]);

    if (userResult.rows.length === 0 || !userResult.rows[0].current_tenant_id) {
      return NextResponse.json(
        { error: '테넌트 정보를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    const tenantId = userResult.rows[0].current_tenant_id;
    const body = await request.json();
    
    const {
      severity,
      event_type,
      source_ip,
      target_ip,
      target_device_id,
      library_id,
      description,
      automated_response
    } = body;

    if (!severity || !event_type || !source_ip || !target_ip || !description) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const result = await query(`
      INSERT INTO security_events (
        tenant_id, severity, event_type, source_ip, target_ip,
        target_device_id, library_id, description, automated_response,
        status, timestamp, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 'new', NOW(), $10
      )
      RETURNING id, timestamp, created_at
    `, [
      tenantId, severity, event_type, source_ip, target_ip,
      target_device_id, library_id, description, automated_response,
      user.userId
    ]);

    return NextResponse.json({
      success: true,
      event: {
        id: result.rows[0].id,
        timestamp: result.rows[0].timestamp,
        created_at: result.rows[0].created_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('SOAR event creation error:', error);
    return NextResponse.json(
      { error: '위협 이벤트 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}