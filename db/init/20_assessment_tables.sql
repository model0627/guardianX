-- 평가 항목 관리를 위한 테이블들

-- 평가 항목 테이블
CREATE TABLE assessment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL, -- SEC-001, NET-001 등
    category VARCHAR(100) NOT NULL, -- 대분류 (계정 및 권한 관리, 네트워크 보안 등)
    subcategory VARCHAR(100) NOT NULL, -- 중분류 (계정 관리, 패스워드 정책 등)
    title VARCHAR(200) NOT NULL, -- 항목명
    description TEXT NOT NULL, -- 설명
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')), -- 심각도
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0', -- 버전
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'draft')), -- 상태
    compliance_standards TEXT[], -- 준수 표준 배열 (ISO27001, ISMS-P 등)
    check_type VARCHAR(20) NOT NULL DEFAULT 'automated' CHECK (check_type IN ('manual', 'automated', 'hybrid')), -- 점검 방식
    remediation TEXT NOT NULL, -- 조치 방법
    reference_links TEXT[], -- 참고 자료 배열
    tags TEXT[], -- 태그 배열
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- 인덱스와 제약조건
    UNIQUE(tenant_id, code), -- 테넌트 내에서 코드 중복 방지
    CONSTRAINT valid_version CHECK (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$') -- 버전 형식 검증
);

-- 평가 항목 버전 이력 테이블
CREATE TABLE assessment_item_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES assessment_items(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    changes TEXT, -- 변경 내용
    previous_data JSONB, -- 이전 버전 데이터
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- 체크리스트 테이블
CREATE TABLE assessment_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL, -- 체크리스트명
    description TEXT, -- 설명
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0', -- 버전
    category VARCHAR(100) NOT NULL, -- 카테고리 (서버, 네트워크, 애플리케이션 등)
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived')), -- 상태
    compliance_framework VARCHAR(100), -- 준수 프레임워크
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    last_used TIMESTAMP, -- 마지막 사용 시간
    usage_count INTEGER NOT NULL DEFAULT 0, -- 사용 횟수
    
    -- 제약조건
    CONSTRAINT valid_checklist_version CHECK (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$')
);

-- 체크리스트-항목 매핑 테이블 (다대다 관계)
CREATE TABLE checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    checklist_id UUID NOT NULL REFERENCES assessment_checklists(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES assessment_items(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0, -- 체크리스트 내 항목 순서
    is_required BOOLEAN NOT NULL DEFAULT TRUE, -- 필수 항목 여부
    custom_weight DECIMAL(3,2) DEFAULT 1.0, -- 가중치 (0.1 ~ 1.0)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 제약조건
    UNIQUE(checklist_id, item_id), -- 체크리스트 내 중복 항목 방지
    UNIQUE(checklist_id, order_index) -- 체크리스트 내 순서 중복 방지
);

-- 체크리스트 버전 이력 테이블
CREATE TABLE checklist_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    checklist_id UUID NOT NULL REFERENCES assessment_checklists(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    changes TEXT, -- 변경 내용
    item_snapshot JSONB, -- 해당 버전의 항목 스냅샷
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- 자산별 평가 실행 테이블
CREATE TABLE asset_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    checklist_id UUID NOT NULL REFERENCES assessment_checklists(id) ON DELETE CASCADE,
    asset_id VARCHAR(100) NOT NULL, -- IPAM 디바이스 ID 참조
    asset_name VARCHAR(200), -- 디바이스명 (캐시)
    asset_type VARCHAR(50), -- 디바이스 타입 (캐시)
    assessment_name VARCHAR(200) NOT NULL, -- 평가명
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    total_items INTEGER NOT NULL DEFAULT 0,
    passed_items INTEGER NOT NULL DEFAULT 0,
    failed_items INTEGER NOT NULL DEFAULT 0,
    skipped_items INTEGER NOT NULL DEFAULT 0,
    overall_score DECIMAL(5,2), -- 전체 점수 (0.00 ~ 100.00)
    risk_level VARCHAR(20) CHECK (risk_level IN ('critical', 'high', 'medium', 'low', 'info')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- 제약조건
    CONSTRAINT idx_asset_assessments_unique UNIQUE (tenant_id, asset_id, checklist_id, created_at)
);

-- 자산별 평가 결과 상세 테이블
CREATE TABLE asset_assessment_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES asset_assessments(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES assessment_items(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pass', 'fail', 'skip', 'not_applicable')), -- 개별 항목 결과
    score DECIMAL(5,2), -- 개별 항목 점수
    finding TEXT, -- 발견 사항
    evidence TEXT, -- 증거/스크린샷 등
    remediation_applied BOOLEAN NOT NULL DEFAULT FALSE, -- 조치 적용 여부
    remediation_notes TEXT, -- 조치 메모
    verified_at TIMESTAMP, -- 검증 완료 시간
    verified_by UUID REFERENCES users(id), -- 검증자
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 제약조건
    UNIQUE(assessment_id, item_id) -- 평가 내 항목별 결과 중복 방지
);

-- 평가 템플릿 테이블 (자주 사용하는 평가 설정을 템플릿으로 저장)
CREATE TABLE assessment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL, -- 템플릿명
    description TEXT, -- 설명
    target_asset_types TEXT[], -- 대상 자산 타입들
    default_checklist_id UUID REFERENCES assessment_checklists(id),
    auto_schedule BOOLEAN NOT NULL DEFAULT FALSE, -- 자동 스케줄링 여부
    schedule_cron VARCHAR(100), -- 크론 표현식
    notification_settings JSONB, -- 알림 설정
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 인덱스 생성
CREATE INDEX idx_assessment_items_tenant ON assessment_items(tenant_id);
CREATE INDEX idx_assessment_items_category ON assessment_items(tenant_id, category);
CREATE INDEX idx_assessment_items_severity ON assessment_items(severity);
CREATE INDEX idx_assessment_items_status ON assessment_items(status);
CREATE INDEX idx_assessment_items_code ON assessment_items(tenant_id, code);
CREATE INDEX idx_assessment_items_tags ON assessment_items USING GIN(tags);

CREATE INDEX idx_assessment_checklists_tenant ON assessment_checklists(tenant_id);
CREATE INDEX idx_assessment_checklists_category ON assessment_checklists(tenant_id, category);
CREATE INDEX idx_assessment_checklists_status ON assessment_checklists(status);

CREATE INDEX idx_checklist_items_checklist ON checklist_items(checklist_id);
CREATE INDEX idx_checklist_items_item ON checklist_items(item_id);
CREATE INDEX idx_checklist_items_order ON checklist_items(checklist_id, order_index);

CREATE INDEX idx_asset_assessments_tenant ON asset_assessments(tenant_id);
CREATE INDEX idx_asset_assessments_asset ON asset_assessments(tenant_id, asset_id);
CREATE INDEX idx_asset_assessments_checklist ON asset_assessments(checklist_id);
CREATE INDEX idx_asset_assessments_status ON asset_assessments(status);
CREATE INDEX idx_asset_assessments_created ON asset_assessments(created_at);

CREATE INDEX idx_assessment_results_assessment ON asset_assessment_results(assessment_id);
CREATE INDEX idx_assessment_results_status ON asset_assessment_results(status);
CREATE INDEX idx_assessment_results_item ON asset_assessment_results(item_id);

CREATE INDEX idx_assessment_comments_assessment ON assessment_comments(assessment_id);
CREATE INDEX idx_assessment_comments_item ON assessment_comments(item_id);

CREATE INDEX idx_assessment_attachments_assessment ON assessment_attachments(assessment_id);
CREATE INDEX idx_assessment_attachments_result ON assessment_attachments(result_id);

-- 트리거 함수들

-- 평가 항목 업데이트 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_assessment_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_assessment_items_updated_at
    BEFORE UPDATE ON assessment_items
    FOR EACH ROW
    EXECUTE FUNCTION update_assessment_item_timestamp();

-- 체크리스트 업데이트 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_checklist_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_assessment_checklists_updated_at
    BEFORE UPDATE ON assessment_checklists
    FOR EACH ROW
    EXECUTE FUNCTION update_checklist_timestamp();

-- 평가 항목 버전 이력 자동 생성
CREATE OR REPLACE FUNCTION create_assessment_item_version()
RETURNS TRIGGER AS $$
BEGIN
    -- 버전이 변경된 경우에만 이력 생성
    IF OLD.version != NEW.version THEN
        INSERT INTO assessment_item_versions (
            tenant_id, item_id, version, changes, previous_data, created_by
        ) VALUES (
            NEW.tenant_id, 
            NEW.id, 
            OLD.version,
            COALESCE(NEW.title || ' 업데이트', '항목 업데이트'),
            to_jsonb(OLD),
            NEW.updated_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_assessment_item_version_history
    AFTER UPDATE ON assessment_items
    FOR EACH ROW
    EXECUTE FUNCTION create_assessment_item_version();

-- 체크리스트 항목 수 자동 계산
CREATE OR REPLACE FUNCTION update_checklist_item_count()
RETURNS TRIGGER AS $$
DECLARE
    checklist_id_val UUID;
BEGIN
    -- INSERT/UPDATE 시
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        checklist_id_val := NEW.checklist_id;
    -- DELETE 시  
    ELSE
        checklist_id_val := OLD.checklist_id;
    END IF;
    
    -- 체크리스트의 item_count 업데이트
    -- 이 필드는 UI에서 사용하지만 실제로는 checklist_items 테이블에서 계산
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_checklist_items_count
    AFTER INSERT OR UPDATE OR DELETE ON checklist_items
    FOR EACH ROW
    EXECUTE FUNCTION update_checklist_item_count();

-- 평가 결과 점수 자동 계산
CREATE OR REPLACE FUNCTION calculate_assessment_score()
RETURNS TRIGGER AS $$
DECLARE
    total_count INTEGER;
    passed_count INTEGER;
    failed_count INTEGER;
    skipped_count INTEGER;
    calculated_score DECIMAL(5,2);
    risk_level_val VARCHAR(20);
BEGIN
    -- 해당 평가의 전체 결과 통계 계산
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'pass'),
        COUNT(*) FILTER (WHERE status = 'fail'),
        COUNT(*) FILTER (WHERE status = 'skip')
    INTO total_count, passed_count, failed_count, skipped_count
    FROM asset_assessment_results 
    WHERE assessment_id = COALESCE(NEW.assessment_id, OLD.assessment_id);
    
    -- 점수 계산 (패스 비율)
    IF total_count > 0 THEN
        calculated_score := (passed_count::DECIMAL / total_count) * 100;
    ELSE
        calculated_score := 0;
    END IF;
    
    -- 리스크 레벨 결정
    IF calculated_score >= 90 THEN
        risk_level_val := 'low';
    ELSIF calculated_score >= 70 THEN
        risk_level_val := 'medium';
    ELSIF calculated_score >= 50 THEN
        risk_level_val := 'high';
    ELSE
        risk_level_val := 'critical';
    END IF;
    
    -- 메인 평가 테이블 업데이트
    UPDATE asset_assessments SET
        total_items = total_count,
        passed_items = passed_count,
        failed_items = failed_count,
        skipped_items = skipped_count,
        overall_score = calculated_score,
        risk_level = risk_level_val,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.assessment_id, OLD.assessment_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_assessment_results_score
    AFTER INSERT OR UPDATE OR DELETE ON asset_assessment_results
    FOR EACH ROW
    EXECUTE FUNCTION calculate_assessment_score();

-- RLS (Row Level Security) 정책들
ALTER TABLE assessment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_item_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_templates ENABLE ROW LEVEL SECURITY;

-- 테넌트별 데이터 격리 정책
CREATE POLICY tenant_isolation_assessment_items ON assessment_items
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_assessment_item_versions ON assessment_item_versions
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_assessment_checklists ON assessment_checklists
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_checklist_items ON checklist_items
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_checklist_versions ON checklist_versions
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_asset_assessments ON asset_assessments
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_asset_assessment_results ON asset_assessment_results
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_assessment_templates ON assessment_templates
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- 댓글 및 감사 로그를 위한 확장 테이블들
CREATE TABLE assessment_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES asset_assessments(id) ON DELETE CASCADE,
    item_id UUID REFERENCES assessment_items(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES assessment_comments(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_assessment_comments_assessment ON assessment_comments(assessment_id);
CREATE INDEX idx_assessment_comments_item ON assessment_comments(item_id);

-- 평가 첨부파일 테이블
CREATE TABLE assessment_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES asset_assessments(id) ON DELETE CASCADE,
    result_id UUID REFERENCES asset_assessment_results(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_assessment_attachments_assessment ON assessment_attachments(assessment_id);
CREATE INDEX idx_assessment_attachments_result ON assessment_attachments(result_id);