import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

/**
 * @swagger
 * /api/api-connections:
 *   get:
 *     summary: API 연결 목록 조회
 *     tags: [API Connections]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: sync_target
 *         schema:
 *           type: string
 *           enum: [devices, libraries, contacts]
 *         description: 동기화 대상 필터
 *     responses:
 *       200:
 *         description: API 연결 목록
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
 *                   api_url:
 *                     type: string
 *                   connection_type:
 *                     type: string
 *                   sync_target:
 *                     type: string
 *                   auto_sync_enabled:
 *                     type: boolean
 *                   sync_frequency_minutes:
 *                     type: integer
 *                   last_sync:
 *                     type: string
 *                     format: date-time
 *                   last_sync_status:
 *                     type: string
 *                   last_sync_message:
 *                     type: string
 *                   last_sync_info:
 *                     type: object
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       400:
 *         description: Tenant information not found
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const syncTarget = searchParams.get('sync_target');

    // Get user's tenant ID
    const userResult = await query(
      'SELECT current_tenant_id FROM users WHERE id = $1',
      [user.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].current_tenant_id) {
      return NextResponse.json(
        { error: 'Tenant information not found' },
        { status: 400 }
      );
    }

    const tenantId = userResult.rows[0].current_tenant_id;

    // Build query with optional sync_target filter
    let whereClause = 'ac.tenant_id = $1 AND ac.is_active = true';
    let queryParams = [tenantId];

    if (syncTarget) {
      whereClause += ' AND COALESCE(ac.sync_target, \'libraries\') = $2';
      queryParams.push(syncTarget);
    }

    // Get API connections with sync history
    const result = await query(
      `SELECT 
        ac.*,
        COALESCE(
          (SELECT json_build_object(
            'last_sync_time', sh.sync_completed_at,
            'status', sh.status,
            'records_processed', sh.records_processed,
            'records_added', sh.records_added,
            'records_updated', sh.records_updated,
            'records_deactivated', sh.records_deactivated
          )
          FROM sync_history sh 
          WHERE sh.api_connection_id = ac.id 
          ORDER BY sh.sync_started_at DESC 
          LIMIT 1),
          '{}'::json
        ) as last_sync_info
      FROM api_connections ac
      WHERE ${whereClause}
      ORDER BY ac.created_at DESC`,
      queryParams
    );

    return NextResponse.json(result.rows);

  } catch (error) {
    console.error('Error fetching API connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API connections' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/api-connections:
 *   post:
 *     summary: 새 API 연결 생성
 *     tags: [API Connections]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - api_url
 *             properties:
 *               name:
 *                 type: string
 *                 description: 연결 이름
 *               api_url:
 *                 type: string
 *                 description: API URL 또는 Google Sheets URL
 *               connection_type:
 *                 type: string
 *                 enum: ['REST API', 'google_sheets']
 *                 description: 연결 타입
 *               sync_target:
 *                 type: string
 *                 enum: [devices, libraries, contacts]
 *                 description: 동기화 대상
 *               description:
 *                 type: string
 *                 description: 설명
 *               headers:
 *                 type: object
 *                 description: HTTP 헤더
 *               auto_sync_enabled:
 *                 type: boolean
 *                 description: 자동 동기화 활성화
 *               sync_frequency_minutes:
 *                 type: integer
 *                 description: 동기화 주기 (분)
 *               sync_frequency_type:
 *                 type: string
 *                 enum: [manual, minutes, hours, days]
 *               field_mappings:
 *                 type: object
 *                 description: 필드 매핑
 *               sheet_name:
 *                 type: string
 *                 description: Google Sheets 시트 이름
 *               range_notation:
 *                 type: string
 *                 description: Google Sheets 범위
 *               google_auth_type:
 *                 type: string
 *                 description: Google 인증 타입
 *     responses:
 *       200:
 *         description: API 연결 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Name and API URL are required
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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

    const { 
      name, 
      api_url, 
      connection_type, 
      sync_target,
      description,
      headers,
      auto_sync_enabled,
      sync_frequency_minutes,
      sync_frequency_type,
      field_mappings,
      // Google Sheets specific fields
      spreadsheet_url,
      spreadsheet_id,
      sheet_name,
      range_notation,
      google_auth_type
    } = await request.json();

    if (!name || !api_url) {
      return NextResponse.json(
        { error: 'Name and API URL are required' },
        { status: 400 }
      );
    }

    // Get user's tenant ID
    const userResult = await query(
      'SELECT current_tenant_id FROM users WHERE id = $1',
      [user.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].current_tenant_id) {
      return NextResponse.json(
        { error: 'Tenant information not found' },
        { status: 400 }
      );
    }

    const tenantId = userResult.rows[0].current_tenant_id;

    const result = await query(
      `INSERT INTO api_connections (
        name, api_url, connection_type, sync_target, headers,
        auto_sync_enabled, sync_frequency_minutes, sync_frequency_type,
        field_mappings, tenant_id, created_by, description,
        sheet_name, range_notation
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        name,
        api_url,
        connection_type || 'REST API',
        sync_target || 'libraries',
        JSON.stringify(headers || {}),
        auto_sync_enabled || false,
        sync_frequency_minutes || 5,
        sync_frequency_type || 'minutes',
        JSON.stringify(field_mappings || {}),
        tenantId,
        user.userId,
        description || '',
        sheet_name || '',
        range_notation || 'A:Z'
      ]
    );

    const apiConnectionId = result.rows[0].id;

    // Google Sheets 연결인 경우 추가 정보 저장
    if (connection_type === 'google_sheets' && google_auth_type === 'oauth') {
      // 사용자의 Google 계정 정보 확인
      const googleAccountResult = await query(
        'SELECT id FROM google_accounts WHERE user_id = $1',
        [user.userId]
      );

      if (googleAccountResult.rows.length === 0) {
        // API 연결은 생성되었지만 Google 계정이 연결되지 않음을 알림
        return NextResponse.json({
          ...result.rows[0],
          warning: 'API 연결이 생성되었지만 Google 계정을 먼저 연결해주세요.'
        }, { status: 201 });
      }

      const googleAccountId = googleAccountResult.rows[0].id;

      // Google Sheets 연결 정보 저장
      await query(
        `INSERT INTO google_sheets_connections (
          api_connection_id, spreadsheet_id, spreadsheet_name, 
          sheet_name, range_notation, auth_type, google_account_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          apiConnectionId,
          spreadsheet_id || '',
          name, // 스프레드시트 이름으로 연결 이름 사용
          sheet_name || '',
          range_notation || 'A:Z',
          'oauth',
          googleAccountId
        ]
      );
    } else if (connection_type === 'google_sheets') {
      // 공개 스프레드시트인 경우
      const extractedId = extractSpreadsheetId(spreadsheet_url || api_url);
      
      await query(
        `INSERT INTO google_sheets_connections (
          api_connection_id, spreadsheet_url, spreadsheet_id, 
          spreadsheet_name, sheet_name, range_notation, auth_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          apiConnectionId,
          spreadsheet_url || api_url,
          extractedId,
          name,
          sheet_name || '',
          range_notation || 'A:Z',
          'public'
        ]
      );
    }

    return NextResponse.json(result.rows[0], { status: 201 });

  } catch (error) {
    console.error('Error creating API connection:', error);
    return NextResponse.json(
      { error: 'Failed to create API connection' },
      { status: 500 }
    );
  }
}

/**
 * Google Sheets URL에서 스프레드시트 ID 추출
 */
function extractSpreadsheetId(url: string): string | null {
  if (!url) return null;
  // https://docs.google.com/spreadsheets/d/{spreadsheetId}/edit
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}