-- API connections table for external data synchronization
CREATE TABLE IF NOT EXISTS api_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    api_url VARCHAR(1000) NOT NULL,
    connection_type VARCHAR(50) DEFAULT 'library',
    sync_frequency VARCHAR(50) DEFAULT 'manual',
    auto_sync_enabled BOOLEAN DEFAULT false,
    last_sync TIMESTAMP,
    last_sync_status VARCHAR(20) DEFAULT 'never',
    last_sync_message TEXT,
    field_mappings JSONB DEFAULT '{}',
    headers JSONB DEFAULT '{}',
    auth_type VARCHAR(50) DEFAULT 'none',
    auth_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sync history table to track sync operations
CREATE TABLE IF NOT EXISTS sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_connection_id UUID NOT NULL REFERENCES api_connections(id) ON DELETE CASCADE,
    sync_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'running',
    records_processed INTEGER DEFAULT 0,
    records_added INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_deactivated INTEGER DEFAULT 0,
    error_message TEXT,
    sync_details JSONB DEFAULT '{}',
    initiated_by UUID REFERENCES users(id)
);

-- Indexes for better performance
CREATE INDEX idx_api_connections_tenant_id ON api_connections(tenant_id);
CREATE INDEX idx_api_connections_type ON api_connections(connection_type);
CREATE INDEX idx_api_connections_active ON api_connections(is_active);
CREATE INDEX idx_sync_history_connection_id ON sync_history(api_connection_id);
CREATE INDEX idx_sync_history_status ON sync_history(status);

-- Insert sample API connection
INSERT INTO api_connections (
    name, 
    api_url, 
    connection_type, 
    field_mappings,
    tenant_id, 
    created_by
) VALUES (
    'Kandji',
    'https://6881198066a7eb81224a19d6.mockapi.io/api/v1/device/libraries',
    'library',
    '{
        "name": "serialnumber",
        "version": "version",
        "vendor": "vendor",
        "library_type": "library_type",
        "description": "description",
        "ip_address": "ipaddress",
        "mac_address": "macaddress",
        "device_name": "hostname",
        "host_name": "hostname",
        "status": "status"
    }',
    (SELECT id FROM tenants WHERE name = 'Default Tenant' LIMIT 1),
    (SELECT id FROM users WHERE email = 'admin@guardianx.com' LIMIT 1)
) ON CONFLICT DO NOTHING;