import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

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
        // Google Sheets 연결 정보 확인
        const googleSheetsResult = await query(
          `SELECT * FROM google_sheets_connections WHERE api_connection_id = $1`,
          [apiConnectionId]
        );
        
        const isOAuthConnection = googleSheetsResult.rows.length > 0 && 
          googleSheetsResult.rows[0].auth_type === 'oauth' &&
          googleSheetsResult.rows[0].google_account_id;

        let sheetsResponse;
        
        if (isOAuthConnection) {
          // OAuth를 사용한 비공개 스프레드시트 접근
          const googleConnection = googleSheetsResult.rows[0];
          const spreadsheetId = googleConnection.spreadsheet_id;
          
          if (!spreadsheetId) {
            throw new Error('Google Sheets ID가 설정되지 않았습니다.');
          }
          
          // 내부 API 호출이므로 쿠키를 통해 인증 정보 전달
          const cookieHeader = request.headers.get('cookie') || '';
          
          sheetsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/google-sheets/private`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': cookieHeader, // 쿠키를 통해 사용자 인증 정보 전달
            },
            body: JSON.stringify({
              spreadsheetId: spreadsheetId,
              sheetName: apiConnection.sheet_name || '',
              range: apiConnection.range_notation || 'A:Z'
            }),
          });
        } else {
          // 기존 공개 스프레드시트 방식
          sheetsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/google-sheets/fetch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              spreadsheetUrl: apiConnection.api_url,
              sheetName: apiConnection.sheet_name || '',
              range: apiConnection.range_notation || 'A:Z'
            }),
          });
        }
        
        if (!sheetsResponse.ok) {
          const error = await sheetsResponse.json();
          throw new Error(`Google Sheets fetch failed: ${error.details || error.error}`);
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

      // Get existing libraries FROM THIS API CONNECTION ONLY
      // This ensures each API connection manages its own data independently
      const existingLibrariesResult = await query(
        `SELECT id, name, status, deleted_at, deletion_reason, api_connection_id
         FROM libraries 
         WHERE tenant_id = $1 AND (api_connection_id = $2 OR api_connection_id IS NULL)`,
        [apiConnection.tenant_id, apiConnectionId]
      );
      
      const existingLibraries = new Map(
        existingLibrariesResult.rows
          .filter(lib => lib.api_connection_id === apiConnectionId || lib.api_connection_id === null)
          .map(lib => [lib.name, { 
            id: lib.id, 
            status: lib.status, 
            deleted_at: lib.deleted_at,
            deletion_reason: lib.deletion_reason,
            api_connection_id: lib.api_connection_id
          }])
      );
      const processedLibraries = new Set<string>();

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

        console.log('Processing record:', { 
          original: apiRecord, 
          mapped: mappedData
        });

        // Ensure required fields
        if (!mappedData.name) {
          console.warn('Skipping record without name:', apiRecord);
          recordsSkipped++;
          if (!skippedReasons.includes('필수 필드 누락 (name)')) {
            skippedReasons.push('필수 필드 누락 (name)');
          }
          continue;
        }

        processedLibraries.add(mappedData.name);

        // Check if library exists
        const existingLibrary = existingLibraries.get(mappedData.name);

        if (existingLibrary) {
          // Update existing library (restore if deleted, either by user or auto-sync)
          // If API still has the data, we should restore it regardless of deletion reason
          const wasDeleted = existingLibrary.deleted_at !== null;
          
          // Build dynamic UPDATE query - only update fields that have mappings
          const updateFields: string[] = [];
          const updateValues: any[] = [];
          let paramIndex = 1;

          // Always update status to active and clear deletion info when restoring
          updateFields.push('status = $' + paramIndex++);
          updateValues.push('active');
          updateFields.push('updated_at = CURRENT_TIMESTAMP');
          updateFields.push('deleted_at = NULL');
          updateFields.push('deleted_by = NULL');
          updateFields.push('deletion_reason = NULL');
          
          // Set API connection ID if it was null (for backward compatibility)
          if (existingLibrary.api_connection_id === null) {
            updateFields.push(`api_connection_id = $${paramIndex++}`);
            updateValues.push(apiConnectionId);
          }

          // Only update fields that have mappings in the API response
          if (mappedData.hasOwnProperty('version')) {
            updateFields.push(`version = $${paramIndex++}`);
            updateValues.push(mappedData.version || '-');
          }
          if (mappedData.hasOwnProperty('vendor')) {
            updateFields.push(`vendor = $${paramIndex++}`);
            updateValues.push(mappedData.vendor || '-');
          }
          if (mappedData.hasOwnProperty('product_type')) {
            updateFields.push(`product_type = $${paramIndex++}`);
            updateValues.push(mappedData.product_type || 'software');
          }
          if (mappedData.hasOwnProperty('description')) {
            updateFields.push(`description = $${paramIndex++}`);
            updateValues.push(mappedData.description || '');
          }
          if (mappedData.hasOwnProperty('product_type')) {
            updateFields.push(`product_type = $${paramIndex++}`);
            updateValues.push(mappedData.product_type || 'software');
          }
          if (mappedData.hasOwnProperty('device_name')) {
            updateFields.push(`device_name = $${paramIndex++}`);
            updateValues.push(mappedData.device_name || '');
          }
          if (mappedData.hasOwnProperty('process_name')) {
            updateFields.push(`process_name = $${paramIndex++}`);
            updateValues.push(mappedData.process_name || '');
          }
          if (mappedData.hasOwnProperty('install_path')) {
            updateFields.push(`install_path = $${paramIndex++}`);
            updateValues.push(mappedData.install_path || '');
          }
          if (mappedData.hasOwnProperty('install_date')) {
            updateFields.push(`install_date = $${paramIndex++}`);
            updateValues.push(mappedData.install_date || null);
          }
          if (mappedData.hasOwnProperty('license_type')) {
            updateFields.push(`license_type = $${paramIndex++}`);
            updateValues.push(mappedData.license_type || '');
          }
          if (mappedData.hasOwnProperty('license_expiry')) {
            updateFields.push(`license_expiry = $${paramIndex++}`);
            updateValues.push(mappedData.license_expiry || null);
          }
          if (mappedData.hasOwnProperty('last_update')) {
            updateFields.push(`last_update = $${paramIndex++}`);
            updateValues.push(mappedData.last_update || null);
          }
          if (mappedData.hasOwnProperty('security_patch_level')) {
            updateFields.push(`security_patch_level = $${paramIndex++}`);
            updateValues.push(mappedData.security_patch_level || '');
          }
          if (mappedData.hasOwnProperty('vulnerability_status')) {
            updateFields.push(`vulnerability_status = $${paramIndex++}`);
            updateValues.push(mappedData.vulnerability_status || 'unknown');
          }
          if (mappedData.hasOwnProperty('cpu_usage')) {
            updateFields.push(`cpu_usage = $${paramIndex++}`);
            updateValues.push(mappedData.cpu_usage ? parseFloat(mappedData.cpu_usage) : null);
          }
          if (mappedData.hasOwnProperty('memory_usage')) {
            updateFields.push(`memory_usage = $${paramIndex++}`);
            updateValues.push(mappedData.memory_usage ? parseInt(mappedData.memory_usage) : null);
          }
          if (mappedData.hasOwnProperty('disk_usage')) {
            updateFields.push(`disk_usage = $${paramIndex++}`);
            updateValues.push(mappedData.disk_usage ? parseInt(mappedData.disk_usage) : null);
          }
          if (mappedData.hasOwnProperty('tags')) {
            updateFields.push(`tags = $${paramIndex++}`);
            updateValues.push(mappedData.tags ? (Array.isArray(mappedData.tags) ? mappedData.tags : [mappedData.tags]) : null);
          }

          // Add the library ID as the final parameter
          updateValues.push(existingLibrary.id);

          const updateQuery = `UPDATE libraries SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
          
          await query(updateQuery, updateValues);
          
          if (wasDeleted) {
            console.log(`Restored ${mappedData.name} - found in API again`);
            recordsAdded++;  // 삭제된 것을 복원한 경우 추가로 카운트
          } else {
            recordsUpdated++;
          }
        } else {
          // Insert new library - only include fields that have mappings, use defaults for others
          const insertFields = ['name', 'status', 'tenant_id', 'created_by', 'api_connection_id'];
          const insertValues = [mappedData.name, 'active', apiConnection.tenant_id, userId, apiConnectionId];
          const placeholders = ['$1', '$2', '$3', '$4', '$5'];
          let paramIndex = 6;

          // Only include fields that have mappings in the API response
          if (mappedData.hasOwnProperty('version')) {
            insertFields.push('version');
            insertValues.push(mappedData.version || '-');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('vendor')) {
            insertFields.push('vendor');
            insertValues.push(mappedData.vendor || '-');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('product_type')) {
            insertFields.push('product_type');
            insertValues.push(mappedData.product_type || 'software');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('description')) {
            insertFields.push('description');
            insertValues.push(mappedData.description || '');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('product_type')) {
            insertFields.push('product_type');
            insertValues.push(mappedData.product_type || 'software');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('device_name')) {
            insertFields.push('device_name');
            insertValues.push(mappedData.device_name || '');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('process_name')) {
            insertFields.push('process_name');
            insertValues.push(mappedData.process_name || '');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('install_path')) {
            insertFields.push('install_path');
            insertValues.push(mappedData.install_path || '');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('install_date')) {
            insertFields.push('install_date');
            insertValues.push(mappedData.install_date || null);
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('license_type')) {
            insertFields.push('license_type');
            insertValues.push(mappedData.license_type || '');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('license_expiry')) {
            insertFields.push('license_expiry');
            insertValues.push(mappedData.license_expiry || null);
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('last_update')) {
            insertFields.push('last_update');
            insertValues.push(mappedData.last_update || null);
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('security_patch_level')) {
            insertFields.push('security_patch_level');
            insertValues.push(mappedData.security_patch_level || '');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('vulnerability_status')) {
            insertFields.push('vulnerability_status');
            insertValues.push(mappedData.vulnerability_status || 'unknown');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('cpu_usage')) {
            insertFields.push('cpu_usage');
            insertValues.push(mappedData.cpu_usage ? parseFloat(mappedData.cpu_usage) : null);
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('memory_usage')) {
            insertFields.push('memory_usage');
            insertValues.push(mappedData.memory_usage ? parseInt(mappedData.memory_usage) : null);
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('disk_usage')) {
            insertFields.push('disk_usage');
            insertValues.push(mappedData.disk_usage ? parseInt(mappedData.disk_usage) : null);
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('tags')) {
            insertFields.push('tags');
            insertValues.push(mappedData.tags ? (Array.isArray(mappedData.tags) ? mappedData.tags : [mappedData.tags]) : null);
            placeholders.push(`$${paramIndex++}`);
          }

          const insertQuery = `INSERT INTO libraries (${insertFields.join(', ')}) VALUES (${placeholders.join(', ')})`;
          
          await query(insertQuery, insertValues);
          recordsAdded++;
        }
      }

      // Deactivate libraries that are no longer in the API response
      // ONLY for libraries that belong to THIS API connection
      // Skip libraries that were explicitly deleted by user
      for (const [libraryName, libraryInfo] of existingLibraries) {
        // Only deactivate if:
        // 1. Library belongs to this API connection (not null and matches)
        // 2. Not processed in this sync
        // 3. Currently active
        // 4. Not already deleted
        if (!processedLibraries.has(libraryName) && 
            libraryInfo.api_connection_id === apiConnectionId &&  // IMPORTANT: Only deactivate this API's data
            libraryInfo.status === 'active' && 
            !libraryInfo.deleted_at) {
          // Soft delete with auto-deactivation reason
          await query(
            `UPDATE libraries 
             SET deleted_at = CURRENT_TIMESTAMP, 
                 deletion_reason = 'Auto-sync deactivation', 
                 status = 'inactive', 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1 AND api_connection_id = $2`,  // Double check API connection
            [libraryInfo.id, apiConnectionId]
          );
          recordsDeactivated++;
        }
      }

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
      let detailedMessage = '라이브러리 동기화가 완료되었습니다.';
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
    console.error('Sync error:', error);
    return NextResponse.json(
      { 
        error: '동기화 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}