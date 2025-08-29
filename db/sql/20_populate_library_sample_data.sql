-- Update existing libraries with comprehensive sample data
-- This populates the new columns that were previously empty

UPDATE libraries SET
  version = '1.0.0',
  vendor = 'Sample Vendor',
  product_type = 'software',
  device_name = 'WorkStation-01',
  process_name = 'sample_process.exe',
  install_path = '/usr/local/bin',
  install_date = '2024-01-15',
  license_type = 'commercial',
  license_expiry = '2024-12-31',
  last_update = '2024-08-15',
  security_patch_level = 'latest',
  vulnerability_status = 'safe',
  cpu_usage = 2.5,
  memory_usage = 536870912, -- 512MB in bytes
  disk_usage = 2147483648, -- 2GB in bytes
  description = 'Sample library for demonstration',
  tags = ARRAY['security', 'enterprise']
WHERE name = 'V9QCQR73Y4Z';

UPDATE libraries SET
  version = '2.1.3',
  vendor = 'Open Source Community',
  product_type = 'software',
  device_name = 'Server-02',
  process_name = 'daemon_service',
  install_path = '/opt/services',
  install_date = '2024-03-20',
  license_type = 'open_source',
  license_expiry = NULL,
  last_update = '2024-08-10',
  security_patch_level = 'v2.1.3',
  vulnerability_status = 'warning',
  cpu_usage = 5.2,
  memory_usage = 268435456, -- 256MB in bytes
  disk_usage = 1610612736, -- 1.5GB in bytes
  description = 'Open source library with monitoring capabilities',
  tags = ARRAY['opensource', 'monitoring']
WHERE name = 'W9QCQR73YA';

UPDATE libraries SET
  version = '3.2.1',
  vendor = 'Enterprise Solutions',
  product_type = 'software',
  device_name = 'DevMachine-03',
  process_name = 'core_engine',
  install_path = '/Applications',
  install_date = '2024-05-10',
  license_type = 'commercial',
  license_expiry = '2025-05-10',
  last_update = '2024-07-25',
  security_patch_level = 'patch-2024-07',
  vulnerability_status = 'critical',
  cpu_usage = 15.8,
  memory_usage = 2147483648, -- 2GB in bytes
  disk_usage = 5368709120, -- 5GB in bytes
  description = 'Critical enterprise library requiring immediate attention',
  tags = ARRAY['enterprise', 'critical', 'security']
WHERE name = 'F9QCQR73Y4';