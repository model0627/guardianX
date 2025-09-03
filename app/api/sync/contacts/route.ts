import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

/**
 * @swagger
 * /api/sync/contacts:
 *   post:
 *     summary: 담당자 데이터 동기화
 *     description: 외부 API 연결을 통해 담당자 데이터를 동기화합니다. Google Sheets 및 일반 API를 지원합니다.
 *     tags: [Sync]
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
 *               - apiConnectionId
 *             properties:
 *               apiConnectionId:
 *                 type: string
 *                 format: uuid
 *                 description: API 연결 ID
 *               isAutoSync:
 *                 type: boolean
 *                 description: 자동 동기화 여부
 *                 default: false
 *     responses:
 *       200:
 *         description: 동기화 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 담당자 동기화가 완료되었습니다.
 *                 stats:
 *                   type: object
 *                   properties:
 *                     recordsProcessed:
 *                       type: integer
 *                       description: 처리된 레코드 수
 *                     recordsAdded:
 *                       type: integer
 *                       description: 추가된 레코드 수
 *                     recordsUpdated:
 *                       type: integer
 *                       description: 업데이트된 레코드 수
 *                     recordsDeactivated:
 *                       type: integer
 *                       description: 비활성화된 레코드 수
 *                     recordsSkipped:
 *                       type: integer
 *                       description: 건너뛴 레코드 수
 *                 warnings:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: 경고 메시지 목록
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: API 연결을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 동기화 중 오류가 발생했습니다.
 *                 details:
 *                   type: string
 *                   description: 오류 상세 정보
 */
export async function POST(request: NextRequest) {
  try {
    // 시스템 자동 동기화인 경우
    const systemUser = request.headers.get('X-System-User');
    let userId = null;
    
    if (systemUser === 'auto-sync') {
      // 시스템 사용자 ID 사용
      const systemUserResult = await query(
        `SELECT id FROM users WHERE email = 'admin@guardianx.com' LIMIT 1`
      );
      if (systemUserResult.rows.length > 0) {
        userId = systemUserResult.rows[0].id;
      }
    } else {
      // 일반 사용자 인증
      const token = getTokenFromRequest(request);
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const user = await verifyToken(token);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.userId;
    }

    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { apiConnectionId, isAutoSync } = await request.json();

    if (!apiConnectionId) {
      return NextResponse.json(
        { error: 'API connection ID is required' },
        { status: 400 }
      );
    }

    // Get API connection details
    const connectionResult = await query(
      `SELECT * FROM api_connections WHERE id = $1 AND is_active = true`,
      [apiConnectionId]
    );

    if (connectionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'API connection not found' },
        { status: 404 }
      );
    }

    const apiConnection = connectionResult.rows[0];

    // Get user's current tenant ID from database (CRITICAL: Always use users.current_tenant_id)
    const userTenantResult = await query(
      `SELECT current_tenant_id FROM users WHERE id = $1`,
      [userId]
    );

    if (userTenantResult.rows.length === 0 || !userTenantResult.rows[0].current_tenant_id) {
      return NextResponse.json({ error: 'User tenant not found' }, { status: 400 });
    }

    const tenantId = userTenantResult.rows[0].current_tenant_id;
    
    console.log('[ContactsSync] Using tenant_id from users.current_tenant_id:', {
      userId,
      tenantId,
      apiConnectionTenantId: apiConnection.tenant_id
    });

    // Create sync history record
    const executionType = systemUser === 'auto-sync' ? 'auto' : 'manual';
    const syncHistoryResult = await query(
      `INSERT INTO sync_history (api_connection_id, initiated_by, status, execution_type)
       VALUES ($1, $2, 'running', $3)
       RETURNING id`,
      [apiConnectionId, userId, executionType]
    );

    const syncHistoryId = syncHistoryResult.rows[0].id;

    try {
      let apiData: any[] = [];
      
      // Check connection type and fetch data accordingly
      if (apiConnection.connection_type === 'google_sheets') {
        console.log('[Sync Contacts] Fetching Google Sheets data for connection:', apiConnection.name);
        
        // Check if this connection has OAuth authentication
        const sheetsInfoResult = await query(
          `SELECT auth_type, spreadsheet_id, google_account_id
           FROM google_sheets_connections
           WHERE api_connection_id = $1`,
          [apiConnectionId]
        );
        
        let sheetsResponse;
        
        if (sheetsInfoResult.rows.length > 0 && sheetsInfoResult.rows[0].auth_type === 'oauth') {
          // Use private API for OAuth authenticated sheets
          const spreadsheetId = sheetsInfoResult.rows[0].spreadsheet_id || 
                               apiConnection.api_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
          
          console.log('[Sync Contacts] Using Google Sheets private API with OAuth for spreadsheet:', spreadsheetId);
          
          // Forward authentication headers
          const authToken = getTokenFromRequest(request);
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          
          if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
          }
          
          const cookieHeader = request.headers.get('cookie');
          if (cookieHeader) {
            headers['Cookie'] = cookieHeader;
          }
          
          sheetsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003'}/api/google-sheets/private`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              spreadsheetId: spreadsheetId,
              sheetName: apiConnection.sheet_name || '',
              range: apiConnection.range_notation || 'A:Z'
            }),
          });
        } else {
          // Use public API for public sheets
          console.log('[Sync Contacts] Using Google Sheets public API for URL:', apiConnection.api_url);
          
          sheetsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/google-sheets/fetch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              spreadsheetUrl: apiConnection.api_url,
              sheetName: apiConnection.sheet_name || 'Sheet1',
              range: apiConnection.range_notation || 'A:Z'
            }),
          });
        }
        
        if (!sheetsResponse.ok) {
          const error = await sheetsResponse.json();
          console.error('[Sync Contacts] Google Sheets fetch error:', error);
          throw new Error(`Google Sheets fetch failed: ${error.details || error.error || '인증이 필요합니다.'}`);
        }
        
        const sheetsData = await sheetsResponse.json();
        apiData = sheetsData.data || [];
      } else {
        // Fetch data from regular API
        const response = await fetch(apiConnection.api_url);
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        apiData = await response.json();
        if (!Array.isArray(apiData)) {
          throw new Error('API response is not an array');
        }
      }

      const fieldMappings = apiConnection.field_mappings || {};
      let recordsProcessed = 0;
      let recordsAdded = 0;
      let recordsUpdated = 0;

      // Get existing contacts by email to check for updates (not for deactivation)
      const existingContactsResult = await query(
        `SELECT id, email, name, is_active 
         FROM contacts 
         WHERE is_active = true`,
        []
      );
      
      const existingContacts = new Map(
        existingContactsResult.rows.map(contact => [contact.email, { 
          id: contact.id, 
          name: contact.name,
          is_active: contact.is_active
        }])
      );

      // Process each API record
      for (const apiRecord of apiData) {
        recordsProcessed++;

        // Map API fields to database fields
        const mappedData: any = {};
        for (const [dbField, apiField] of Object.entries(fieldMappings)) {
          if (apiField && apiRecord[apiField as string] !== undefined) {
            mappedData[dbField] = apiRecord[apiField as string];
          }
        }

        console.log('Processing contact record:', { 
          original: apiRecord, 
          mapped: mappedData
        });

        // Ensure required fields (email is the unique identifier)
        if (!mappedData.email) {
          console.warn('Skipping contact record without email:', apiRecord);
          continue;
        }

        // Check if contact exists
        const existingContact = existingContacts.get(mappedData.email);

        if (existingContact) {
          // Update existing contact
          const wasInactive = !existingContact.is_active;
          
          // Build dynamic UPDATE query - only update fields that have mappings
          const updateFields: string[] = [];
          const updateValues: any[] = [];
          let paramIndex = 1;

          // Always update to active
          updateFields.push('updated_at = CURRENT_TIMESTAMP');
          updateFields.push('is_active = true');

          // Only update fields that have mappings in the API response and exist in DB
          if (mappedData.hasOwnProperty('name')) {
            updateFields.push(`name = $${paramIndex++}`);
            updateValues.push(mappedData.name || '');
          }
          if (mappedData.hasOwnProperty('phone')) {
            updateFields.push(`phone = $${paramIndex++}`);
            updateValues.push(mappedData.phone || '');
          }
          if (mappedData.hasOwnProperty('mobile')) {
            updateFields.push(`mobile = $${paramIndex++}`);
            updateValues.push(mappedData.mobile || '');
          }
          if (mappedData.hasOwnProperty('title')) {
            updateFields.push(`title = $${paramIndex++}`);
            updateValues.push(mappedData.title || '');
          }
          if (mappedData.hasOwnProperty('department')) {
            updateFields.push(`department = $${paramIndex++}`);
            updateValues.push(mappedData.department || '');
          }
          if (mappedData.hasOwnProperty('office_location')) {
            updateFields.push(`office_location = $${paramIndex++}`);
            updateValues.push(mappedData.office_location || '');
          }
          if (mappedData.hasOwnProperty('responsibilities') && Array.isArray(mappedData.responsibilities)) {
            updateFields.push(`responsibilities = $${paramIndex++}`);
            updateValues.push(mappedData.responsibilities);
          }

          // Add the contact ID as the final parameter
          updateValues.push(existingContact.id);

          const updateQuery = `UPDATE contacts SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
          
          await query(updateQuery, updateValues);
          
          if (wasInactive) {
            console.log(`Restored contact ${mappedData.email} - found in API again`);
            recordsAdded++;
          } else {
            recordsUpdated++;
          }
        } else {
          // Insert new contact - only include fields that have mappings and exist in DB
          const insertFields = ['email', 'tenant_id', 'is_active', 'created_by'];
          const insertValues = [mappedData.email, tenantId, true, userId];
          const placeholders = ['$1', '$2', '$3', '$4'];
          let paramIndex = 5;

          // Only include fields that have mappings in the API response and exist in DB
          if (mappedData.hasOwnProperty('name')) {
            insertFields.push('name');
            insertValues.push(mappedData.name || '');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('phone')) {
            insertFields.push('phone');
            insertValues.push(mappedData.phone || '');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('mobile')) {
            insertFields.push('mobile');
            insertValues.push(mappedData.mobile || '');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('title')) {
            insertFields.push('title');
            insertValues.push(mappedData.title || '');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('department')) {
            insertFields.push('department');
            insertValues.push(mappedData.department || '');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('office_location')) {
            insertFields.push('office_location');
            insertValues.push(mappedData.office_location || '');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('responsibilities') && Array.isArray(mappedData.responsibilities)) {
            insertFields.push('responsibilities');
            insertValues.push(mappedData.responsibilities);
            placeholders.push(`$${paramIndex++}`);
          }

          const insertQuery = `INSERT INTO contacts (${insertFields.join(', ')}) VALUES (${placeholders.join(', ')})`;
          
          await query(insertQuery, insertValues);
          recordsAdded++;
        }
      }

      // Note: We do NOT deactivate contacts that are not in the API response
      // because we want to preserve manually added contacts.
      // Only contacts that were created/managed by THIS API connection should be affected.

      // Update sync history with success
      await query(
        `UPDATE sync_history 
         SET status = 'completed', 
             sync_completed_at = CURRENT_TIMESTAMP,
             records_processed = $1,
             records_added = $2,
             records_updated = $3,
             records_deactivated = $4,
             sync_details = $5
         WHERE id = $6`,
        [
          recordsProcessed,
          recordsAdded,
          recordsUpdated,
          0, // No deactivation
          JSON.stringify({ total_api_records: apiData.length }),
          syncHistoryId
        ]
      );

      // Update API connection last sync info
      await query(
        `UPDATE api_connections 
         SET last_sync = CURRENT_TIMESTAMP,
             last_sync_status = 'success',
             last_sync_message = $1
         WHERE id = $2`,
        [
          `성공적으로 동기화됨: ${recordsAdded}개 추가, ${recordsUpdated}개 업데이트`,
          apiConnectionId
        ]
      );

      return NextResponse.json({
        success: true,
        message: '담당자 동기화가 완료되었습니다.',
        stats: {
          processed: recordsProcessed,
          added: recordsAdded,
          updated: recordsUpdated,
          deactivated: 0
        }
      });

    } catch (error) {
      console.error('Contact sync error:', error);
      
      // Update sync history with failure
      await query(
        `UPDATE sync_history 
         SET status = 'failed', 
             sync_completed_at = CURRENT_TIMESTAMP,
             error_message = $1
         WHERE id = $2`,
        [
          error instanceof Error ? error.message : 'Unknown error',
          syncHistoryId
        ]
      );

      // Update API connection with error status
      await query(
        `UPDATE api_connections 
         SET last_sync = CURRENT_TIMESTAMP,
             last_sync_status = 'error',
             last_sync_message = $1
         WHERE id = $2`,
        [
          error instanceof Error ? error.message : 'Unknown error',
          apiConnectionId
        ]
      );

      throw error;
    }

  } catch (error) {
    console.error('Contact sync error:', error);
    return NextResponse.json(
      { 
        error: '담당자 동기화 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}