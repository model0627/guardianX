-- 동기화 히스토리에 실행 형태 필드 추가
ALTER TABLE sync_history 
ADD COLUMN execution_type VARCHAR(20) DEFAULT 'manual' CHECK (execution_type IN ('manual', 'auto'));

-- 기존 데이터를 manual로 설정
UPDATE sync_history SET execution_type = 'manual' WHERE execution_type IS NULL;

-- execution_type을 NOT NULL로 변경
ALTER TABLE sync_history ALTER COLUMN execution_type SET NOT NULL;

-- 인덱스 추가 (성능 개선)
CREATE INDEX idx_sync_history_execution_type ON sync_history(execution_type);

-- 코멘트 추가
COMMENT ON COLUMN sync_history.execution_type IS '동기화 실행 형태: manual(수동), auto(자동)';