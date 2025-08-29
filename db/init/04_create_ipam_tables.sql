-- IPAM (IP Address Management) 관련 테이블들

-- 1. 사무실 테이블
CREATE TABLE IF NOT EXISTS offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 2. 서버실 테이블
CREATE TABLE IF NOT EXISTS server_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    floor_level VARCHAR(50),
    room_number VARCHAR(50),
    temperature_monitoring BOOLEAN DEFAULT false,
    humidity_monitoring BOOLEAN DEFAULT false,
    access_control BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 3. 랙 테이블
CREATE TABLE IF NOT EXISTS racks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_room_id UUID NOT NULL REFERENCES server_rooms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rack_height INTEGER DEFAULT 42, -- U 단위
    power_capacity INTEGER, -- 와트 단위
    cooling_type VARCHAR(100),
    location_x DECIMAL(10, 2),
    location_y DECIMAL(10, 2),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 4. IP 대역 테이블
CREATE TABLE IF NOT EXISTS ip_ranges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    network_address INET NOT NULL,
    subnet_mask INTEGER NOT NULL CHECK (subnet_mask >= 8 AND subnet_mask <= 32),
    gateway INET,
    dns_servers TEXT[], -- JSON 배열로 저장
    vlan_id INTEGER,
    ip_version INTEGER DEFAULT 4 CHECK (ip_version IN (4, 6)),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 5. IP 주소 테이블
CREATE TABLE IF NOT EXISTS ip_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_range_id UUID NOT NULL REFERENCES ip_ranges(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'allocated', 'reserved', 'disabled')),
    hostname VARCHAR(255),
    description TEXT,
    mac_address MACADDR,
    lease_start TIMESTAMP WITH TIME ZONE,
    lease_end TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(ip_address, ip_range_id)
);

-- 6. 디바이스 테이블
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rack_id UUID REFERENCES racks(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    device_type VARCHAR(100) NOT NULL, -- server, switch, router, firewall, storage, etc.
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    rack_position INTEGER, -- U 위치
    rack_size INTEGER DEFAULT 1, -- U 크기
    power_consumption INTEGER, -- 와트
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'decommissioned')),
    purchase_date DATE,
    warranty_end DATE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 7. 디바이스-IP 매핑 테이블
CREATE TABLE IF NOT EXISTS device_ip_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    ip_address_id UUID NOT NULL REFERENCES ip_addresses(id) ON DELETE CASCADE,
    interface_name VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(device_id, ip_address_id)
);

-- 8. 라이브러리 (템플릿/프리셋) 테이블
CREATE TABLE IF NOT EXISTS device_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    device_type VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    default_rack_size INTEGER DEFAULT 1,
    default_power_consumption INTEGER,
    default_config JSONB, -- 기본 설정 저장
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 9. 담당자 테이블
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    department VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    email VARCHAR(255),
    office_location VARCHAR(255),
    responsibilities TEXT[],
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 10. 담당자-자원 매핑 테이블 (담당자가 관리하는 자원들)
CREATE TABLE IF NOT EXISTS contact_resource_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('office', 'server_room', 'rack', 'device', 'ip_range')),
    resource_id UUID NOT NULL,
    role VARCHAR(100) DEFAULT 'manager', -- manager, backup, technical, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contact_id, resource_type, resource_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_offices_tenant_id ON offices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_server_rooms_office_id ON server_rooms(office_id);
CREATE INDEX IF NOT EXISTS idx_racks_server_room_id ON racks(server_room_id);
CREATE INDEX IF NOT EXISTS idx_ip_ranges_tenant_id ON ip_ranges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_range_id ON ip_addresses(ip_range_id);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_ip ON ip_addresses(ip_address);
CREATE INDEX IF NOT EXISTS idx_devices_rack_id ON devices(rack_id);
CREATE INDEX IF NOT EXISTS idx_device_ip_mappings_device_id ON device_ip_mappings(device_id);
CREATE INDEX IF NOT EXISTS idx_device_ip_mappings_ip_id ON device_ip_mappings(ip_address_id);
CREATE INDEX IF NOT EXISTS idx_device_library_tenant_id ON device_library(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contact_resource_mappings_contact_id ON contact_resource_mappings(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_resource_mappings_resource ON contact_resource_mappings(resource_type, resource_id);

-- 트리거 함수: updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_offices_updated_at BEFORE UPDATE ON offices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_server_rooms_updated_at BEFORE UPDATE ON server_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_racks_updated_at BEFORE UPDATE ON racks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ip_ranges_updated_at BEFORE UPDATE ON ip_ranges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ip_addresses_updated_at BEFORE UPDATE ON ip_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_device_library_updated_at BEFORE UPDATE ON device_library FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();