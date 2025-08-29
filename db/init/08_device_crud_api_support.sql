-- 디바이스 CRUD API 지원 쿼리들
-- 실행 날짜: 2025-08-14
-- 목적: 디바이스 관리 페이지의 생성/수정/삭제 기능 지원을 위한 쿼리들

-- 1. 디바이스 목록 조회 (필터링 포함)
-- 사용: GET /api/ipam/devices
-- 테넌트별 디바이스 목록을 IP 정보와 함께 조회
SELECT 
  d.id, d.name, d.description, d.device_type, d.manufacturer, d.model,
  d.serial_number, d.rack_position, d.rack_size, d.power_consumption,
  d.status, d.purchase_date, d.warranty_end, d.created_at,
  r.id as rack_id, r.name as rack_name,
  sr.name as server_room_name,
  o.name as office_name,
  -- Get primary IP address
  (SELECT ip.ip_address::text 
   FROM device_ip_mappings dim 
   JOIN ip_addresses ip ON dim.ip_address_id = ip.id 
   WHERE dim.device_id = d.id AND dim.is_primary = true 
   LIMIT 1) as primary_ip,
  -- Get all assigned IP addresses
  ARRAY(SELECT ip.ip_address::text 
        FROM device_ip_mappings dim 
        JOIN ip_addresses ip ON dim.ip_address_id = ip.id 
        WHERE dim.device_id = d.id) as assigned_ips
FROM devices d
LEFT JOIN racks r ON d.rack_id = r.id
LEFT JOIN server_rooms sr ON r.server_room_id = sr.id
LEFT JOIN offices o ON sr.office_id = o.id
WHERE d.is_active = true AND (o.tenant_id = $1 OR d.rack_id IS NULL)
ORDER BY d.created_at DESC
LIMIT $2 OFFSET $3;

-- 2. 디바이스 상세 조회
-- 사용: GET /api/ipam/devices?id=device_id
SELECT 
  d.id, d.name, d.description, d.device_type, d.manufacturer, d.model,
  d.serial_number, d.rack_position, d.rack_size, d.power_consumption,
  d.status, d.purchase_date, d.warranty_end, d.created_at, d.updated_at,
  r.id as rack_id, r.name as rack_name,
  sr.name as server_room_name,
  o.name as office_name,
  -- Get primary IP address
  (SELECT ip.ip_address::text 
   FROM device_ip_mappings dim 
   JOIN ip_addresses ip ON dim.ip_address_id = ip.id 
   WHERE dim.device_id = d.id AND dim.is_primary = true 
   LIMIT 1) as primary_ip,
  -- Get all assigned IP addresses
  ARRAY(SELECT ip.ip_address::text 
        FROM device_ip_mappings dim 
        JOIN ip_addresses ip ON dim.ip_address_id = ip.id 
        WHERE dim.device_id = d.id) as assigned_ips
FROM devices d
LEFT JOIN racks r ON d.rack_id = r.id
LEFT JOIN server_rooms sr ON r.server_room_id = sr.id
LEFT JOIN offices o ON sr.office_id = o.id
WHERE d.id = $1 AND d.is_active = true
  AND (o.tenant_id = $2 OR d.rack_id IS NULL);

-- 3. 디바이스 생성
-- 사용: POST /api/ipam/devices
INSERT INTO devices (
  rack_id, name, description, device_type, manufacturer, model,
  serial_number, rack_position, rack_size, power_consumption,
  status, purchase_date, warranty_end, created_by
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
RETURNING id, name, description, device_type, manufacturer, model, 
          serial_number, rack_position, rack_size, power_consumption,
          status, purchase_date, warranty_end, created_at;

-- 4. 디바이스 수정
-- 사용: PUT /api/ipam/devices?id=device_id
UPDATE devices SET
  rack_id = $1,
  name = $2,
  description = $3,
  device_type = $4,
  manufacturer = $5,
  model = $6,
  serial_number = $7,
  rack_position = $8,
  rack_size = $9,
  power_consumption = $10,
  status = $11,
  purchase_date = $12,
  warranty_end = $13,
  updated_at = CURRENT_TIMESTAMP
WHERE id = $14
RETURNING id, name, description, device_type, manufacturer, model, 
          serial_number, rack_position, rack_size, power_consumption,
          status, purchase_date, warranty_end, updated_at;

-- 5. 디바이스 삭제 전 IP 매핑 확인
-- 사용: DELETE /api/ipam/devices?id=device_id (안전 확인용)
SELECT COUNT(*) as count FROM device_ip_mappings WHERE device_id = $1;

-- 6. 디바이스 소프트 삭제
-- 사용: DELETE /api/ipam/devices?id=device_id
UPDATE devices 
SET is_active = false, updated_at = CURRENT_TIMESTAMP 
WHERE id = $1;

-- 7. 랙 소속 확인 (테넌트 권한 검증용)
-- 사용: 디바이스 생성/수정 시 랙 권한 확인
SELECT r.id FROM racks r
JOIN server_rooms sr ON r.server_room_id = sr.id
JOIN offices o ON sr.office_id = o.id
WHERE r.id = $1 AND o.tenant_id = $2;

-- 8. 디바이스 소속 확인 (테넌트 권한 검증용)
-- 사용: 수정/삭제 시 디바이스 권한 확인
SELECT d.id FROM devices d
LEFT JOIN racks r ON d.rack_id = r.id
LEFT JOIN server_rooms sr ON r.server_room_id = sr.id
LEFT JOIN offices o ON sr.office_id = o.id
WHERE d.id = $1 AND d.is_active = true
  AND (o.tenant_id = $2 OR d.rack_id IS NULL);

-- 참고사항:
-- - 모든 쿼리는 테넌트 기반 접근 제어를 적용합니다
-- - is_active 필드를 사용한 소프트 삭제를 구현합니다
-- - IP 매핑이 있는 디바이스는 삭제를 제한합니다
-- - 랙에 속하지 않은 디바이스도 지원합니다 (rack_id IS NULL)
-- - 모든 날짜 필드는 CURRENT_TIMESTAMP로 자동 업데이트됩니다