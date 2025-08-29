-- Google Sheets 간편 연결 테이블
-- 실행 날짜: 2025-08-22
-- 목적: Google Sheets 공유 링크를 통한 간편 연동

-- Google Sheets 연결 정보 테이블
-- 공개된 스프레드시트나 공유 링크를 통해 데이터를 가져옴
CREATE TABLE IF NOT EXISTS google_sheets_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_connection_id UUID NOT NULL REFERENCES api_connections(id) ON DELETE CASCADE,
    spreadsheet_url TEXT NOT NULL, -- Google Sheets 공유 URL
    spreadsheet_id VARCHAR(255), -- URL에서 추출한 스프레드시트 ID
    spreadsheet_name VARCHAR(255),
    sheet_name VARCHAR(255) DEFAULT 'Sheet1',
    range_notation VARCHAR(50) DEFAULT 'A:Z', -- 예: A1:Z100, A:Z (전체 열)
    header_row INTEGER DEFAULT 1,
    auth_type VARCHAR(50) DEFAULT 'public', -- public, api_key, service_account
    api_key TEXT, -- Google API Key (선택사항)
    service_account_json TEXT, -- Service Account JSON (선택사항)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 유니크 제약조건: 한 API 연결은 하나의 스프레드시트만 연결 가능
    CONSTRAINT sheets_connection_unique UNIQUE (api_connection_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_google_sheets_connections_api_id ON google_sheets_connections(api_connection_id);

-- 업데이트 트리거 생성
CREATE OR REPLACE FUNCTION update_google_sheets_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_google_sheets_connections_updated_at
    BEFORE UPDATE ON google_sheets_connections
    FOR EACH ROW EXECUTE FUNCTION update_google_sheets_connections_updated_at();

-- API connections 테이블에 connection_type 값 추가 지원
-- 'google_sheets' 타입 추가를 위한 체크 제약조건 업데이트
ALTER TABLE api_connections 
DROP CONSTRAINT IF EXISTS api_connections_connection_type_check;

ALTER TABLE api_connections 
ADD CONSTRAINT api_connections_connection_type_check 
CHECK (connection_type IN ('rest', 'graphql', 'soap', 'webhook', 'google_sheets'));

-- 테이블 정보 확인
SELECT 
    'google_accounts' as table_name,
    COUNT(*) as record_count
FROM google_accounts
UNION ALL
SELECT 
    'google_sheets_connections' as table_name,
    COUNT(*) as record_count
FROM google_sheets_connections;