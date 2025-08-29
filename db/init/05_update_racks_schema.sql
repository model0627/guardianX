-- 랙 테이블 스키마 업데이트: IPAM 랙 관리를 위한 필드 추가
-- 실행 날짜: 2025-08-14
-- 목적: rack_number, size_u, used_u 필드 추가로 IPAM 랙 관리 기능 지원

-- 랙 번호 필드 추가 (선택적)
ALTER TABLE racks ADD COLUMN IF NOT EXISTS rack_number VARCHAR(50);

-- 랙 크기 (U 단위) 필드 추가
ALTER TABLE racks ADD COLUMN IF NOT EXISTS size_u INTEGER DEFAULT 42;

-- 사용중인 U 단위 필드 추가  
ALTER TABLE racks ADD COLUMN IF NOT EXISTS used_u INTEGER DEFAULT 0;

-- 기존 데이터 마이그레이션: rack_height 값을 size_u로 복사
UPDATE racks SET size_u = COALESCE(rack_height, 42) WHERE size_u IS NULL;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_racks_rack_number ON racks(rack_number);
CREATE INDEX IF NOT EXISTS idx_racks_size_u ON racks(size_u);
CREATE INDEX IF NOT EXISTS idx_racks_used_u ON racks(used_u);

-- 제약 조건 추가
ALTER TABLE racks ADD CONSTRAINT check_size_u_positive CHECK (size_u > 0);
ALTER TABLE racks ADD CONSTRAINT check_used_u_not_negative CHECK (used_u >= 0);
ALTER TABLE racks ADD CONSTRAINT check_used_u_not_exceed_size CHECK (used_u <= size_u);

-- 코멘트 추가
COMMENT ON COLUMN racks.rack_number IS '랙 식별 번호 (예: RC-001, A10)';
COMMENT ON COLUMN racks.size_u IS '랙 전체 크기 (U 단위, 기본값: 42U)';
COMMENT ON COLUMN racks.used_u IS '현재 사용중인 U 크기 (기본값: 0U)';