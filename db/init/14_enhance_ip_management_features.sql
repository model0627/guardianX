-- IP 관리 기능 향상
-- 실행 날짜: 2025-08-14
-- 목적: 할당된 IP 주소의 편집/해제/재할당 기능 구현

-- 새로 추가된 기능들:

-- 1. 주 IP 변경 API 엔드포인트
-- POST /api/ipam/device-ip-mappings/set-primary
-- 디바이스의 특정 IP를 주 IP로 설정하고 나머지는 보조 IP로 변경

-- 주 IP 설정 쿼리:
-- 1) 해당 디바이스의 모든 IP를 보조로 설정
UPDATE device_ip_mappings 
SET is_primary = false 
WHERE device_id = $1;

-- 2) 지정된 매핑을 주 IP로 설정  
UPDATE device_ip_mappings 
SET is_primary = true, updated_at = CURRENT_TIMESTAMP
WHERE id = $2;

-- 2. 주 IP 해제 시 자동 승격 로직
-- 주 IP를 해제할 때 다른 IP가 있으면 자동으로 주 IP로 승격

-- 주 IP 삭제 후 자동 승격 쿼리:
UPDATE device_ip_mappings 
SET is_primary = true 
WHERE device_id = $1 
AND id = (
  SELECT id FROM device_ip_mappings 
  WHERE device_id = $1 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- 3. UI 개선사항:

-- 디바이스 목록 페이지:
-- - 할당된 IP 주소를 클릭 가능한 버튼으로 변경
-- - 추가 IP가 있는 경우 "+N개 추가 IP" 표시
-- - 호버 시 파란색 배경으로 클릭 가능함을 시각적으로 표시

-- IP 관리 모달:
-- - 할당된 IP 관리 탭에서 보조 IP 옆에 "주 IP로 설정" 버튼 추가
-- - 각 IP마다 해제 버튼 제공
-- - 실시간 상태 업데이트

-- 4. 사용성 개선:
-- - 할당된 IP가 있는 디바이스도 클릭하여 IP 관리 가능
-- - 주 IP 변경이 즉시 반영되어 디바이스 목록에서 확인 가능
-- - 주 IP를 해제해도 다른 IP가 자동으로 주 IP가 되어 "할당된 IP 없음" 상태 방지

-- 테스트 시나리오:
-- 1. shawn-1 디바이스의 IP 주소 클릭 → IP 관리 모달 열림
-- 2. 할당된 IP 관리 탭에서 보조 IP를 주 IP로 변경
-- 3. 기존 주 IP 해제 → 남은 IP가 자동으로 주 IP로 설정
-- 4. 새 IP 할당 → 기존 주 IP가 있으면 보조 IP로 할당

-- 참고사항:
-- - 디바이스는 항상 하나의 주 IP만 가질 수 있음
-- - 주 IP 해제 시 다른 IP가 있으면 자동으로 승격됨
-- - 모든 IP 해제 시에만 "할당된 IP 없음" 상태가 됨