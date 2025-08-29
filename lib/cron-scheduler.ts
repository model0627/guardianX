import cron from 'node-cron';
import { query } from '@/lib/database';

let schedulerTask: cron.ScheduledTask | null = null;
let isSchedulerRunning = false;

// 전역 스케줄러 상태 확인을 위한 변수
declare global {
  var __GUARDIAN_X_SCHEDULER_RUNNING__: boolean | undefined;
}

// 서버 사이드 자동 동기화 스케줄러
export function startServerAutoSync() {
  // 전역 상태 확인으로 중복 실행 방지
  if (global.__GUARDIAN_X_SCHEDULER_RUNNING__) {
    console.log('[Server Auto Sync] Global scheduler already running, skipping');
    return;
  }

  if (schedulerTask) {
    console.log('[Server Auto Sync] Local scheduler already running, stopping previous task');
    schedulerTask.stop();
    schedulerTask.destroy();
    schedulerTask = null;
  }

  console.log('[Server Auto Sync] Starting server-side scheduler - will run every 5 minutes');
  global.__GUARDIAN_X_SCHEDULER_RUNNING__ = true;
  
  // 5분마다 실행하는 cron job
  schedulerTask = cron.schedule('*/5 * * * *', async () => {
    await runServerAutoSync();
  }, {
    scheduled: true,
    timezone: "Asia/Seoul"
  });

  console.log('[Server Auto Sync] Server-side scheduler started successfully');
}

export function stopServerAutoSync() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask.destroy();
    schedulerTask = null;
    console.log('[Server Auto Sync] Server-side scheduler stopped');
  }
  global.__GUARDIAN_X_SCHEDULER_RUNNING__ = false;
}

async function runServerAutoSync() {
  try {
    console.log('[Server Auto Sync] Running server-side auto-sync at', new Date().toISOString());
    
    // 자동 동기화가 활성화된 모든 API 연결 조회 (동기화 주기 설정 포함)
    const connectionsResult = await query(
      `SELECT *, 
              COALESCE(sync_frequency_minutes, 5) as frequency_minutes,
              COALESCE(sync_frequency_type, 'minutes') as frequency_type,
              COALESCE(sync_target, 'libraries') as sync_target
       FROM api_connections 
       WHERE is_active = true 
       AND auto_sync_enabled = true
       ORDER BY last_sync ASC NULLS FIRST`
    );

    if (connectionsResult.rows.length === 0) {
      console.log('[Server Auto Sync] No auto-sync enabled connections found');
      return;
    }

    const results = [];

    for (const connection of connectionsResult.rows) {
      // 동적 동기화 주기 계산
      const frequencyMinutes = parseInt(connection.frequency_minutes) || 5;
      const frequencyType = connection.frequency_type || 'minutes';
      
      let intervalMs;
      switch (frequencyType) {
        case 'hours':
          intervalMs = frequencyMinutes * 60 * 60 * 1000; // hours to milliseconds
          break;
        case 'days':
          intervalMs = frequencyMinutes * 24 * 60 * 60 * 1000; // days to milliseconds
          break;
        case 'minutes':
        default:
          intervalMs = frequencyMinutes * 60 * 1000; // minutes to milliseconds
          break;
      }

      // 마지막 동기화 시간 확인 (설정된 주기 이상 지났는지)
      const lastSync = connection.last_sync ? new Date(connection.last_sync) : null;
      const now = new Date();
      const thresholdTime = new Date(now.getTime() - intervalMs);

      if (!lastSync || lastSync < thresholdTime) {
        console.log(`[Server Auto Sync] Syncing ${connection.name} (ID: ${connection.id}) - Last sync: ${lastSync ? lastSync.toISOString() : 'never'} - Frequency: ${frequencyMinutes} ${frequencyType}`);

        try {
          // 동기화 실행 - sync_target에 따라 분기
          let syncResult;
          if (connection.sync_target === 'devices') {
            syncResult = await performDeviceSync(connection);
          } else if (connection.sync_target === 'contacts') {
            syncResult = await performContactSync(connection);
          } else {
            syncResult = await performLibrarySync(connection);
          }
          
          results.push({
            connectionId: connection.id,
            connectionName: connection.name,
            syncTarget: connection.sync_target,
            success: true,
            result: syncResult
          });

        } catch (error) {
          console.error(`[Server Auto Sync] Error syncing ${connection.name}:`, error);
          results.push({
            connectionId: connection.id,
            connectionName: connection.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        console.log(`[Server Auto Sync] Skipping ${connection.name} - recently synced (Last: ${lastSync.toISOString()}) - Next sync in ${Math.ceil((thresholdTime.getTime() + intervalMs - now.getTime()) / 60000)} minutes`);
      }
    }

    console.log('[Server Auto Sync] Completed batch sync:', results);

  } catch (error) {
    console.error('[Server Auto Sync] Error in batch sync:', error);
  }
}

// 라이브러리 동기화 로직 (API 엔드포인트와 동일한 로직)
async function performLibrarySync(apiConnection: any) {
  try {
    // 시스템 사용자 ID 조회
    const systemUserResult = await query(
      `SELECT id FROM users WHERE email = 'admin@guardianx.com' LIMIT 1`
    );
    
    if (systemUserResult.rows.length === 0) {
      throw new Error('System user not found');
    }
    
    const userId = systemUserResult.rows[0].id;

    // Create sync history record (서버 자동 동기화)
    const syncHistoryResult = await query(
      `INSERT INTO sync_history (api_connection_id, initiated_by, status, execution_type)
       VALUES ($1, $2, 'running', 'auto')
       RETURNING id`,
      [apiConnection.id, userId]
    );

    const syncHistoryId = syncHistoryResult.rows[0].id;

    try {
      // Fetch data from external API
      const response = await fetch(apiConnection.api_url);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const apiData = await response.json();
      if (!Array.isArray(apiData)) {
        throw new Error('API response is not an array');
      }

      const fieldMappings = apiConnection.field_mappings || {};
      let recordsProcessed = 0;
      let recordsAdded = 0;
      let recordsUpdated = 0;
      let recordsDeactivated = 0;

      // Get existing libraries
      const existingLibrariesResult = await query(
        `SELECT id, name, status, deleted_at, deletion_reason 
         FROM libraries WHERE tenant_id = $1`,
        [apiConnection.tenant_id]
      );
      
      const existingLibraries = new Map(
        existingLibrariesResult.rows.map(lib => [lib.name, { 
          id: lib.id, 
          status: lib.status, 
          deleted_at: lib.deleted_at,
          deletion_reason: lib.deletion_reason
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

        // Ensure required fields
        if (!mappedData.name) {
          console.warn('[Server Auto Sync] Skipping record without name:', apiRecord);
          continue;
        }

        processedLibraries.add(mappedData.name);

        // Check if library exists
        const existingLibrary = existingLibraries.get(mappedData.name);

        if (existingLibrary) {
          // Update existing library (restore if deleted)
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

          // Only update fields that have mappings in the API response
          if (mappedData.hasOwnProperty('version')) {
            updateFields.push(`version = $${paramIndex++}`);
            updateValues.push(mappedData.version || '-');
          }
          if (mappedData.hasOwnProperty('vendor')) {
            updateFields.push(`vendor = $${paramIndex++}`);
            updateValues.push(mappedData.vendor || '-');
          }
          if (mappedData.hasOwnProperty('type')) {
            updateFields.push(`type = $${paramIndex++}`);
            updateValues.push(mappedData.type || 'software');
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
            console.log(`[Server Auto Sync] Restored ${mappedData.name} - found in API again`);
            recordsAdded++;
          } else {
            recordsUpdated++;
          }
        } else {
          // Insert new library - only include fields that have mappings, use defaults for others
          const insertFields = ['name', 'status', 'tenant_id', 'created_by'];
          const insertValues = [mappedData.name, 'active', apiConnection.tenant_id, userId];
          const placeholders = ['$1', '$2', '$3', '$4'];
          let paramIndex = 5;

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
          if (mappedData.hasOwnProperty('type')) {
            insertFields.push('type');
            insertValues.push(mappedData.type || 'software');
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
      for (const [libraryName, libraryInfo] of existingLibraries) {
        if (!processedLibraries.has(libraryName) && 
            libraryInfo.status === 'active' && 
            !libraryInfo.deleted_at) {
          await query(
            `UPDATE libraries 
             SET deleted_at = CURRENT_TIMESTAMP, 
                 deletion_reason = 'Auto-sync deactivation', 
                 status = 'inactive', 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [libraryInfo.id]
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
          `서버 자동 동기화 완료: ${recordsAdded}개 추가, ${recordsUpdated}개 업데이트, ${recordsDeactivated}개 비활성화`,
          apiConnection.id
        ]
      );

      return {
        success: true,
        message: '서버 자동 동기화가 완료되었습니다.',
        stats: {
          recordsProcessed,
          recordsAdded,
          recordsUpdated,
          recordsDeactivated
        }
      };

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
        [syncError instanceof Error ? syncError.message : 'Server auto-sync failed', apiConnection.id]
      );

      throw syncError;
    }

  } catch (error) {
    console.error('[Server Auto Sync] Sync error:', error);
    throw error;
  }
}

// 디바이스 동기화 로직 (API 엔드포인트와 동일한 로직)
async function performDeviceSync(apiConnection: any) {
  try {
    // 시스템 사용자 ID 조회
    const systemUserResult = await query(
      `SELECT id FROM users WHERE email = 'admin@guardianx.com' LIMIT 1`
    );
    
    if (systemUserResult.rows.length === 0) {
      throw new Error('System user not found');
    }
    
    const userId = systemUserResult.rows[0].id;

    // Create sync history record (서버 자동 동기화)
    const syncHistoryResult = await query(
      `INSERT INTO sync_history (api_connection_id, initiated_by, status, execution_type)
       VALUES ($1, $2, 'running', 'auto')
       RETURNING id`,
      [apiConnection.id, userId]
    );

    const syncHistoryId = syncHistoryResult.rows[0].id;

    try {
      // Fetch data from external API
      const response = await fetch(apiConnection.api_url);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const apiData = await response.json();
      if (!Array.isArray(apiData)) {
        throw new Error('API response is not an array');
      }

      const fieldMappings = apiConnection.field_mappings || {};
      let recordsProcessed = 0;
      let recordsAdded = 0;
      let recordsUpdated = 0;
      let recordsDeactivated = 0;

      // Get existing devices
      const existingDevicesResult = await query(
        `SELECT id, name, status 
         FROM devices WHERE is_active = true`,
        []
      );
      
      const existingDevices = new Map(
        existingDevicesResult.rows.map(device => [device.name, { 
          id: device.id, 
          status: device.status
        }])
      );
      const processedDevices = new Set<string>();

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

        // Ensure required fields
        if (!mappedData.name) {
          console.warn('[Server Auto Sync] Skipping device record without name:', apiRecord);
          continue;
        }

        processedDevices.add(mappedData.name);

        // Check if device exists
        const existingDevice = existingDevices.get(mappedData.name);

        if (existingDevice) {
          // Update existing device (reactivate if inactive)
          const wasInactive = existingDevice.status === 'inactive';
          
          // Build dynamic UPDATE query - only update fields that have mappings
          const updateFields: string[] = [];
          const updateValues: any[] = [];
          let paramIndex = 1;

          // Always update status to active and updated timestamp
          updateFields.push('status = $' + paramIndex++);
          updateValues.push('active');
          updateFields.push('updated_at = CURRENT_TIMESTAMP');
          updateFields.push('is_active = true');

          // Only update fields that have mappings in the API response and exist in DB schema
          if (mappedData.hasOwnProperty('device_type')) {
            updateFields.push(`device_type = $${paramIndex++}`);
            updateValues.push(mappedData.device_type || 'server');
          }
          if (mappedData.hasOwnProperty('description')) {
            updateFields.push(`description = $${paramIndex++}`);
            updateValues.push(mappedData.description || '');
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
          if (mappedData.hasOwnProperty('rack_size')) {
            updateFields.push(`rack_size = $${paramIndex++}`);
            updateValues.push(mappedData.rack_size ? parseInt(mappedData.rack_size) : 1);
          }
          if (mappedData.hasOwnProperty('power_consumption')) {
            updateFields.push(`power_consumption = $${paramIndex++}`);
            updateValues.push(mappedData.power_consumption ? parseInt(mappedData.power_consumption) : null);
          }

          // Add the device ID as the final parameter
          updateValues.push(existingDevice.id);

          const updateQuery = `UPDATE devices SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
          
          await query(updateQuery, updateValues);
          
          if (wasInactive) {
            console.log(`[Server Auto Sync] Reactivated device ${mappedData.name} - found in API again`);
            recordsAdded++;
          } else {
            recordsUpdated++;
          }
        } else {
          // Insert new device - only include fields that have mappings, use defaults for others
          const insertFields = ['name', 'device_type', 'status', 'created_by'];
          const insertValues = [mappedData.name, mappedData.device_type || 'server', 'active', userId];
          const placeholders = ['$1', '$2', '$3', '$4'];
          let paramIndex = 5;

          // Only include additional fields that have mappings in the API response and exist in DB schema
          if (mappedData.hasOwnProperty('description')) {
            insertFields.push('description');
            insertValues.push(mappedData.description || '');
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
          if (mappedData.hasOwnProperty('rack_size')) {
            insertFields.push('rack_size');
            insertValues.push(mappedData.rack_size ? parseInt(mappedData.rack_size) : 1);
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('power_consumption')) {
            insertFields.push('power_consumption');
            insertValues.push(mappedData.power_consumption ? parseInt(mappedData.power_consumption) : null);
            placeholders.push(`$${paramIndex++}`);
          }

          const insertQuery = `INSERT INTO devices (${insertFields.join(', ')}) VALUES (${placeholders.join(', ')})`;
          
          await query(insertQuery, insertValues);
          recordsAdded++;
        }
      }

      // Deactivate devices that are no longer in the API response
      for (const [deviceName, deviceInfo] of existingDevices) {
        if (!processedDevices.has(deviceName) && 
            deviceInfo.status === 'active') {
          await query(
            `UPDATE devices 
             SET status = 'inactive', 
                 is_active = false,
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [deviceInfo.id]
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
          `서버 자동 동기화 완료: ${recordsAdded}개 추가, ${recordsUpdated}개 업데이트, ${recordsDeactivated}개 비활성화`,
          apiConnection.id
        ]
      );

      return {
        success: true,
        message: '서버 자동 동기화가 완료되었습니다.',
        stats: {
          recordsProcessed,
          recordsAdded,
          recordsUpdated,
          recordsDeactivated
        }
      };

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
        [syncError instanceof Error ? syncError.message : 'Server auto-sync failed', apiConnection.id]
      );

      throw syncError;
    }

  } catch (error) {
    console.error('[Server Auto Sync] Device sync error:', error);
    throw error;
  }
}

// 담당자 동기화 로직 (API 엔드포인트와 동일한 로직)
async function performContactSync(apiConnection: any) {
  try {
    // 시스템 사용자 ID 조회
    const systemUserResult = await query(
      `SELECT id FROM users WHERE email = 'admin@guardianx.com' LIMIT 1`
    );
    
    if (systemUserResult.rows.length === 0) {
      throw new Error('System user not found');
    }

    const userId = systemUserResult.rows[0].id;

    // Create sync history record
    const syncHistoryResult = await query(
      `INSERT INTO sync_history (api_connection_id, initiated_by, status, execution_type)
       VALUES ($1, $2, 'running', 'auto')
       RETURNING id`,
      [apiConnection.id, userId]
    );

    const syncHistoryId = syncHistoryResult.rows[0].id;

    try {
      // Fetch data from external API
      const response = await fetch(apiConnection.api_url);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const apiData = await response.json();
      if (!Array.isArray(apiData)) {
        throw new Error('API response is not an array');
      }

      const fieldMappings = apiConnection.field_mappings || {};
      let recordsProcessed = 0;
      let recordsAdded = 0;
      let recordsUpdated = 0;

      // Get existing contacts by email to check for updates (not for deactivation)
      const existingContactsResult = await query(
        `SELECT id, email, name, status 
         FROM contacts 
         WHERE status = 'active'`,
        []
      );
      
      const existingContacts = new Map(
        existingContactsResult.rows.map(contact => [contact.email, { 
          id: contact.id, 
          name: contact.name,
          status: contact.status
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

        // Ensure required fields (email is the unique identifier)
        if (!mappedData.email) {
          continue;
        }

        // Check if contact exists
        const existingContact = existingContacts.get(mappedData.email);

        if (existingContact) {
          // Update existing contact
          const updateFields: string[] = [];
          const updateValues: any[] = [];
          let paramIndex = 1;

          updateFields.push('updated_at = CURRENT_TIMESTAMP');
          updateFields.push('status = \'active\'');

          // Only update fields that have mappings in the API response and exist in DB
          if (mappedData.hasOwnProperty('name')) {
            updateFields.push(`name = $${paramIndex++}`);
            updateValues.push(mappedData.name || '');
          }
          if (mappedData.hasOwnProperty('phone')) {
            updateFields.push(`phone = $${paramIndex++}`);
            updateValues.push(mappedData.phone || '');
          }
          if (mappedData.hasOwnProperty('department')) {
            updateFields.push(`department = $${paramIndex++}`);
            updateValues.push(mappedData.department || '');
          }
          if (mappedData.hasOwnProperty('position')) {
            updateFields.push(`position = $${paramIndex++}`);
            updateValues.push(mappedData.position || '');
          }
          if (mappedData.hasOwnProperty('company')) {
            updateFields.push(`company = $${paramIndex++}`);
            updateValues.push(mappedData.company || '');
          }

          // Add the contact ID as the final parameter
          updateValues.push(existingContact.id);

          const updateQuery = `UPDATE contacts SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
          
          await query(updateQuery, updateValues);
          recordsUpdated++;
        } else {
          // Insert new contact
          const insertFields = ['email', 'tenant_id'];
          const insertValues = [mappedData.email, apiConnection.tenant_id];
          const placeholders = ['$1', '$2'];
          let paramIndex = 3;

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
          if (mappedData.hasOwnProperty('department')) {
            insertFields.push('department');
            insertValues.push(mappedData.department || '');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('position')) {
            insertFields.push('position');
            insertValues.push(mappedData.position || '');
            placeholders.push(`$${paramIndex++}`);
          }
          if (mappedData.hasOwnProperty('company')) {
            insertFields.push('company');
            insertValues.push(mappedData.company || '');
            placeholders.push(`$${paramIndex++}`);
          }

          const insertQuery = `INSERT INTO contacts (${insertFields.join(', ')}) VALUES (${placeholders.join(', ')})`;
          
          await query(insertQuery, insertValues);
          recordsAdded++;
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
          `서버 자동 동기화 완료: ${recordsAdded}개 추가, ${recordsUpdated}개 업데이트`,
          apiConnection.id
        ]
      );

      return {
        success: true,
        message: '서버 자동 동기화가 완료되었습니다.',
        stats: {
          recordsProcessed,
          recordsAdded,
          recordsUpdated,
          recordsDeactivated: 0
        }
      };

    } catch (syncError) {
      // Update sync history with error
      await query(
        `UPDATE sync_history 
         SET status = 'failed', 
             sync_completed_at = CURRENT_TIMESTAMP,
             error_message = $1
         WHERE id = $2`,
        [
          syncError instanceof Error ? syncError.message : 'Unknown error',
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
          syncError instanceof Error ? syncError.message : 'Unknown error',
          apiConnection.id
        ]
      );

      throw syncError;
    }

  } catch (error) {
    console.error('[Server Auto Sync] Contact sync error:', error);
    throw error;
  }
}