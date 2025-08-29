-- 디바이스 IP 할당 기능 지원 쿼리들
-- 실행 날짜: 2025-08-14
-- 목적: 디바이스에 IP 주소 할당/해제 기능을 위한 쿼리들

-- 1. 디바이스 IP 매핑 조회
-- 사용: GET /api/ipam/device-ip-mappings?device_id=device_id
-- 특정 디바이스에 할당된 모든 IP 주소 조회
SELECT 
  dim.id,
  dim.device_id,
  dim.ip_address_id,
  dim.is_primary,
  dim.created_at,
  ip.ip_address,
  ip.status as ip_status,
  ir.network_address,
  ir.subnet_mask,
  ir.name as range_name
FROM device_ip_mappings dim
JOIN ip_addresses ip ON dim.ip_address_id = ip.id
JOIN ip_ranges ir ON ip.ip_range_id = ir.id
JOIN offices o ON ir.office_id = o.id
WHERE dim.device_id = $1 AND o.tenant_id = $2
ORDER BY dim.is_primary DESC, dim.created_at ASC;

-- 2. 사용 가능한 IP 주소 목록 조회
-- 사용: GET /api/ipam/available-ips
-- 테넌트에서 사용 가능한 IP 주소들을 조회
SELECT 
  ip.id,
  ip.ip_address,
  ip.status,
  ip.description,
  ir.network_address,
  ir.subnet_mask,
  ir.name as range_name,
  o.name as office_name,
  sr.name as server_room_name
FROM ip_addresses ip
JOIN ip_ranges ir ON ip.ip_range_id = ir.id
JOIN offices o ON ir.office_id = o.id
LEFT JOIN server_rooms sr ON ir.server_room_id = sr.id
WHERE o.tenant_id = $1 AND ip.status = 'available'
  -- 선택적 검색 조건: AND ip.ip_address::text ILIKE $2
ORDER BY ip.ip_address
LIMIT $3;

-- 3. 디바이스 권한 확인 (IP 할당용)
-- 사용: IP 할당/해제 시 디바이스가 테넌트에 속하는지 확인
SELECT d.id FROM devices d
LEFT JOIN racks r ON d.rack_id = r.id
LEFT JOIN server_rooms sr ON r.server_room_id = sr.id
LEFT JOIN offices o ON sr.office_id = o.id
WHERE d.id = $1 AND d.is_active = true
  AND (o.tenant_id = $2 OR d.rack_id IS NULL);

-- 4. IP 주소 권한 및 가용성 확인
-- 사용: IP 할당 전 IP 주소가 사용 가능한지 확인
SELECT ip.id, ip.status, ip.ip_address 
FROM ip_addresses ip
JOIN ip_ranges ir ON ip.ip_range_id = ir.id
JOIN offices o ON ir.office_id = o.id
WHERE ip.id = $1 AND o.tenant_id = $2;

-- 5. 기존 매핑 중복 확인
-- 사용: 동일한 디바이스-IP 매핑이 이미 존재하는지 확인
SELECT id FROM device_ip_mappings 
WHERE device_id = $1 AND ip_address_id = $2;

-- 6. 주 IP 설정 시 기존 주 IP 해제
-- 사용: 새로운 IP를 주 IP로 설정할 때 기존 주 IP 플래그 제거
UPDATE device_ip_mappings 
SET is_primary = false 
WHERE device_id = $1;

-- 7. 디바이스 IP 매핑 생성
-- 사용: POST /api/ipam/device-ip-mappings
INSERT INTO device_ip_mappings (device_id, ip_address_id, is_primary)
VALUES ($1, $2, $3)
RETURNING id, device_id, ip_address_id, is_primary, created_at;

-- 8. IP 주소 상태를 할당됨으로 변경
-- 사용: IP 할당 후 IP 주소 상태 업데이트
UPDATE ip_addresses 
SET status = 'assigned', updated_at = CURRENT_TIMESTAMP
WHERE id = $1;

-- 9. IP 매핑 권한 확인 (해제용)
-- 사용: IP 해제 시 매핑이 테넌트에 속하는지 확인
SELECT dim.id, dim.ip_address_id, dim.device_id
FROM device_ip_mappings dim
JOIN ip_addresses ip ON dim.ip_address_id = ip.id
JOIN ip_ranges ir ON ip.ip_range_id = ir.id
JOIN offices o ON ir.office_id = o.id
WHERE dim.id = $1 AND o.tenant_id = $2;

-- 10. 디바이스 IP 매핑 삭제
-- 사용: DELETE /api/ipam/device-ip-mappings?mapping_id=mapping_id
DELETE FROM device_ip_mappings WHERE id = $1;

-- 11. IP 주소 상태를 사용가능으로 복원
-- 사용: IP 해제 후 IP 주소 상태 복원
UPDATE ip_addresses 
SET status = 'available', updated_at = CURRENT_TIMESTAMP
WHERE id = $1;

-- 참고사항:
-- - 모든 작업은 테넌트 기반 권한 제어를 적용합니다
-- - 주 IP는 디바이스당 하나만 설정할 수 있습니다
-- - IP 할당 시 자동으로 IP 상태가 'assigned'로 변경됩니다
-- - IP 해제 시 자동으로 IP 상태가 'available'로 복원됩니다
-- - 중복 할당을 방지하기 위해 기존 매핑을 확인합니다
-- - 사용 가능한 IP만 할당할 수 있습니다 (status = 'available')