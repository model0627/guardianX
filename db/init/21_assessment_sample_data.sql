-- 평가 항목 및 체크리스트 샘플 데이터

-- 먼저 기본 사용자와 테넌트가 있다고 가정하고 샘플 데이터 삽입
-- 실제 사용 시에는 존재하는 tenant_id와 user_id를 사용해야 함

-- 샘플 평가 항목들
INSERT INTO assessment_items (
    tenant_id, code, category, subcategory, title, description, severity, version, status, 
    compliance_standards, check_type, remediation, reference_links, tags, created_by
) VALUES
-- 계정 및 권한 관리
(
    (SELECT id FROM tenants LIMIT 1),
    'SEC-001',
    '계정 및 권한 관리',
    '계정 관리',
    '미사용 계정 점검',
    '90일 이상 미사용된 계정이 존재하는지 점검합니다.',
    'high',
    '2.1.0',
    'active',
    ARRAY['ISO27001', 'ISMS-P', 'PCI-DSS'],
    'automated',
    '미사용 계정을 비활성화하거나 삭제하십시오.',
    ARRAY['ISO27001 A.9.2.5', 'ISMS-P 2.2.1'],
    ARRAY['계정', '접근통제', '필수'],
    (SELECT id FROM users LIMIT 1)
),
(
    (SELECT id FROM tenants LIMIT 1),
    'SEC-002',
    '계정 및 권한 관리',
    '패스워드 정책',
    '패스워드 복잡도 정책',
    '패스워드가 복잡도 요구사항을 충족하는지 점검합니다.',
    'critical',
    '2.0.0',
    'active',
    ARRAY['ISO27001', 'ISMS-P'],
    'automated',
    '최소 8자 이상, 영문/숫자/특수문자 조합을 사용하도록 설정하십시오.',
    ARRAY['ISO27001 A.9.4.3'],
    ARRAY['패스워드', '인증', '필수'],
    (SELECT id FROM users LIMIT 1)
),
(
    (SELECT id FROM tenants LIMIT 1),
    'SEC-003',
    '계정 및 권한 관리',
    '계정 잠금',
    '계정 잠금 정책',
    '연속 로그인 실패 시 계정 잠금 정책이 설정되어 있는지 점검합니다.',
    'high',
    '1.5.0',
    'active',
    ARRAY['ISO27001', 'ISMS-P'],
    'automated',
    '5회 연속 실패 시 계정을 30분간 잠금 처리하도록 설정하십시오.',
    ARRAY['ISO27001 A.9.4.2'],
    ARRAY['계정잠금', '보안정책'],
    (SELECT id FROM users LIMIT 1)
),

-- 네트워크 보안
(
    (SELECT id FROM tenants LIMIT 1),
    'NET-001',
    '네트워크 보안',
    '방화벽 정책',
    '불필요한 포트 오픈 점검',
    '외부에서 접근 가능한 불필요한 포트가 열려있는지 점검합니다.',
    'high',
    '1.5.0',
    'active',
    ARRAY['ISO27001', 'ISMS-P'],
    'automated',
    '불필요한 포트는 방화벽에서 차단하십시오.',
    ARRAY['ISO27001 A.13.1.1'],
    ARRAY['네트워크', '방화벽', '포트'],
    (SELECT id FROM users LIMIT 1)
),
(
    (SELECT id FROM tenants LIMIT 1),
    'NET-002',
    '네트워크 보안',
    'SSL/TLS',
    'SSL/TLS 버전 점검',
    'SSL/TLS 프로토콜이 안전한 버전을 사용하는지 점검합니다.',
    'critical',
    '2.0.0',
    'active',
    ARRAY['ISO27001', 'PCI-DSS'],
    'automated',
    'TLS 1.2 이상 버전을 사용하고 약한 암호화 방식을 비활성화하십시오.',
    ARRAY['PCI-DSS 4.1'],
    ARRAY['SSL', 'TLS', '암호화'],
    (SELECT id FROM users LIMIT 1)
),

-- 시스템 보안
(
    (SELECT id FROM tenants LIMIT 1),
    'SYS-001',
    '시스템 보안',
    '패치 관리',
    '보안 패치 적용 여부',
    '최신 보안 패치가 적용되었는지 점검합니다.',
    'critical',
    '3.0.0',
    'active',
    ARRAY['ISO27001', 'ISMS-P', 'PCI-DSS'],
    'hybrid',
    '제조사에서 제공하는 최신 보안 패치를 적용하십시오.',
    ARRAY['ISO27001 A.12.6.1'],
    ARRAY['패치', '취약점', '필수'],
    (SELECT id FROM users LIMIT 1)
),
(
    (SELECT id FROM tenants LIMIT 1),
    'SYS-002',
    '시스템 보안',
    '로그 관리',
    '시스템 로그 수집',
    '시스템 보안 로그가 적절히 수집되고 있는지 점검합니다.',
    'medium',
    '1.8.0',
    'active',
    ARRAY['ISO27001', 'ISMS-P'],
    'automated',
    '보안 관련 로그를 중앙 서버로 수집하고 최소 1년간 보관하십시오.',
    ARRAY['ISO27001 A.12.4.1'],
    ARRAY['로그', '모니터링'],
    (SELECT id FROM users LIMIT 1)
),
(
    (SELECT id FROM tenants LIMIT 1),
    'SYS-003',
    '시스템 보안',
    '백업',
    '데이터 백업 정책',
    '중요 데이터의 백업이 정기적으로 수행되는지 점검합니다.',
    'high',
    '2.2.0',
    'active',
    ARRAY['ISO27001', 'ISMS-P'],
    'manual',
    '일일 백업을 수행하고 복구 테스트를 월 1회 실시하십시오.',
    ARRAY['ISO27001 A.12.3.1'],
    ARRAY['백업', '재해복구'],
    (SELECT id FROM users LIMIT 1)
),

-- 애플리케이션 보안
(
    (SELECT id FROM tenants LIMIT 1),
    'APP-001',
    '애플리케이션 보안',
    'SQL Injection',
    'SQL Injection 취약점',
    '웹 애플리케이션의 SQL Injection 취약점을 점검합니다.',
    'critical',
    '1.2.0',
    'active',
    ARRAY['OWASP Top 10', 'PCI-DSS'],
    'manual',
    '파라미터화된 쿼리를 사용하고 입력값 검증을 수행하십시오.',
    ARRAY['OWASP A03:2021'],
    ARRAY['웹보안', 'OWASP', 'SQL'],
    (SELECT id FROM users LIMIT 1)
),
(
    (SELECT id FROM tenants LIMIT 1),
    'APP-002',
    '애플리케이션 보안',
    'XSS',
    'Cross-Site Scripting 점검',
    '웹 애플리케이션의 XSS 취약점을 점검합니다.',
    'high',
    '1.1.0',
    'active',
    ARRAY['OWASP Top 10'],
    'manual',
    '입력값 검증 및 출력값 인코딩을 적용하십시오.',
    ARRAY['OWASP A07:2021'],
    ARRAY['웹보안', 'XSS', 'OWASP'],
    (SELECT id FROM users LIMIT 1)
),
(
    (SELECT id FROM tenants LIMIT 1),
    'APP-003',
    '애플리케이션 보안',
    '인증',
    '세션 관리',
    '웹 애플리케이션의 세션 관리가 안전한지 점검합니다.',
    'high',
    '1.3.0',
    'active',
    ARRAY['OWASP Top 10', 'ISO27001'],
    'manual',
    '세션 토큰을 안전하게 생성하고 적절한 만료 시간을 설정하십시오.',
    ARRAY['OWASP A01:2021'],
    ARRAY['세션', '인증', '웹보안'],
    (SELECT id FROM users LIMIT 1)
),

-- 물리보안
(
    (SELECT id FROM tenants LIMIT 1),
    'PHY-001',
    '물리보안',
    '출입통제',
    '서버실 출입통제',
    '서버실 출입이 적절히 통제되고 있는지 점검합니다.',
    'medium',
    '1.0.0',
    'active',
    ARRAY['ISO27001', 'ISMS-P'],
    'manual',
    '카드키 또는 생체인증을 통한 출입통제를 실시하십시오.',
    ARRAY['ISO27001 A.11.1.1'],
    ARRAY['물리보안', '출입통제'],
    (SELECT id FROM users LIMIT 1)
),

-- 데이터베이스 보안
(
    (SELECT id FROM tenants LIMIT 1),
    'DB-001',
    '데이터베이스 보안',
    '권한관리',
    'DB 관리자 계정 관리',
    '데이터베이스 관리자 계정이 적절히 관리되는지 점검합니다.',
    'critical',
    '1.4.0',
    'active',
    ARRAY['ISO27001', 'PCI-DSS'],
    'manual',
    'DBA 계정에 대한 개인별 계정을 생성하고 공용계정 사용을 금지하십시오.',
    ARRAY['PCI-DSS 8.1'],
    ARRAY['데이터베이스', 'DBA', '권한'],
    (SELECT id FROM users LIMIT 1)
),
(
    (SELECT id FROM tenants LIMIT 1),
    'DB-002',
    '데이터베이스 보안',
    '암호화',
    'DB 데이터 암호화',
    '중요 데이터가 데이터베이스에서 암호화되어 저장되는지 점검합니다.',
    'high',
    '2.0.0',
    'active',
    ARRAY['PCI-DSS', 'GDPR'],
    'automated',
    '개인정보 및 결제정보는 반드시 암호화하여 저장하십시오.',
    ARRAY['PCI-DSS 3.4'],
    ARRAY['암호화', '개인정보보호'],
    (SELECT id FROM users LIMIT 1)
);

-- 샘플 체크리스트들
INSERT INTO assessment_checklists (
    tenant_id, name, description, version, category, status, compliance_framework, created_by
) VALUES
(
    (SELECT id FROM tenants LIMIT 1),
    '서버 보안 점검 체크리스트 v2.0',
    '리눅스/유닉스 서버 보안 점검을 위한 표준 체크리스트',
    '2.0.0',
    '서버',
    'active',
    'ISMS-P',
    (SELECT id FROM users LIMIT 1)
),
(
    (SELECT id FROM tenants LIMIT 1),
    '네트워크 장비 점검 체크리스트',
    '라우터, 스위치, 방화벽 등 네트워크 장비 보안 점검',
    '1.5.0',
    '네트워크',
    'active',
    'ISO27001',
    (SELECT id FROM users LIMIT 1)
),
(
    (SELECT id FROM tenants LIMIT 1),
    '웹 애플리케이션 보안 체크리스트',
    'OWASP Top 10 기반 웹 애플리케이션 취약점 점검',
    '3.1.0',
    '애플리케이션',
    'active',
    'OWASP',
    (SELECT id FROM users LIMIT 1)
),
(
    (SELECT id FROM tenants LIMIT 1),
    '데이터베이스 보안 체크리스트',
    '데이터베이스 서버 보안 설정 및 권한 관리 점검',
    '1.8.0',
    '데이터베이스',
    'active',
    'PCI-DSS',
    (SELECT id FROM users LIMIT 1)
),
(
    (SELECT id FROM tenants LIMIT 1),
    '종합 보안 점검 체크리스트',
    '전체 시스템에 대한 종합적인 보안 점검 항목',
    '4.0.0',
    '종합',
    'active',
    'ISMS-P',
    (SELECT id FROM users LIMIT 1)
);

-- 체크리스트별 항목 매핑
-- 서버 보안 체크리스트
INSERT INTO checklist_items (tenant_id, checklist_id, item_id, order_index, is_required, custom_weight) VALUES
((SELECT id FROM tenants LIMIT 1), (SELECT id FROM assessment_checklists WHERE name LIKE '서버 보안%' LIMIT 1), (SELECT id FROM assessment_items WHERE code = 'SEC-001'), 1, true, 1.0),
((SELECT id FROM tenants LIMIT 1), (SELECT id FROM assessment_checklists WHERE name LIKE '서버 보안%' LIMIT 1), (SELECT id FROM assessment_items WHERE code = 'SEC-002'), 2, true, 1.0),
((SELECT id FROM tenants LIMIT 1), (SELECT id FROM assessment_checklists WHERE name LIKE '서버 보안%' LIMIT 1), (SELECT id FROM assessment_items WHERE code = 'SEC-003'), 3, true, 0.8),
((SELECT id FROM tenants LIMIT 1), (SELECT id FROM assessment_checklists WHERE name LIKE '서버 보안%' LIMIT 1), (SELECT id FROM assessment_items WHERE code = 'SYS-001'), 4, true, 1.0),
((SELECT id FROM tenants LIMIT 1), (SELECT id FROM assessment_checklists WHERE name LIKE '서버 보안%' LIMIT 1), (SELECT id FROM assessment_items WHERE code = 'SYS-002'), 5, true, 0.7),
((SELECT id FROM tenants LIMIT 1), (SELECT id FROM assessment_checklists WHERE name LIKE '서버 보안%' LIMIT 1), (SELECT id FROM assessment_items WHERE code = 'SYS-003'), 6, false, 0.9);

-- 네트워크 장비 체크리스트
INSERT INTO checklist_items (tenant_id, checklist_id, item_id, order_index, is_required, custom_weight) VALUES
((SELECT id FROM tenants LIMIT 1), (SELECT id FROM assessment_checklists WHERE name LIKE '네트워크 장비%' LIMIT 1), (SELECT id FROM assessment_items WHERE code = 'NET-001'), 1, true, 1.0),
((SELECT id FROM tenants LIMIT 1), (SELECT id FROM assessment_checklists WHERE name LIKE '네트워크 장비%' LIMIT 1), (SELECT id FROM assessment_items WHERE code = 'NET-002'), 2, true, 1.0),
((SELECT id FROM tenants LIMIT 1), (SELECT id FROM assessment_checklists WHERE name LIKE '네트워크 장비%' LIMIT 1), (SELECT id FROM assessment_items WHERE code = 'SEC-001'), 3, false, 0.6);

-- 웹 애플리케이션 체크리스트
INSERT INTO checklist_items (tenant_id, checklist_id, item_id, order_index, is_required, custom_weight) VALUES
((SELECT id FROM tenants LIMIT 1), (SELECT id FROM assessment_checklists WHERE name LIKE '웹 애플리케이션%' LIMIT 1), (SELECT id FROM assessment_items WHERE code = 'APP-001'), 1, true, 1.0),
((SELECT id FROM tenants LIMIT 1), (SELECT id FROM assessment_checklists WHERE name LIKE '웹 애플리케이션%' LIMIT 1), (SELECT id FROM assessment_items WHERE code = 'APP-002'), 2, true, 0.9),
((SELECT id FROM tenants LIMIT 1), (SELECT id FROM assessment_checklists WHERE name LIKE '웹 애플리케이션%' LIMIT 1), (SELECT id FROM assessment_items WHERE code = 'APP-003'), 3, true, 0.8),
((SELECT id FROM tenants LIMIT 1), (SELECT id FROM assessment_checklists WHERE name LIKE '웹 애플리케이션%' LIMIT 1), (SELECT id FROM assessment_items WHERE code = 'NET-002'), 4, true, 0.7);

-- 데이터베이스 체크리스트
INSERT INTO checklist_items (tenant_id, checklist_id, item_id, order_index, is_required, custom_weight) VALUES
((SELECT id FROM tenants LIMIT 1), (SELECT id FROM assessment_checklists WHERE name LIKE '데이터베이스%' LIMIT 1), (SELECT id FROM assessment_items WHERE code = 'DB-001'), 1, true, 1.0),
((SELECT id FROM tenants LIMIT 1), (SELECT id FROM assessment_checklists WHERE name LIKE '데이터베이스%' LIMIT 1), (SELECT id FROM assessment_items WHERE code = 'DB-002'), 2, true, 1.0),
((SELECT id FROM tenants LIMIT 1), (SELECT id FROM assessment_checklists WHERE name LIKE '데이터베이스%' LIMIT 1), (SELECT id FROM assessment_items WHERE code = 'SEC-001'), 3, true, 0.8),
((SELECT id FROM tenants LIMIT 1), (SELECT id FROM assessment_checklists WHERE name LIKE '데이터베이스%' LIMIT 1), (SELECT id FROM assessment_items WHERE code = 'SEC-002'), 4, true, 0.9);

-- 종합 보안 점검 체크리스트 (모든 항목 포함)
INSERT INTO checklist_items (tenant_id, checklist_id, item_id, order_index, is_required, custom_weight)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    (SELECT id FROM assessment_checklists WHERE name LIKE '종합 보안%' LIMIT 1),
    ai.id,
    ROW_NUMBER() OVER (ORDER BY ai.code),
    CASE WHEN ai.severity IN ('critical', 'high') THEN true ELSE false END,
    CASE ai.severity 
        WHEN 'critical' THEN 1.0
        WHEN 'high' THEN 0.9
        WHEN 'medium' THEN 0.7
        WHEN 'low' THEN 0.5
        ELSE 0.3
    END
FROM assessment_items ai
WHERE ai.tenant_id = (SELECT id FROM tenants LIMIT 1);

-- 체크리스트 사용 통계 업데이트
UPDATE assessment_checklists SET 
    usage_count = CASE 
        WHEN name LIKE '서버%' THEN 145
        WHEN name LIKE '네트워크%' THEN 89  
        WHEN name LIKE '웹%' THEN 234
        WHEN name LIKE '데이터베이스%' THEN 67
        ELSE 45
    END,
    last_used = CASE 
        WHEN name LIKE '서버%' THEN CURRENT_TIMESTAMP - INTERVAL '1 day'
        WHEN name LIKE '네트워크%' THEN CURRENT_TIMESTAMP - INTERVAL '3 days'
        WHEN name LIKE '웹%' THEN CURRENT_TIMESTAMP - INTERVAL '2 days'
        WHEN name LIKE '데이터베이스%' THEN CURRENT_TIMESTAMP - INTERVAL '5 days'
        ELSE CURRENT_TIMESTAMP - INTERVAL '10 days'
    END
WHERE tenant_id = (SELECT id FROM tenants LIMIT 1);

-- 샘플 평가 실행 기록
INSERT INTO asset_assessments (
    tenant_id, checklist_id, asset_id, asset_name, asset_type, assessment_name, 
    status, started_at, completed_at, total_items, passed_items, failed_items, 
    overall_score, risk_level, created_by
) VALUES
(
    (SELECT id FROM tenants LIMIT 1),
    (SELECT id FROM assessment_checklists WHERE name LIKE '서버%' LIMIT 1),
    'server-001',
    'WEB-SERVER-01',
    'server',
    '웹서버 보안점검 - 2024년 2분기',
    'completed',
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    6,
    4,
    2,
    66.67,
    'medium',
    (SELECT id FROM users LIMIT 1)
),
(
    (SELECT id FROM tenants LIMIT 1),
    (SELECT id FROM assessment_checklists WHERE name LIKE '네트워크%' LIMIT 1),
    'router-001',
    'ROUTER-CORE-01',
    'network',
    '네트워크 장비 점검 - 월례',
    'completed',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '22 hours',
    3,
    3,
    0,
    100.00,
    'low',
    (SELECT id FROM users LIMIT 1)
);

-- 샘플 평가 템플릿
INSERT INTO assessment_templates (
    tenant_id, name, description, target_asset_types, default_checklist_id, 
    auto_schedule, schedule_cron, created_by
) VALUES
(
    (SELECT id FROM tenants LIMIT 1),
    '서버 월례 보안점검',
    '모든 서버에 대한 월례 보안점검 템플릿',
    ARRAY['server', 'database'],
    (SELECT id FROM assessment_checklists WHERE name LIKE '서버%' LIMIT 1),
    true,
    '0 9 1 * *', -- 매월 1일 오전 9시
    (SELECT id FROM users LIMIT 1)
),
(
    (SELECT id FROM tenants LIMIT 1),
    '웹 애플리케이션 분기 점검',
    '웹 애플리케이션에 대한 분기별 보안점검',
    ARRAY['application', 'web'],
    (SELECT id FROM assessment_checklists WHERE name LIKE '웹%' LIMIT 1),
    false,
    null,
    (SELECT id FROM users LIMIT 1)
);