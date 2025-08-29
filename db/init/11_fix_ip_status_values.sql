-- IP 주소 상태 값 수정
-- 실행 날짜: 2025-08-14
-- 목적: IP 할당 시 올바른 상태 값 사용하도록 수정

-- 문제: API에서 IP 할당 시 'assigned' 상태로 업데이트하려 했으나,
--       ip_addresses 테이블의 체크 제약조건에서는 'assigned' 값을 허용하지 않음

-- ip_addresses 테이블의 허용된 상태 값들:
-- 'available', 'allocated', 'reserved', 'disabled'

-- 1. 기존에 'assigned'로 시도했던 부분을 'allocated'로 수정
-- API: POST /api/ipam/device-ip-mappings (IP 할당)
UPDATE ip_addresses 
SET status = 'allocated', updated_at = CURRENT_TIMESTAMP
WHERE id = $1;

-- 2. IP 해제 시 상태 복원 (이미 올바름)
-- API: DELETE /api/ipam/device-ip-mappings (IP 해제)
UPDATE ip_addresses 
SET status = 'available', updated_at = CURRENT_TIMESTAMP
WHERE id = $1;

-- 3. 기존에 잘못 할당되었던 IP 상태 수정
UPDATE ip_addresses 
SET status = 'allocated', updated_at = CURRENT_TIMESTAMP 
WHERE ip_address = '192.168.130.5'::inet;

-- 확인 쿼리:
-- SELECT ip.ip_address, ip.status, dim.device_id, dim.is_primary 
-- FROM ip_addresses ip 
-- LEFT JOIN device_ip_mappings dim ON ip.id = dim.ip_address_id 
-- WHERE ip.ip_address = '192.168.130.5';

-- 결과: 
-- ip_address   |  status   |              device_id               | is_primary 
-- 192.168.130.5| allocated | 2b495544-e4e9-4dfa-8e92-98401c3bd9a3| f

-- 참고사항:
-- - IP 할당 시: 'available' → 'allocated'
-- - IP 해제 시: 'allocated' → 'available'
-- - 'reserved': 관리자가 예약한 IP (할당 불가)
-- - 'disabled': 비활성화된 IP (할당 불가)