-- IP 할당 API 테넌트 필터링 수정
-- 실행 날짜: 2025-08-14
-- 목적: IP 범위 테이블 구조에 맞게 테넌트 필터링 쿼리 수정

-- 문제: ip_ranges 테이블이 tenant_id를 직접 가지고 있는데, 
--       API에서 offices 테이블을 통해 조인하려고 했음

-- 1. 수정된 사용 가능한 IP 주소 조회 쿼리
-- 사용: GET /api/ipam/available-ips
-- 변경: offices 조인 제거, ip_ranges.tenant_id 직접 사용
SELECT 
  ip.id,
  ip.ip_address,
  ip.status,
  ip.description,
  ir.network_address,
  ir.subnet_mask,
  ir.name as range_name,
  '' as office_name,
  '' as server_room_name
FROM ip_addresses ip
JOIN ip_ranges ir ON ip.ip_range_id = ir.id
WHERE ir.tenant_id = $1 AND ip.status = 'available'
  -- 선택적 검색: AND ip.ip_address::text ILIKE $2
ORDER BY ip.ip_address
LIMIT $3;

-- 2. 수정된 디바이스 IP 매핑 조회 쿼리
-- 사용: GET /api/ipam/device-ip-mappings?device_id=device_id
-- 변경: offices 조인 제거, ip_ranges.tenant_id 직접 사용
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
WHERE dim.device_id = $1 AND ir.tenant_id = $2
ORDER BY dim.is_primary DESC, dim.created_at ASC;

-- 3. 수정된 IP 주소 권한 및 가용성 확인 쿼리
-- 사용: IP 할당 시 권한 확인
-- 변경: offices 조인 제거, ip_ranges.tenant_id 직접 사용
SELECT ip.id, ip.status, ip.ip_address 
FROM ip_addresses ip
JOIN ip_ranges ir ON ip.ip_range_id = ir.id
WHERE ip.id = $1 AND ir.tenant_id = $2;

-- 4. 수정된 IP 매핑 권한 확인 쿼리 (해제용)
-- 사용: IP 해제 시 매핑 권한 확인
-- 변경: offices 조인 제거, ip_ranges.tenant_id 직접 사용
SELECT dim.id, dim.ip_address_id, dim.device_id
FROM device_ip_mappings dim
JOIN ip_addresses ip ON dim.ip_address_id = ip.id
JOIN ip_ranges ir ON ip.ip_range_id = ir.id
WHERE dim.id = $1 AND ir.tenant_id = $2;

-- 테스트 쿼리 결과:
-- 테넌트 '449b62fe-f392-4299-a58a-8dd15dafd696'에서
-- 사용 가능한 IP 주소 4개 조회 확인:
-- - 192.168.130.5 (available)
-- - 192.168.130.6 (available) 
-- - 192.168.130.7 (available)
-- - 192.168.130.8 (available)

-- 참고사항:
-- - ip_ranges 테이블이 tenant_id를 직접 참조하므로 offices 테이블 조인 불필요
-- - 모든 IP 관련 권한 확인은 ip_ranges.tenant_id로 수행
-- - office_name, server_room_name은 현재 구조에서 직접 연결되지 않음