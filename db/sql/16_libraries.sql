-- Libraries table for IPAM
CREATE TABLE IF NOT EXISTS libraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    vendor VARCHAR(255),
    type VARCHAR(50) DEFAULT 'software',
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    api_endpoint VARCHAR(500),
    api_key VARCHAR(500),
    last_sync TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Library devices relationship table
CREATE TABLE IF NOT EXISTS library_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    linked_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    UNIQUE(library_id, device_id)
);

-- Indexes for better performance
CREATE INDEX idx_libraries_tenant_id ON libraries(tenant_id);
CREATE INDEX idx_libraries_status ON libraries(status);
CREATE INDEX idx_libraries_type ON libraries(type);
CREATE INDEX idx_library_devices_library_id ON library_devices(library_id);
CREATE INDEX idx_library_devices_device_id ON library_devices(device_id);

-- Insert sample data
INSERT INTO libraries (name, version, vendor, type, status, tenant_id, created_by)
VALUES 
    ('V9QCQR73Y4Z', '-', '-', 'software', 'active', 
     (SELECT id FROM tenants WHERE name = 'Default Tenant' LIMIT 1),
     (SELECT id FROM users WHERE email = 'admin@cloudguard.local' LIMIT 1)),
    ('W9QCQR73YA', '-', '-', 'software', 'active',
     (SELECT id FROM tenants WHERE name = 'Default Tenant' LIMIT 1),
     (SELECT id FROM users WHERE email = 'admin@cloudguard.local' LIMIT 1)),
    ('F9QCQR73Y4', '-', '-', 'software', 'active',
     (SELECT id FROM tenants WHERE name = 'Default Tenant' LIMIT 1),
     (SELECT id FROM users WHERE email = 'admin@cloudguard.local' LIMIT 1))
ON CONFLICT DO NOTHING;