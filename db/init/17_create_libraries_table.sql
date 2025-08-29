-- 라이브러리 (프로그램/프로세스) 테이블 생성
CREATE TABLE IF NOT EXISTS libraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- 기본 정보
    name VARCHAR(255) NOT NULL,
    version VARCHAR(100),
    vendor VARCHAR(255),
    product_type VARCHAR(100) DEFAULT 'software', -- software, firmware, driver, etc
    
    -- 디바이스 연결 정보
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    device_name VARCHAR(255), -- 캐시된 디바이스 이름
    
    -- 프로세스 정보
    process_name VARCHAR(255),
    install_path TEXT,
    install_date TIMESTAMP,
    
    -- 라이선스 정보
    license_type VARCHAR(100), -- perpetual, subscription, trial, etc
    license_key TEXT,
    license_expiry DATE,
    
    -- 보안 정보
    last_update DATE,
    security_patch_level VARCHAR(100),
    vulnerability_status VARCHAR(50) DEFAULT 'unknown', -- secure, vulnerable, unknown, checking
    
    -- API 관련
    api_endpoint VARCHAR(500),
    api_key TEXT,
    api_status VARCHAR(50) DEFAULT 'inactive', -- active, inactive, error
    last_api_check TIMESTAMP,
    
    -- 리소스 사용
    cpu_usage DECIMAL(5,2), -- 퍼센트
    memory_usage BIGINT, -- bytes
    disk_usage BIGINT, -- bytes
    
    -- 상태 및 메타데이터
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, maintenance, error
    description TEXT,
    notes TEXT,
    tags TEXT[],
    
    -- 감사 필드
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    
    CONSTRAINT unique_library_device UNIQUE(tenant_id, device_id, name, version)
);

-- 인덱스 생성
CREATE INDEX idx_libraries_tenant ON libraries(tenant_id);
CREATE INDEX idx_libraries_device ON libraries(device_id);
CREATE INDEX idx_libraries_status ON libraries(status);
CREATE INDEX idx_libraries_product_type ON libraries(product_type);
CREATE INDEX idx_libraries_vulnerability ON libraries(vulnerability_status);
CREATE INDEX idx_libraries_is_active ON libraries(is_active);

-- 라이브러리 히스토리 테이블
CREATE TABLE IF NOT EXISTS library_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id),
    
    action VARCHAR(50) NOT NULL, -- installed, updated, removed, status_changed
    old_version VARCHAR(100),
    new_version VARCHAR(100),
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX idx_library_history_library ON library_history(library_id);
CREATE INDEX idx_library_history_device ON library_history(device_id);
CREATE INDEX idx_library_history_performed_at ON library_history(performed_at);

-- 라이브러리-디바이스 연결 관리 (다대다 관계)
CREATE TABLE IF NOT EXISTS device_libraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- 연결 정보
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    installed_by UUID REFERENCES users(id),
    
    -- 라이브러리별 디바이스 특정 정보
    install_path TEXT,
    configuration TEXT, -- JSON 형태의 설정
    
    -- 상태
    is_primary BOOLEAN DEFAULT false, -- 주 라이브러리 여부
    is_active BOOLEAN DEFAULT true,
    last_checked TIMESTAMP,
    
    CONSTRAINT unique_device_library UNIQUE(device_id, library_id)
);

CREATE INDEX idx_device_libraries_device ON device_libraries(device_id);
CREATE INDEX idx_device_libraries_library ON device_libraries(library_id);
CREATE INDEX idx_device_libraries_tenant ON device_libraries(tenant_id);

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_libraries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_libraries_updated_at_trigger
    BEFORE UPDATE ON libraries
    FOR EACH ROW
    EXECUTE FUNCTION update_libraries_updated_at();

-- 뷰: 라이브러리 상세 정보
CREATE OR REPLACE VIEW library_details AS
SELECT 
    l.*,
    d.name as device_display_name,
    d.device_type,
    d.status as device_status,
    COUNT(dl.device_id) as total_devices,
    u1.email as created_by_email,
    u2.email as updated_by_email
FROM libraries l
LEFT JOIN devices d ON l.device_id = d.id
LEFT JOIN device_libraries dl ON l.id = dl.library_id AND dl.is_active = true
LEFT JOIN users u1 ON l.created_by = u1.id
LEFT JOIN users u2 ON l.updated_by = u2.id
WHERE l.is_active = true
GROUP BY l.id, d.name, d.device_type, d.status, u1.email, u2.email;

-- 샘플 데이터 삽입
INSERT INTO libraries (tenant_id, name, version, vendor, product_type, device_id, status, api_endpoint, description) 
SELECT 
    t.id,
    'Microsoft Office',
    '2021',
    'Microsoft',
    'software',
    d.id,
    'active',
    NULL,
    'Office productivity suite'
FROM tenants t
CROSS JOIN LATERAL (
    SELECT id FROM devices WHERE tenant_id = t.id LIMIT 1
) d
WHERE t.name = 'CloudNet Solutions'
ON CONFLICT DO NOTHING;

INSERT INTO libraries (tenant_id, name, version, vendor, product_type, device_id, status, description) 
SELECT 
    t.id,
    'Norton Antivirus',
    '22.0.1',
    'Symantec',
    'software',
    d.id,
    'active',
    'Antivirus protection software'
FROM tenants t
CROSS JOIN LATERAL (
    SELECT id FROM devices WHERE tenant_id = t.id LIMIT 1
) d
WHERE t.name = 'CloudNet Solutions'
ON CONFLICT DO NOTHING;

INSERT INTO libraries (tenant_id, name, version, vendor, product_type, device_id, status, vulnerability_status, description) 
SELECT 
    t.id,
    'Apache HTTP Server',
    '2.4.54',
    'Apache',
    'software',
    d.id,
    'active',
    'secure',
    'Web server application'
FROM tenants t
CROSS JOIN LATERAL (
    SELECT id FROM devices WHERE tenant_id = t.id AND device_type = 'server' LIMIT 1
) d
WHERE t.name = 'CloudNet Solutions' AND d.id IS NOT NULL
ON CONFLICT DO NOTHING;