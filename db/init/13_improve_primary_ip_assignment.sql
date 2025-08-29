-- Primary IP 자동 할당 로직 개선
-- 실행 날짜: 2025-08-14
-- 목적: 디바이스에 첫 번째 IP 할당 시 자동으로 primary로 설정

-- 문제:
-- IP 할당 시 is_primary = false로 설정되어 디바이스 목록에서 "할당된 IP 없음"으로 표시됨
-- 사용자가 수동으로 primary IP를 설정해야 했음

-- 해결책:
-- API에서 디바이스에 기존 primary IP가 없으면 새로 할당하는 IP를 자동으로 primary로 설정

-- 기존에 primary가 없는 디바이스들 수정
UPDATE device_ip_mappings 
SET is_primary = true 
WHERE id = 'a624f018-90bc-425a-8787-998b5f61d807'; -- shawn-1의 192.168.130.8

-- 개선된 API 로직 (POST /api/ipam/device-ip-mappings):
-- 1. 기존 primary IP 확인
-- 2. primary IP가 없으면 새 IP를 자동으로 primary로 설정
-- 3. primary IP가 있으면 보조 IP로 설정 (명시적으로 primary 요청한 경우 제외)

-- 확인 쿼리:
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
-- WHERE d.name LIKE 'shawn%';

-- 예상 결과:
-- 모든 IP가 할당된 디바이스는 primary IP를 가져야 함
-- 디바이스 목록에서 "할당된 IP 없음" 메시지가 사라져야 함

-- UI 개선사항:
-- 첫 번째 IP 할당 시: "주 IP로 할당" 버튼 표시
-- 추가 IP 할당 시: "보조 IP로 할당" + "주 IP로 변경" 버튼 표시