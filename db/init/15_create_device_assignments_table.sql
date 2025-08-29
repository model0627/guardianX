-- 디바이스 담당자 할당 테이블 생성
-- 실행 날짜: 2025-08-14
-- 목적: 디바이스에 담당자를 할당하고 관리하는 기능 구현

-- 디바이스 담당자 할당 테이블 생성
CREATE TABLE IF NOT EXISTS device_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'backup',
    assigned_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 제약 조건
    CONSTRAINT device_assignments_role_check 
        CHECK (role IN ('primary', 'backup', 'viewer')),
    
    -- 유니크 제약조건: 한 사용자는 한 디바이스에 하나의 할당만 가질 수 있음
    CONSTRAINT device_assignments_device_user_unique 
        UNIQUE (device_id, user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_device_assignments_device_id ON device_assignments(device_id);
CREATE INDEX IF NOT EXISTS idx_device_assignments_user_id ON device_assignments(user_id);
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

-- 샘플 데이터 삽입
-- GuardianX Solutions 테넌트의 사용자 ID 조회 후 할당
WITH tenant_user AS (
    SELECT id FROM users WHERE current_tenant_id = '449b62fe-f392-4299-a58a-8dd15dafd696' LIMIT 1
),
shawn_device AS (
    SELECT id FROM devices WHERE name = 'Shawn' LIMIT 1
)
INSERT INTO device_assignments (device_id, user_id, role, assigned_by)
SELECT 
    sd.id as device_id,
    tu.id as user_id,
    'primary' as role,
    tu.id as assigned_by
FROM tenant_user tu, shawn_device sd
WHERE NOT EXISTS (
    SELECT 1 FROM device_assignments 
    WHERE device_id = sd.id AND user_id = tu.id
);

-- 테이블 정보 확인
SELECT 
    da.id,
    d.name as device_name,
    u.email as user_email,
    da.role,
    da.created_at
FROM device_assignments da
JOIN devices d ON da.device_id = d.id
JOIN users u ON da.user_id = u.id
LIMIT 5;