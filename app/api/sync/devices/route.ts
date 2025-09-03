import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

/**
 * @swagger
 * /api/sync/devices:
 *   post:
 *     summary: 외부 API로부터 디바이스 데이터 동기화
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
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     recordsProcessed:
 *                       type: integer
 *                     recordsAdded:
 *                       type: integer
 *                     recordsUpdated:
 *                       type: integer
 *                     recordsDeactivated:
 *                       type: integer
 *                     recordsSkipped:
 *                       type: integer
 *                 warnings:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: API connection ID is required
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: API connection not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function POST(request: NextRequest) {
  try {
    // 시스템 자동 동기화인 경우
    const systemUser = request.headers.get('X-System-User');
    let userId = null;
    let user: any = null;
    
    if (systemUser === 'auto-sync') {
      // 시스템 사용자 ID 사용
      const systemUserResult = await query(
        `SELECT id, current_tenant_id FROM users WHERE email = 'admin@guardianx.com' LIMIT 1`
      );
      if (systemUserResult.rows.length > 0) {
        userId = systemUserResult.rows[0].id;
        user = { 
          userId: systemUserResult.rows[0].id,
          tenantId: systemUserResult.rows[0].current_tenant_id
        };
      }
    } else {
      // 일반 사용자 인증
      const token = getTokenFromRequest(request);
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      user = await verifyToken(token);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.userId;
    }

    if (!userId || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Get user's current tenant ID from database
    const userTenantResult = await query(
      `SELECT current_tenant_id FROM users WHERE id = $1`,
      [userId]
    );

    if (userTenantResult.rows.length === 0 || !userTenantResult.rows[0].current_tenant_id) {
      return NextResponse.json({ error: 'User tenant not found' }, { status: 400 });
    }

    const actualTenantId = userTenantResult.rows[0].current_tenant_id;
    
    console.log('[Sync] User context:', {
      userId,
      userTenantIdFromAuth: user.tenantId,
      actualTenantId,
      userObject: user
    });

    // Override user tenantId with the actual tenant ID from database
    user.tenantId = actualTenantId;

    const { apiConnectionId, isAutoSync } = await request.json();

    if (!apiConnectionId) {
      return NextResponse.json(
        { error: 'API connection ID is required' },
        { status: 400 }
      );
    }

    // Get API connection details
    console.log('Looking for API connection:', { apiConnectionId, tenantId: user.tenantId });
    
    // First check without tenant_id to see if connection exists
    const checkResult = await query(
      `SELECT id, name, tenant_id FROM api_connections WHERE id = $1`,
      [apiConnectionId]
    );
    
    if (checkResult.rows.length > 0) {
      console.log('API connection found:', {
        id: checkResult.rows[0].id,
        name: checkResult.rows[0].name,
        tenant_id: checkResult.rows[0].tenant_id,
        user_tenant_id: user.tenantId
      });
    }
    
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
    
    // If API connection doesn't have tenant_id, update it
    if (!apiConnection.tenant_id) {
      console.log('Updating API connection with tenant_id:', user.tenantId);
      await query(
        `UPDATE api_connections SET tenant_id = $1 WHERE id = $2`,
        [user.tenantId, apiConnectionId]
      );
      apiConnection.tenant_id = user.tenantId;
    }

    // Also update any existing devices without tenant_id to ensure they're visible
    await query(
      `UPDATE devices 
       SET tenant_id = $1 
       WHERE tenant_id IS NULL AND is_active = true`,
      [user.tenantId]
    );
    console.log('Updated any existing devices without tenant_id to use tenant_id:', user.tenantId);

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
        console.log('[Sync] Fetching Google Sheets data for connection:', apiConnection.name);
        
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
          
          console.log('[Sync] Using Google Sheets private API with OAuth for spreadsheet:', spreadsheetId);
          
          // Get the user's Google account token
          const googleAccountResult = await query(
            `SELECT access_token, refresh_token, token_expires_at
             FROM google_accounts
             WHERE user_id = $1`,
            [userId]
          );
          
          if (googleAccountResult.rows.length === 0) {
            throw new Error('Google 계정이 연결되지 않았습니다. 먼저 Google 계정을 연결해주세요.');
          }
          
          // Forward the original request headers for authentication
          const authToken = getTokenFromRequest(request);
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          
          // Include authentication
          if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
          }
          
          // Forward cookies
          const cookies = request.headers.get('cookie');
          if (cookies) {
            headers['Cookie'] = cookies;
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
          console.log('[Sync] Using Google Sheets public API for URL:', apiConnection.api_url);
          
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
          console.error('[Sync] Google Sheets fetch error:', error);
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
      let recordsDeactivated = 0;
      let recordsSkipped = 0;
      const skippedReasons: string[] = [];

      // Get existing devices by name to check for updates (not for deactivation)
      const existingDevicesResult = await query(
        `SELECT id, name, status, is_active, tenant_id 
         FROM devices 
         WHERE is_active = true AND tenant_id = $1`,
        [user.tenantId]
      );
      
      const existingDevices = new Map(
        existingDevicesResult.rows.map(device => [device.name, { 
          id: device.id, 
          status: device.status, 
          is_active: device.is_active
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

        console.log('Processing device record:', { 
          original: apiRecord, 
          mapped: mappedData
        });

        // Ensure required fields
        if (!mappedData.name) {
          console.warn('Skipping device record without name:', apiRecord);
          recordsSkipped++;
          if (!skippedReasons.includes('필수 필드 누락 (name)')) {
            skippedReasons.push('필수 필드 누락 (name)');
          }
          continue;
        }


        // Check if device exists
        const existingDevice = existingDevices.get(mappedData.name);

        if (existingDevice) {
          // Update existing device (restore if deactivated)
          const wasInactive = !existingDevice.is_active;
          
          // Build dynamic UPDATE query - only update fields that have mappings
          const updateFields: string[] = [];
          const updateValues: any[] = [];
          let paramIndex = 1;

          // Always update status to active
          updateFields.push('status = $' + paramIndex++);
          updateValues.push('active');
          updateFields.push('updated_at = CURRENT_TIMESTAMP');
          updateFields.push('is_active = true');

          // Only update fields that have mappings in the API response and exist in DB
          if (mappedData.hasOwnProperty('device_type')) {
            updateFields.push(`device_type = $${paramIndex++}`);
            updateValues.push(mappedData.device_type || 'server');
          }
          if (mappedData.hasOwnProperty('manufacturer')) {
            updateFields.push(`manufacturer = $${paramIndex++}`);
            updateValues.push(mappedData.manufacturer || '');
          }
          if (mappedData.hasOwnProperty('model')) {
            updateFields.push(`model = $${paramIndex++}`);
            updateValues.push(mappedData.model || '');
          }
          if (mappedData.hasOwnProperty('serial_number')) {
            updateFields.push(`serial_number = $${paramIndex++}`);
            updateValues.push(mappedData.serial_number || '');
          }
          if (mappedData.hasOwnProperty('description')) {
            updateFields.push(`description = $${paramIndex++}`);
            updateValues.push(mappedData.description || '');
          }

          // Add the device ID and tenant_id as the final parameters
          updateValues.push(existingDevice.id);
          updateValues.push(user.tenantId);

          const updateQuery = `UPDATE devices SET ${updateFields.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`;
          
          await query(updateQuery, updateValues);
          
          if (wasInactive) {
            console.log(`Restored device ${mappedData.name} - found in API again`);
            recordsAdded++;
          } else {
            recordsUpdated++;
          }
        } else {
          // Insert new device - only include fields that have mappings, use defaults for others
          const insertFields = ['name', 'status', 'created_by', 'tenant_id', 'is_active'];
          const insertValues = [mappedData.name, 'active', userId, user.tenantId, true];
          const placeholders = ['$1', '$2', '$3', '$4', '$5'];
          let paramIndex = 6;
          
          console.log('[Sync] Device INSERT preparation:', {
            tenantId: user.tenantId,
            userId: userId,
            deviceName: mappedData.name,
            insertFields,
            insertValues
          });

          // Only include fields that have mappings in the API response and exist in DB
          if (mappedData.hasOwnProperty('device_type')) {
            insertFields.push('device_type');
            insertValues.push(mappedData.device_type || 'server');
            placeholders.push(`$${paramIndex++}`);
          } else {
            // Default device_type if not provided
            insertFields.push('device_type');
            insertValues.push('server');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('manufacturer')) {
            insertFields.push('manufacturer');
            insertValues.push(mappedData.manufacturer || '');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('model')) {
            insertFields.push('model');
            insertValues.push(mappedData.model || '');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('serial_number')) {
            insertFields.push('serial_number');
            insertValues.push(mappedData.serial_number || '');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('description')) {
            insertFields.push('description');
            insertValues.push(mappedData.description || '');
            placeholders.push(`$${paramIndex++}`);
          }

          const insertQuery = `INSERT INTO devices (${insertFields.join(', ')}) VALUES (${placeholders.join(', ')})`;
          
          console.log('[Sync] About to execute INSERT:', { 
            query: insertQuery, 
            values: insertValues,
            fields: insertFields
          });
          
          await query(insertQuery, insertValues);
          recordsAdded++;
        }
      }

      // Note: We do NOT deactivate devices that are not in the API response
      // because we want to preserve manually added devices.
      // Only devices that were created/managed by THIS API connection should be affected.

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
          recordsDeactivated,
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
          `성공적으로 동기화됨: ${recordsAdded}개 추가, ${recordsUpdated}개 업데이트, ${recordsDeactivated}개 비활성화`,
          apiConnectionId
        ]
      );

      // Build detailed message
      let detailedMessage = '디바이스 동기화가 완료되었습니다.';
      if (recordsSkipped > 0) {
        detailedMessage += ` (${recordsSkipped}개 레코드 건너뜀: ${skippedReasons.join(', ')})`;
      }

      return NextResponse.json({
        success: true,
        message: detailedMessage,
        stats: {
          recordsProcessed,
          recordsAdded,
          recordsUpdated,
          recordsDeactivated,
          recordsSkipped
        },
        warnings: recordsSkipped > 0 ? skippedReasons : []
      });

    } catch (syncError) {
      // Update sync history with error
      await query(
        `UPDATE sync_history 
         SET status = 'failed', 
             sync_completed_at = CURRENT_TIMESTAMP,
             error_message = $1
         WHERE id = $2`,
        [syncError instanceof Error ? syncError.message : 'Unknown error', syncHistoryId]
      );

      // Update API connection last sync info
      await query(
        `UPDATE api_connections 
         SET last_sync = CURRENT_TIMESTAMP,
             last_sync_status = 'error',
             last_sync_message = $1
         WHERE id = $2`,
        [syncError instanceof Error ? syncError.message : 'Sync failed', apiConnectionId]
      );

      throw syncError;
    }

  } catch (error) {
    console.error('Device sync error:', error);
    return NextResponse.json(
      { 
        error: '디바이스 동기화 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}