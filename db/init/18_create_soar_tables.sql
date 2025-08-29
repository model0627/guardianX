-- SOAR (Security Orchestration, Automation and Response) 테이블들
-- 실행 날짜: 2025-08-23
-- 목적: 보안 이벤트 관리 및 자동화된 대응 시스템

-- 1. 보안 이벤트 테이블
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- 이벤트 기본 정보
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    event_type VARCHAR(100) NOT NULL, -- 'Malware Detection', 'Brute Force Attack', etc.
    
    -- 네트워크 정보
    source_ip INET NOT NULL,
    target_ip INET NOT NULL,
    source_port INTEGER,
    target_port INTEGER,
    protocol VARCHAR(10), -- TCP, UDP, ICMP, etc.
    
    -- 자산 연결 정보 (IPAM 연동)
    target_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    library_id UUID REFERENCES libraries(id) ON DELETE SET NULL,
    ip_range_id UUID REFERENCES ip_ranges(id) ON DELETE SET NULL,
    
    -- 이벤트 상세 정보
    description TEXT NOT NULL,
    raw_log TEXT, -- 원본 로그 데이터
    indicators JSONB, -- IOCs (Indicators of Compromise)
    
    -- 대응 정보
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'resolved', 'false_positive')),
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5), -- 1=highest, 5=lowest
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- 자동 대응 정보
    automated_response TEXT, -- 자동 대응 액션 설명
    response_time DECIMAL(10, 2), -- 대응 시간 (분 단위)
    playbook_executed VARCHAR(255), -- 실행된 플레이북 이름
    
    -- 상관관계 분석
    correlation_id UUID, -- 연관 이벤트 그룹 ID
    parent_event_id UUID REFERENCES security_events(id) ON DELETE SET NULL,
    
    -- 메타데이터
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- 추가 필드
    is_active BOOLEAN DEFAULT true,
    confidence_score DECIMAL(5, 2) CHECK (confidence_score BETWEEN 0 AND 100), -- 탐지 신뢰도
    risk_score DECIMAL(5, 2) CHECK (risk_score BETWEEN 0 AND 100) -- 위험도 점수
);

-- 2. SOAR 플레이북 테이블
CREATE TABLE IF NOT EXISTS soar_playbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0',
    
    -- 트리거 조건
    trigger_conditions JSONB NOT NULL, -- 플레이북 실행 조건
    severity_threshold VARCHAR(20) CHECK (severity_threshold IN ('critical', 'high', 'medium', 'low')),
    event_types TEXT[], -- 대상 이벤트 타입들
    
    -- 액션 정의
    actions JSONB NOT NULL, -- 실행할 액션들의 정의
    auto_execute BOOLEAN DEFAULT false, -- 자동 실행 여부
    
    -- 상태 정보
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    last_executed TIMESTAMP WITH TIME ZONE,
    
    -- 메타데이터
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 3. 플레이북 실행 히스토리 테이블
CREATE TABLE IF NOT EXISTS soar_playbook_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    playbook_id UUID NOT NULL REFERENCES soar_playbooks(id) ON DELETE CASCADE,
    security_event_id UUID NOT NULL REFERENCES security_events(id) ON DELETE CASCADE,
    
    -- 실행 정보
    execution_status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (execution_status IN ('running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER, -- 실행 시간 (초)
    
    -- 실행 결과
    actions_executed INTEGER DEFAULT 0,
    actions_successful INTEGER DEFAULT 0,
    actions_failed INTEGER DEFAULT 0,
    execution_log JSONB, -- 상세 실행 로그
    error_message TEXT,
    
    -- 실행 컨텍스트
    triggered_by VARCHAR(20) DEFAULT 'auto' CHECK (triggered_by IN ('auto', 'manual')),
    executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 위협 인텔리전스 피드 테이블
CREATE TABLE IF NOT EXISTS threat_intelligence_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    feed_type VARCHAR(50) NOT NULL, -- 'IP_REPUTATION', 'DOMAIN_REPUTATION', 'FILE_HASH', etc.
    source_url TEXT,
    
    -- 피드 설정
    update_frequency VARCHAR(20) DEFAULT 'daily' CHECK (update_frequency IN ('realtime', 'hourly', 'daily', 'weekly')),
    is_active BOOLEAN DEFAULT true,
    
    -- 상태 정보
    last_updated TIMESTAMP WITH TIME ZONE,
    last_update_status VARCHAR(20) DEFAULT 'pending' CHECK (last_update_status IN ('pending', 'success', 'failed')),
    record_count INTEGER DEFAULT 0,
    error_message TEXT,
    
    -- 메타데이터
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 위협 인텔리전스 데이터 테이블
CREATE TABLE IF NOT EXISTS threat_intelligence_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    feed_id UUID NOT NULL REFERENCES threat_intelligence_feeds(id) ON DELETE CASCADE,
    
    -- 인텔리전스 데이터
    indicator_type VARCHAR(50) NOT NULL, -- 'IP', 'DOMAIN', 'URL', 'FILE_HASH', etc.
    indicator_value TEXT NOT NULL, -- 실제 IOC 값
    threat_type VARCHAR(100), -- 'MALWARE', 'PHISHING', 'C2', etc.
    confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
    severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    
    -- 추가 정보
    description TEXT,
    tags TEXT[],
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    
    -- 상태
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 중복 방지를 위한 유니크 제약
    UNIQUE(tenant_id, feed_id, indicator_type, indicator_value)
);

-- 인덱스 생성
-- Security Events 인덱스
CREATE INDEX IF NOT EXISTS idx_security_events_tenant_id ON security_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_status ON security_events(status);
CREATE INDEX IF NOT EXISTS idx_security_events_device ON security_events(target_device_id);
CREATE INDEX IF NOT EXISTS idx_security_events_library ON security_events(library_id);
CREATE INDEX IF NOT EXISTS idx_security_events_source_ip ON security_events(source_ip);
CREATE INDEX IF NOT EXISTS idx_security_events_target_ip ON security_events(target_ip);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_correlation ON security_events(correlation_id);

-- Playbooks 인덱스
CREATE INDEX IF NOT EXISTS idx_soar_playbooks_tenant_id ON soar_playbooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_soar_playbooks_status ON soar_playbooks(status);
CREATE INDEX IF NOT EXISTS idx_soar_playbooks_auto_execute ON soar_playbooks(auto_execute);

-- Playbook Executions 인덱스
CREATE INDEX IF NOT EXISTS idx_soar_executions_tenant_id ON soar_playbook_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_soar_executions_playbook ON soar_playbook_executions(playbook_id);
CREATE INDEX IF NOT EXISTS idx_soar_executions_event ON soar_playbook_executions(security_event_id);
CREATE INDEX IF NOT EXISTS idx_soar_executions_started_at ON soar_playbook_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_soar_executions_status ON soar_playbook_executions(execution_status);

-- Threat Intelligence 인덱스
CREATE INDEX IF NOT EXISTS idx_threat_feeds_tenant_id ON threat_intelligence_feeds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_threat_feeds_active ON threat_intelligence_feeds(is_active);
CREATE INDEX IF NOT EXISTS idx_threat_data_tenant_id ON threat_intelligence_data(tenant_id);
CREATE INDEX IF NOT EXISTS idx_threat_data_feed ON threat_intelligence_data(feed_id);
CREATE INDEX IF NOT EXISTS idx_threat_data_indicator ON threat_intelligence_data(indicator_type, indicator_value);
CREATE INDEX IF NOT EXISTS idx_threat_data_active ON threat_intelligence_data(is_active);

-- 트리거 함수: updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_soar_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_security_events_updated_at 
    BEFORE UPDATE ON security_events 
    FOR EACH ROW EXECUTE FUNCTION update_soar_updated_at_column();

CREATE TRIGGER update_soar_playbooks_updated_at 
    BEFORE UPDATE ON soar_playbooks 
    FOR EACH ROW EXECUTE FUNCTION update_soar_updated_at_column();

CREATE TRIGGER update_threat_feeds_updated_at 
    BEFORE UPDATE ON threat_intelligence_feeds 
    FOR EACH ROW EXECUTE FUNCTION update_soar_updated_at_column();

CREATE TRIGGER update_threat_data_updated_at 
    BEFORE UPDATE ON threat_intelligence_data 
    FOR EACH ROW EXECUTE FUNCTION update_soar_updated_at_column();

-- 응답시간 자동 계산 트리거 함수
CREATE OR REPLACE FUNCTION calculate_response_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        NEW.resolved_at = NOW();
        NEW.response_time = EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 60.0; -- 분 단위
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER security_events_response_time 
    BEFORE UPDATE ON security_events 
    FOR EACH ROW EXECUTE FUNCTION calculate_response_time();