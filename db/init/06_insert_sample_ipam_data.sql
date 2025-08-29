-- IPAM 샘플 데이터 삽입
-- 실행 날짜: 2025-08-14
-- 목적: IP 대역 및 IP 주소 관리 기능 테스트를 위한 샘플 데이터

-- 1. 샘플 IP 대역 추가 (Mgmt 대역)
INSERT INTO ip_ranges (tenant_id, name, description, network_address, subnet_mask, gateway, vlan_id, ip_version, created_by)
SELECT 
  '449b62fe-f392-4299-a58a-8dd15dafd696' as tenant_id,
  'Mgmt 대역' as name,
  '관리용 네트워크 대역' as description,
  '192.168.130.0' as network_address,
  24 as subnet_mask,
  '192.168.130.1' as gateway,
  100 as vlan_id,
  4 as ip_version,
  u.id as created_by
FROM users u 
WHERE u.current_tenant_id = '449b62fe-f392-4299-a58a-8dd15dafd696'
LIMIT 1;

-- 2. 샘플 IP 주소들 추가 (CloudGuard IPAM 스타일)
WITH ip_range AS (
  SELECT id, created_by FROM ip_ranges WHERE network_address = '192.168.130.0' LIMIT 1
)
INSERT INTO ip_addresses (ip_range_id, ip_address, status, description, created_by)
SELECT 
  ir.id as ip_range_id,
  address::inet as ip_address,
  status,
  description,
  ir.created_by
FROM ip_range ir,
(VALUES
  ('192.168.130.3', 'allocated', 'Assigned to device: Cesar Schroeder'),
  ('192.168.130.4', 'allocated', 'Assigned to device: Shawn'),
  ('192.168.130.5', 'available', NULL),
  ('192.168.130.6', 'available', NULL),
  ('192.168.130.7', 'available', NULL),
  ('192.168.130.8', 'available', NULL),
  ('192.168.130.9', 'reserved', '예약된 IP 주소')
) AS sample_ips(address, status, description);

-- 참고사항:
-- - tenant_id '449b62fe-f392-4299-a58a-8dd15dafd696'는 'GuardianX Solutions' 테넌트입니다
-- - 실제 환경에서는 해당 테넌트 ID를 확인하여 적절히 수정해야 합니다
-- - IP 주소는 inet 타입으로, MAC 주소는 macaddr 타입으로 저장됩니다