-- 임직원(담당자) 테이블 생성
-- 실행 날짜: 2025-08-14
-- 목적: users 테이블과 별개의 임직원 관리 시스템 구축

-- 임직원 테이블 생성 (UI에서는 담당자로 표시)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 제약 조건
    CONSTRAINT contacts_role_check 
        CHECK (role IN ('primary', 'backup', 'viewer')),
    CONSTRAINT contacts_status_check 
        CHECK (status IN ('active', 'inactive')),
    
    -- 유니크 제약조건: 한 테넌트 내에서 이메일은 유일해야 함
    CONSTRAINT contacts_tenant_email_unique 
        UNIQUE (tenant_id, email)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_role ON contacts(role);

-- 업데이트 트리거 생성
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_contacts_updated_at();

-- device_assignments 테이블 수정 - user_id 대신 contact_id 사용

CREATE TABLE IF NOT EXISTS device_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'backup',
    assigned_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 제약 조건
    CONSTRAINT device_assignments_role_check 
        CHECK (role IN ('primary', 'backup', 'viewer')),
    
    -- 유니크 제약조건: 한 담당자는 한 디바이스에 하나의 할당만 가질 수 있음
    CONSTRAINT device_assignments_device_contact_unique 
        UNIQUE (device_id, contact_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_device_assignments_device_id ON device_assignments(device_id);
CREATE INDEX IF NOT EXISTS idx_device_assignments_contact_id ON device_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_device_assignments_role ON device_assignments(role);

-- 업데이트 트리거 생성
CREATE OR REPLACE FUNCTION update_device_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_device_assignments_updated_at
    BEFORE UPDATE ON device_assignments
    FOR EACH ROW EXECUTE FUNCTION update_device_assignments_updated_at();

-- 샘플 임직원 데이터 삽입
INSERT INTO contacts (tenant_id, name, email, phone, role, status, notes)
VALUES 
    ('449b62fe-f392-4299-a58a-8dd15dafd696', '김철수', 'kim.cs@example.com', '010-1234-5678', 'primary', 'active', 'IT 인프라 담당'),
    ('449b62fe-f392-4299-a58a-8dd15dafd696', '이영희', 'lee.yh@example.com', '010-9876-5432', 'backup', 'active', '네트워크 담당'),
    ('449b62fe-f392-4299-a58a-8dd15dafd696', '박민수', 'park.ms@example.com', '010-5555-1234', 'viewer', 'inactive', '전 직원')
ON CONFLICT DO NOTHING;

-- 샘플 디바이스 할당 데이터 삽입
WITH sample_device AS (
    SELECT id FROM devices WHERE name = 'Shawn' LIMIT 1
),
primary_contact AS (
    SELECT id FROM contacts WHERE email = 'kim.cs@example.com' LIMIT 1
),
admin_user AS (
    SELECT id FROM users WHERE current_tenant_id = '449b62fe-f392-4299-a58a-8dd15dafd696' LIMIT 1
)
INSERT INTO device_assignments (device_id, contact_id, role, assigned_by)
SELECT 
    sd.id as device_id,
    pc.id as contact_id,
    'primary' as role,
    au.id as assigned_by
FROM sample_device sd, primary_contact pc, admin_user au
WHERE NOT EXISTS (
    SELECT 1 FROM device_assignments 
    WHERE device_id = sd.id AND contact_id = pc.id
);

-- 테이블 정보 확인
SELECT 
    c.name as contact_name,
    c.email,
    c.role as contact_role,
    c.status,
    COUNT(da.id) as assigned_devices
FROM contacts c
LEFT JOIN device_assignments da ON c.id = da.contact_id
WHERE c.tenant_id = '449b62fe-f392-4299-a58a-8dd15dafd696'
GROUP BY c.id, c.name, c.email, c.role, c.status
ORDER BY c.created_at;