-- SOAR 샘플 데이터 생성
-- IPAM 데이터와 연동된 실제적인 보안 이벤트 데이터

-- 변수 설정 (실제 테넌트 ID 사용)
DO $$
DECLARE
    tenant_uuid UUID := '15a96ee7-2f61-45c9-b89c-13d3212997fc'; -- SX 테넌트
    user_uuid UUID;
    web_server_uuid UUID;
    db_server_uuid UUID;
    backup_server_uuid UUID;
    switch_uuid UUID;
    apache_lib_uuid UUID;
    mysql_lib_uuid UUID;
    cisco_lib_uuid UUID;
    playbook1_uuid UUID := gen_random_uuid();
    playbook2_uuid UUID := gen_random_uuid();
    feed1_uuid UUID := gen_random_uuid();
    feed2_uuid UUID := gen_random_uuid();
BEGIN
    -- 사용자 ID 가져오기
    SELECT id INTO user_uuid FROM users WHERE current_tenant_id = tenant_uuid LIMIT 1;
    
    IF user_uuid IS NULL THEN
        RAISE NOTICE 'No user found for tenant %, skipping SOAR sample data creation', tenant_uuid;
        RETURN;
    END IF;

    -- 디바이스 ID들 가져오기
    SELECT id INTO web_server_uuid FROM devices WHERE name = 'web-server-01' LIMIT 1;
    SELECT id INTO db_server_uuid FROM devices WHERE name = 'db-server-01' LIMIT 1;
    SELECT id INTO backup_server_uuid FROM devices WHERE name = 'backup-server' LIMIT 1;
    SELECT id INTO switch_uuid FROM devices WHERE name = 'switch-core-01' LIMIT 1;

    -- 라이브러리 ID들 가져오기
    SELECT id INTO apache_lib_uuid FROM libraries WHERE name = 'Apache HTTP Server' LIMIT 1;
    SELECT id INTO mysql_lib_uuid FROM libraries WHERE name = 'MySQL Server' LIMIT 1;
    SELECT id INTO cisco_lib_uuid FROM libraries WHERE name = 'Cisco IOS XE' LIMIT 1;

    RAISE NOTICE 'Creating SOAR sample data for tenant % with user %', tenant_uuid, user_uuid;

    -- 1. 보안 이벤트 생성 (최근 7일간의 다양한 이벤트들)
    INSERT INTO security_events (
        id, tenant_id, timestamp, severity, event_type, source_ip, target_ip, 
        target_device_id, library_id, description, status, automated_response,
        response_time, confidence_score, risk_score, created_by
    ) VALUES
    -- Critical Events
    (
        gen_random_uuid(), tenant_uuid, NOW() - INTERVAL '5 minutes', 'critical', 
        'Suspicious Library Process', '203.0.113.45', '192.168.1.10',
        web_server_uuid, apache_lib_uuid,
        'Apache 프로세스에서 비정상적인 네트워크 연결 패턴 탐지. 외부 C&C 서버와의 통신 의심',
        'new', 'Process isolated and traffic blocked', NULL, 95.5, 92.0, user_uuid
    ),
    (
        gen_random_uuid(), tenant_uuid, NOW() - INTERVAL '15 minutes', 'critical',
        'Malware Detection', '198.51.100.23', '10.0.1.11',
        db_server_uuid, mysql_lib_uuid,
        'MySQL 서버에서 악성 SQL 쿼리 패턴 탐지. 데이터 유출 시도로 판단',
        'investigating', 'Database connection throttled, admin notified', NULL, 98.2, 95.5, user_uuid
    ),
    (
        gen_random_uuid(), tenant_uuid, NOW() - INTERVAL '1 hour', 'critical',
        'Privilege Escalation', '192.168.1.100', '192.168.1.5',
        switch_uuid, cisco_lib_uuid,
        '네트워크 스위치에서 권한 상승 시도 탐지. 관리자 계정 무차별 대입 공격',
        'resolved', 'Account locked, firewall rules updated', 8.5, 91.0, 88.5, user_uuid
    ),

    -- High Severity Events
    (
        gen_random_uuid(), tenant_uuid, NOW() - INTERVAL '2 hours', 'high',
        'Vulnerability Exploit Attempt', '203.0.113.67', '192.168.1.10',
        web_server_uuid, apache_lib_uuid,
        'Apache 서버 대상 CVE-2021-44228 (Log4j) 취약점 공격 시도',
        'resolved', 'Vulnerability patched, server restarted', 15.3, 87.5, 82.0, user_uuid
    ),
    (
        gen_random_uuid(), tenant_uuid, NOW() - INTERVAL '3 hours', 'high',
        'Brute Force Attack', '198.51.100.45', '10.0.1.11',
        db_server_uuid, mysql_lib_uuid,
        'MySQL 데이터베이스 대상 무차별 대입 공격 탐지 (1000+ 시도)',
        'resolved', 'IP blocked, password policy enforced', 12.7, 92.3, 79.5, user_uuid
    ),
    (
        gen_random_uuid(), tenant_uuid, NOW() - INTERVAL '6 hours', 'high',
        'Data Exfiltration', '192.168.2.10', '203.0.113.89',
        backup_server_uuid, NULL,
        '백업 서버에서 대용량 데이터 외부 전송 탐지 (500GB+)',
        'investigating', 'Network traffic blocked, forensic analysis started', NULL, 78.9, 85.2, user_uuid
    ),

    -- Medium Severity Events  
    (
        gen_random_uuid(), tenant_uuid, NOW() - INTERVAL '12 hours', 'medium',
        'Unusual Network Traffic', '192.168.1.5', '8.8.8.8',
        switch_uuid, NULL,
        '정상 업무 시간 외 DNS 쿼리 폭증 (10000+ queries/hour)',
        'resolved', 'DNS query pattern analyzed - legitimate software update', 25.1, 65.4, 58.7, user_uuid
    ),
    (
        gen_random_uuid(), tenant_uuid, NOW() - INTERVAL '18 hours', 'medium',
        'Configuration Change', '192.168.1.10', '192.168.1.1',
        web_server_uuid, apache_lib_uuid,
        'Apache 설정 파일 무단 수정 탐지',
        'false_positive', 'Authorized maintenance confirmed', 5.2, 45.8, 42.1, user_uuid
    ),
    (
        gen_random_uuid(), tenant_uuid, NOW() - INTERVAL '1 day', 'medium',
        'Port Scan', '203.0.113.123', '192.168.1.0/24',
        NULL, NULL,
        '외부에서 내부 네트워크 포트 스캔 시도',
        'resolved', 'Source IP added to blacklist', 3.8, 72.5, 68.9, user_uuid
    ),

    -- Low Severity Events
    (
        gen_random_uuid(), tenant_uuid, NOW() - INTERVAL '2 days', 'low',
        'Failed Login', '192.168.1.50', '192.168.1.10',
        web_server_uuid, NULL,
        '웹 서버 관리 인터페이스 로그인 실패 (5회)',
        'resolved', 'User account guidance provided', 1.5, 35.2, 28.7, user_uuid
    ),
    (
        gen_random_uuid(), tenant_uuid, NOW() - INTERVAL '3 days', 'low',
        'Certificate Expiry Warning', '192.168.1.10', '192.168.1.10',
        web_server_uuid, apache_lib_uuid,
        'SSL 인증서 만료 30일 전 알림',
        'resolved', 'Certificate renewal scheduled', 24.0, 100.0, 15.3, user_uuid
    ),
    (
        gen_random_uuid(), tenant_uuid, NOW() - INTERVAL '5 days', 'low',
        'Disk Space Warning', '192.168.2.10', '192.168.2.10',
        backup_server_uuid, NULL,
        '백업 서버 디스크 사용량 80% 초과',
        'resolved', 'Old backups cleaned, storage expanded', 18.5, 100.0, 22.1, user_uuid
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. SOAR 플레이북 생성
    INSERT INTO soar_playbooks (
        id, tenant_id, name, description, version, trigger_conditions, 
        severity_threshold, event_types, actions, auto_execute, status,
        execution_count, success_count, created_by
    ) VALUES
    (
        playbook1_uuid, tenant_uuid, 
        'Critical Malware Response', 
        '악성코드 탐지 시 자동 격리 및 대응 플레이북',
        '2.1',
        '{"severity": ["critical"], "event_types": ["Malware Detection", "Suspicious Library Process"]}',
        'critical',
        ARRAY['Malware Detection', 'Suspicious Library Process'],
        '{
            "steps": [
                {"action": "isolate_host", "params": {"method": "network_isolation"}},
                {"action": "block_traffic", "params": {"source_ip": "auto", "duration": "24h"}},
                {"action": "notify_admin", "params": {"priority": "critical", "method": "email,slack"}},
                {"action": "create_incident", "params": {"severity": "critical", "assign_to": "security_team"}},
                {"action": "collect_forensics", "params": {"memory_dump": true, "network_logs": true}}
            ]
        }',
        true, 'active', 23, 21, user_uuid
    ),
    (
        playbook2_uuid, tenant_uuid,
        'Brute Force Mitigation',
        '무차별 대입 공격 탐지 시 자동 차단 플레이북',
        '1.5',
        '{"severity": ["high", "critical"], "event_types": ["Brute Force Attack"], "threshold": 100}',
        'high',
        ARRAY['Brute Force Attack'],
        '{
            "steps": [
                {"action": "block_ip", "params": {"duration": "1h", "scope": "firewall"}},
                {"action": "rate_limit", "params": {"service": "ssh,http", "max_attempts": 3}},
                {"action": "notify_admin", "params": {"priority": "high", "method": "email"}},
                {"action": "enable_2fa", "params": {"forced": true, "notify_users": true}}
            ]
        }',
        true, 'active', 45, 43, user_uuid
    )
    ON CONFLICT (id) DO NOTHING;

    -- 3. 플레이북 실행 히스토리
    INSERT INTO soar_playbook_executions (
        id, tenant_id, playbook_id, security_event_id, execution_status,
        started_at, completed_at, duration_seconds, actions_executed, 
        actions_successful, actions_failed, execution_log, triggered_by
    )
    SELECT 
        gen_random_uuid(), tenant_uuid, playbook1_uuid, se.id, 'completed',
        se.created_at + INTERVAL '30 seconds', 
        se.created_at + INTERVAL '2 minutes',
        90, 5, 5, 0,
        '{"execution_id": "exec_001", "steps": [
            {"step": 1, "action": "isolate_host", "status": "success", "duration": 15},
            {"step": 2, "action": "block_traffic", "status": "success", "duration": 5},
            {"step": 3, "action": "notify_admin", "status": "success", "duration": 2},
            {"step": 4, "action": "create_incident", "status": "success", "duration": 8},
            {"step": 5, "action": "collect_forensics", "status": "success", "duration": 60}
        ]}',
        'auto'
    FROM security_events se 
    WHERE se.tenant_id = tenant_uuid 
    AND se.event_type IN ('Malware Detection', 'Suspicious Library Process')
    AND se.severity = 'critical'
    LIMIT 2
    ON CONFLICT DO NOTHING;

    -- 4. 위협 인텔리전스 피드 생성
    INSERT INTO threat_intelligence_feeds (
        id, tenant_id, name, description, feed_type, source_url,
        update_frequency, is_active, last_updated, last_update_status,
        record_count, created_by
    ) VALUES
    (
        feed1_uuid, tenant_uuid,
        'Malicious IP Reputation Feed',
        'Known malicious IP addresses from threat intelligence providers',
        'IP_REPUTATION',
        'https://api.threatintel.example.com/v1/malicious-ips',
        'daily', true, NOW() - INTERVAL '2 hours', 'success',
        15847, user_uuid
    ),
    (
        feed2_uuid, tenant_uuid,
        'CVE Vulnerability Feed',
        'Latest CVE vulnerabilities affecting our technology stack',
        'VULNERABILITY',
        'https://api.nvd.nist.gov/rest/json/cves/1.0',
        'daily', true, NOW() - INTERVAL '6 hours', 'success',
        2341, user_uuid
    )
    ON CONFLICT (id) DO NOTHING;

    -- 5. 위협 인텔리전스 데이터
    INSERT INTO threat_intelligence_data (
        tenant_id, feed_id, indicator_type, indicator_value, threat_type,
        confidence_score, severity, description, tags, first_seen, last_seen
    ) VALUES
    (
        tenant_uuid, feed1_uuid, 'IP', '203.0.113.45', 'C2_SERVER',
        95, 'critical', 'Known command and control server for APT group XYZ',
        ARRAY['APT', 'C2', 'MALWARE'], NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 hour'
    ),
    (
        tenant_uuid, feed1_uuid, 'IP', '198.51.100.23', 'MALWARE_HOST',
        87, 'high', 'Host serving malware payloads',
        ARRAY['MALWARE', 'DROPPER'], NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 hours'
    ),
    (
        tenant_uuid, feed1_uuid, 'IP', '203.0.113.67', 'SCANNER',
        76, 'medium', 'Automated vulnerability scanner',
        ARRAY['SCANNER', 'RECON'], NOW() - INTERVAL '7 days', NOW() - INTERVAL '4 hours'
    ),
    (
        tenant_uuid, feed2_uuid, 'CVE', 'CVE-2021-44228', 'VULNERABILITY',
        100, 'critical', 'Apache Log4j2 Remote Code Execution',
        ARRAY['RCE', 'APACHE', 'LOG4J'], NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day'
    ),
    (
        tenant_uuid, feed2_uuid, 'CVE', 'CVE-2023-2975', 'VULNERABILITY',
        85, 'high', 'OpenSSH Authentication Bypass',
        ARRAY['AUTH_BYPASS', 'SSH'], NOW() - INTERVAL '30 days', NOW() - INTERVAL '5 days'
    )
    ON CONFLICT (tenant_id, feed_id, indicator_type, indicator_value) DO NOTHING;

    RAISE NOTICE 'SOAR sample data creation completed successfully!';
    
END $$;