-- 디바이스 목록에서 IP 주소 표시 문제 해결
-- 실행 날짜: 2025-08-14
-- 목적: 디바이스 목록에서 IP 주소가 올바르게 표시되도록 수정

-- 문제들:
-- 1. IP 주소가 서브넷 마스크 포함하여 표시됨 (192.168.130.4/32)
-- 2. 중복된 디바이스명으로 인한 혼란
-- 3. Primary IP 설정 누락

-- 해결책:

-- 1. IP 주소 표시에서 서브넷 마스크 제거
-- API 쿼리에서 ip.ip_address::text 대신 host(ip.ip_address) 사용
-- 변경된 부분: GET /api/ipam/devices 쿼리
SELECT host(ip.ip_address) 
FROM device_ip_mappings dim 
JOIN ip_addresses ip ON dim.ip_address_id = ip.id 
WHERE dim.device_id = d.id AND dim.is_primary = true 
LIMIT 1;

-- 2. Primary IP 누락 문제 해결
-- Shawn-2 디바이스의 IP를 primary로 설정
UPDATE device_ip_mappings 
SET is_primary = true 
WHERE device_id = '2b495544-e4e9-4dfa-8e92-98401c3bd9a3' 
  AND ip_address_id = (SELECT id FROM ip_addresses WHERE ip_address = '192.168.130.5'::inet);

-- 3. 중복된 디바이스명 해결
-- 두 번째 Shawn 디바이스를 Shawn-2로 변경
UPDATE devices 
SET name = 'Shawn-2' 
WHERE id = '2b495544-e4e9-4dfa-8e92-98401c3bd9a3';

-- 최종 확인 쿼리:
-- SELECT d.name, 
--        (SELECT host(ip.ip_address) 
--         FROM device_ip_mappings dim 
--         JOIN ip_addresses ip ON dim.ip_address_id = ip.id 
--         WHERE dim.device_id = d.id AND dim.is_primary = true 
--         LIMIT 1) as primary_ip,
--        ARRAY(SELECT host(ip.ip_address) 
--              FROM device_ip_mappings dim 
--              JOIN ip_addresses ip ON dim.ip_address_id = ip.id 
--              WHERE dim.device_id = d.id) as assigned_ips
-- FROM devices d 
-- WHERE d.name IN ('Shawn', 'Shawn-2');

-- 결과:
-- name   | primary_ip    | assigned_ips
-- Shawn  | 192.168.130.4 | {192.168.130.4}
-- Shawn-2| 192.168.130.5 | {192.168.130.5}

-- 참고사항:
-- - host() 함수는 INET 타입에서 IP 주소만 추출 (서브넷 마스크 제거)
-- - Primary IP는 디바이스당 하나만 설정되어야 함
-- - 디바이스명은 고유하게 유지하는 것이 좋음