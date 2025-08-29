-- IPAM 샘플 데이터 생성
-- 실제 연결 관계를 시연하기 위한 포괄적인 데이터셋

-- 변수 설정 (실제 테넌트 ID 사용)
DO $$
DECLARE
    tenant_uuid UUID := '15a96ee7-2f61-45c9-b89c-13d3212997fc'; -- SX 테넌트
    user_uuid UUID;
    office1_uuid UUID := gen_random_uuid();
    office2_uuid UUID := gen_random_uuid();
    room1_uuid UUID := gen_random_uuid();
    room2_uuid UUID := gen_random_uuid();
    room3_uuid UUID := gen_random_uuid();
    rack1_uuid UUID := gen_random_uuid();
    rack2_uuid UUID := gen_random_uuid();
    rack3_uuid UUID := gen_random_uuid();
    rack4_uuid UUID := gen_random_uuid();
    device1_uuid UUID := gen_random_uuid();
    device2_uuid UUID := gen_random_uuid();
    device3_uuid UUID := gen_random_uuid();
    device4_uuid UUID := gen_random_uuid();
    device5_uuid UUID := gen_random_uuid();
    device6_uuid UUID := gen_random_uuid();
    range1_uuid UUID := gen_random_uuid();
    range2_uuid UUID := gen_random_uuid();
    range3_uuid UUID := gen_random_uuid();
    contact1_uuid UUID := gen_random_uuid();
    contact2_uuid UUID := gen_random_uuid();
    contact3_uuid UUID := gen_random_uuid();
    library1_uuid UUID := gen_random_uuid();
    library2_uuid UUID := gen_random_uuid();
    library3_uuid UUID := gen_random_uuid();
BEGIN
    -- 사용자 ID 가져오기
    SELECT id INTO user_uuid FROM users WHERE current_tenant_id = tenant_uuid LIMIT 1;
    
    IF user_uuid IS NULL THEN
        RAISE NOTICE 'No user found for tenant %, skipping sample data creation', tenant_uuid;
        RETURN;
    END IF;

    RAISE NOTICE 'Creating sample IPAM data for tenant % with user %', tenant_uuid, user_uuid;

    -- 1. 오피스 생성
    INSERT INTO offices (id, tenant_id, name, address, description, created_by) VALUES
    (office1_uuid, tenant_uuid, '서울 본사', '서울시 강남구 테헤란로 123', 'GuardianX 메인 오피스', user_uuid),
    (office2_uuid, tenant_uuid, '부산 지사', '부산시 해운대구 센텀중앙로 456', '부산 개발센터', user_uuid)
    ON CONFLICT (id) DO NOTHING;

    -- 2. 서버실 생성
    INSERT INTO server_rooms (id, office_id, name, description, created_by) VALUES
    (room1_uuid, office1_uuid, '서울 DC-1', '메인 데이터센터 1층', user_uuid),
    (room2_uuid, office1_uuid, '서울 DC-2', '메인 데이터센터 2층', user_uuid),
    (room3_uuid, office2_uuid, '부산 DC-1', '부산 데이터센터', user_uuid)
    ON CONFLICT (id) DO NOTHING;

    -- 3. 랙 생성
    INSERT INTO racks (id, server_room_id, name, description, created_by) VALUES
    (rack1_uuid, room1_uuid, 'Rack-A01', '서버실 1 - A열 1번 랙', user_uuid),
    (rack2_uuid, room1_uuid, 'Rack-A02', '서버실 1 - A열 2번 랙', user_uuid),
    (rack3_uuid, room2_uuid, 'Rack-B01', '서버실 2 - B열 1번 랙', user_uuid),
    (rack4_uuid, room3_uuid, 'Rack-C01', '부산 - C열 1번 랙', user_uuid)
    ON CONFLICT (id) DO NOTHING;

    -- 4. IP 대역 생성
    INSERT INTO ip_ranges (id, tenant_id, name, network_address, subnet_mask, gateway, dns_servers, description, created_by) VALUES
    (range1_uuid, tenant_uuid, '서울본사-관리망', '192.168.1.0', 24, '192.168.1.1', ARRAY['8.8.8.8', '8.8.4.4'], '서울 본사 관리 네트워크', user_uuid),
    (range2_uuid, tenant_uuid, '서울본사-서버망', '10.0.1.0', 24, '10.0.1.1', ARRAY['10.0.1.10', '10.0.1.11'], '서울 본사 서버 네트워크', user_uuid),
    (range3_uuid, tenant_uuid, '부산지사-관리망', '192.168.2.0', 24, '192.168.2.1', ARRAY['8.8.8.8'], '부산 지사 관리 네트워크', user_uuid)
    ON CONFLICT (id) DO NOTHING;

    -- 5. 디바이스 생성
    INSERT INTO devices (id, rack_id, name, description, device_type, manufacturer, model, serial_number, rack_position, rack_size, status, created_by) VALUES
    (device1_uuid, rack1_uuid, 'web-server-01', '프론트엔드 웹 서버', 'server', 'Dell', 'PowerEdge R750', 'WEB001', 10, 2, 'active', user_uuid),
    (device2_uuid, rack1_uuid, 'db-server-01', 'MySQL 데이터베이스 서버', 'server', 'HPE', 'ProLiant DL380', 'DB001', 15, 2, 'active', user_uuid),
    (device3_uuid, rack2_uuid, 'switch-core-01', '코어 네트워크 스위치', 'switch', 'Cisco', 'Catalyst 9300', 'SW001', 5, 1, 'active', user_uuid),
    (device4_uuid, rack3_uuid, 'firewall-01', '메인 방화벽', 'firewall', 'Fortinet', 'FortiGate 600E', 'FW001', 8, 1, 'active', user_uuid),
    (device5_uuid, rack4_uuid, 'backup-server', '백업 서버 - 부산', 'server', 'Dell', 'PowerEdge R650', 'BK001', 12, 2, 'maintenance', user_uuid),
    (device6_uuid, rack1_uuid, 'load-balancer', '로드 밸런서', 'network', 'F5', 'BIG-IP i4800', 'LB001', 20, 2, 'active', user_uuid)
    ON CONFLICT (id) DO NOTHING;

    -- 6. IP 주소 할당
    INSERT INTO ip_addresses (ip_range_id, ip_address, hostname, description, created_by, status) VALUES
    (range1_uuid, '192.168.1.10', 'web-server-01-mgmt', '웹 서버 관리 IP', user_uuid, 'allocated'),
    (range2_uuid, '10.0.1.10', 'web-server-01-app', '웹 서버 서비스 IP', user_uuid, 'allocated'),
    (range1_uuid, '192.168.1.11', 'db-server-01-mgmt', 'DB 서버 관리 IP', user_uuid, 'allocated'),
    (range2_uuid, '10.0.1.11', 'db-server-01-app', 'DB 서버 서비스 IP', user_uuid, 'allocated'),
    (range1_uuid, '192.168.1.5', 'switch-core-01', '코어 스위치 관리 IP', user_uuid, 'allocated'),
    (range1_uuid, '192.168.1.1', 'firewall-01-mgmt', '방화벽 관리 IP', user_uuid, 'allocated'),
    (range3_uuid, '192.168.2.10', 'backup-server-mgmt', '백업 서버 관리 IP', user_uuid, 'allocated'),
    (range1_uuid, '192.168.1.100', 'load-balancer-vip', '로드 밸런서 VIP', user_uuid, 'allocated')
    ON CONFLICT DO NOTHING;

    -- 7. 담당자 생성
    INSERT INTO contacts (id, tenant_id, name, email, phone, mobile, title, department, office_location, responsibilities, created_by) VALUES
    (contact1_uuid, tenant_uuid, '김철수', 'kim.cs@guardianx.co.kr', '02-1234-5678', '010-1234-5678', 'IT 인프라 팀장', 'IT운영팀', '서울 본사', ARRAY['서버 관리', '네트워크 관리', '보안 관리'], user_uuid),
    (contact2_uuid, tenant_uuid, '이영희', 'lee.yh@guardianx.co.kr', '051-987-6543', '010-9876-5432', '시스템 엔지니어', 'IT운영팀', '부산 지사', ARRAY['백업 시스템', 'DB 관리'], user_uuid),
    (contact3_uuid, tenant_uuid, '박민수', 'park.ms@guardianx.co.kr', '02-1234-5679', '010-5555-1234', '네트워크 엔지니어', 'IT운영팀', '서울 본사', ARRAY['네트워크 장비', '방화벽 관리'], user_uuid)
    ON CONFLICT (id) DO NOTHING;

    -- 8. 디바이스-담당자 할당
    INSERT INTO device_assignments (device_id, contact_id, role, assigned_by) VALUES
    (device1_uuid, contact1_uuid, 'primary', user_uuid),
    (device2_uuid, contact1_uuid, 'primary', user_uuid),
    (device2_uuid, contact2_uuid, 'backup', user_uuid),
    (device3_uuid, contact3_uuid, 'primary', user_uuid),
    (device4_uuid, contact3_uuid, 'primary', user_uuid),
    (device4_uuid, contact1_uuid, 'backup', user_uuid),
    (device5_uuid, contact2_uuid, 'primary', user_uuid),
    (device6_uuid, contact1_uuid, 'primary', user_uuid)
    ON CONFLICT (device_id, contact_id) DO NOTHING;

    -- 9. 라이브러리 생성
    INSERT INTO libraries (id, tenant_id, name, version, vendor, product_type, device_id, device_name, status, description, install_path) VALUES
    (library1_uuid, tenant_uuid, 'Apache HTTP Server', '2.4.54', 'Apache Foundation', 'software', device1_uuid, 'web-server-01', 'active', '웹 서버 소프트웨어', '/usr/sbin/httpd'),
    (library2_uuid, tenant_uuid, 'MySQL Server', '8.0.33', 'Oracle', 'software', device2_uuid, 'db-server-01', 'active', 'MySQL 데이터베이스 서버', '/usr/bin/mysqld'),
    (library3_uuid, tenant_uuid, 'Cisco IOS XE', '17.06.04', 'Cisco', 'firmware', device3_uuid, 'switch-core-01', 'active', '스위치 펌웨어', 'system')
    ON CONFLICT (id) DO NOTHING;


    -- 10. 디바이스-IP 매핑 기본 IP 설정
    -- First get the IP address IDs for mapping
    INSERT INTO device_ip_mappings (device_id, ip_address_id, interface_name, is_primary)
    SELECT device1_uuid, 
           (SELECT id FROM ip_addresses WHERE ip_address = '192.168.1.10' AND ip_range_id = range1_uuid), 
           'eth0', true
    UNION ALL
    SELECT device1_uuid, 
           (SELECT id FROM ip_addresses WHERE ip_address = '10.0.1.10' AND ip_range_id = range2_uuid), 
           'eth1', false
    UNION ALL
    SELECT device2_uuid, 
           (SELECT id FROM ip_addresses WHERE ip_address = '192.168.1.11' AND ip_range_id = range1_uuid), 
           'eth0', true
    UNION ALL
    SELECT device2_uuid, 
           (SELECT id FROM ip_addresses WHERE ip_address = '10.0.1.11' AND ip_range_id = range2_uuid), 
           'eth1', false
    UNION ALL
    SELECT device3_uuid, 
           (SELECT id FROM ip_addresses WHERE ip_address = '192.168.1.5' AND ip_range_id = range1_uuid), 
           'vlan1', true
    UNION ALL
    SELECT device4_uuid, 
           (SELECT id FROM ip_addresses WHERE ip_address = '192.168.1.1' AND ip_range_id = range1_uuid), 
           'mgmt', true
    UNION ALL
    SELECT device5_uuid, 
           (SELECT id FROM ip_addresses WHERE ip_address = '192.168.2.10' AND ip_range_id = range3_uuid), 
           'eth0', true
    UNION ALL
    SELECT device6_uuid, 
           (SELECT id FROM ip_addresses WHERE ip_address = '192.168.1.100' AND ip_range_id = range1_uuid), 
           'VIP', true
    ON CONFLICT (device_id, ip_address_id) DO NOTHING;

    RAISE NOTICE 'Sample IPAM data creation completed successfully!';
    
END $$;