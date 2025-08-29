-- 디바이스 관리 샘플 데이터 삽입
-- 실행 날짜: 2025-08-14
-- 목적: 디바이스 관리 기능 테스트를 위한 샘플 디바이스 및 IP 매핑 데이터

-- 1. 샘플 디바이스 추가 (CloudGuard IPAM 스타일)
WITH user_info AS (
  SELECT id FROM users WHERE current_tenant_id = '449b62fe-f392-4299-a58a-8dd15dafd696' LIMIT 1
)
INSERT INTO devices (name, description, device_type, manufacturer, model, serial_number, rack_size, status, created_by)
SELECT 'Shawn', '관리용 서버', 'server', 'Dell', 'model 1', '14', 1, 'active', ui.id
FROM user_info ui;

WITH user_info AS (
  SELECT id FROM users WHERE current_tenant_id = '449b62fe-f392-4299-a58a-8dd15dafd696' LIMIT 1
)
INSERT INTO devices (name, description, device_type, manufacturer, model, serial_number, rack_size, status, created_by)
SELECT 'shawn-1', '백업 서버', 'server', 'Dell', 'model 1', '14', 1, 'inactive', ui.id
FROM user_info ui;

WITH user_info AS (
  SELECT id FROM users WHERE current_tenant_id = '449b62fe-f392-4299-a58a-8dd15dafd696' LIMIT 1
)
INSERT INTO devices (name, description, device_type, manufacturer, model, serial_number, rack_size, status, created_by)
SELECT 'Dr. Jessica Brown', '네트워크 스위치', 'server', 'Cisco', 'model 2', '97', 1, 'inactive', ui.id
FROM user_info ui;

WITH user_info AS (
  SELECT id FROM users WHERE current_tenant_id = '449b62fe-f392-4299-a58a-8dd15dafd696' LIMIT 1
)
INSERT INTO devices (name, description, device_type, manufacturer, model, serial_number, rack_size, status, created_by)
SELECT 'Cesar Schroeder', '코어 스위치', 'server', 'HP', 'model 1', '14', 1, 'active', ui.id
FROM user_info ui;

-- 2. 디바이스-IP 주소 매핑 (샘플 이미지 기준)
-- Shawn 디바이스에 192.168.130.4 할당
INSERT INTO device_ip_mappings (device_id, ip_address_id, is_primary)
SELECT 
  (SELECT id FROM devices WHERE name = 'Shawn' LIMIT 1) as device_id,
  (SELECT id FROM ip_addresses WHERE ip_address = '192.168.130.4'::inet LIMIT 1) as ip_address_id,
  true as is_primary;

-- Cesar Schroeder 디바이스에 192.168.130.3 할당  
INSERT INTO device_ip_mappings (device_id, ip_address_id, is_primary)
SELECT 
  (SELECT id FROM devices WHERE name = 'Cesar Schroeder' LIMIT 1) as device_id,
  (SELECT id FROM ip_addresses WHERE ip_address = '192.168.130.3'::inet LIMIT 1) as ip_address_id,
  true as is_primary;

-- 참고사항:
-- - tenant_id '449b62fe-f392-4299-a58a-8dd15dafd696'는 'GuardianX Solutions' 테넌트입니다
-- - 디바이스 타입은 server, switch, router, storage, firewall 등을 사용할 수 있습니다
-- - 디바이스-IP 매핑을 통해 IPAM 시스템과 연동됩니다
-- - is_primary 필드로 주 IP 주소를 구분합니다