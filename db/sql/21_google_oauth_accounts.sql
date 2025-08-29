-- Google OAuth 계정 연동 테이블
-- 실행 날짜: 2025-08-22
-- 목적: 사용자별 Google 계정 연동 및 OAuth 토큰 관리

-- Google 계정 연동 테이블
CREATE TABLE IF NOT EXISTS google_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_user_id VARCHAR(255) NOT NULL, -- Google 사용자 고유 ID
    email VARCHAR(255) NOT NULL, -- Google 계정 이메일
    name VARCHAR(255), -- Google 계정 이름
    picture_url TEXT, -- 프로필 이미지 URL
    access_token TEXT NOT NULL, -- OAuth 액세스 토큰 (암호화 권장)
    refresh_token TEXT, -- 리프레시 토큰 (암호화 권장)
    token_expires_at TIMESTAMP WITH TIME ZONE, -- 토큰 만료 시간
    scope TEXT, -- 승인된 권한 범위
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 유니크 제약조건: 한 사용자는 하나의 Google 계정만 연결 가능
    CONSTRAINT google_accounts_user_unique UNIQUE (user_id),
    
    -- 유니크 제약조건: 같은 Google 계정은 한 번만 연결 가능
    CONSTRAINT google_accounts_google_user_unique UNIQUE (google_user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_google_accounts_user_id ON google_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_google_accounts_google_user_id ON google_accounts(google_user_id);
CREATE INDEX IF NOT EXISTS idx_google_accounts_email ON google_accounts(email);

-- 업데이트 트리거 생성
CREATE OR REPLACE FUNCTION update_google_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_google_accounts_updated_at
    BEFORE UPDATE ON google_accounts
    FOR EACH ROW EXECUTE FUNCTION update_google_accounts_updated_at();

-- Google Sheets 연결 테이블 업데이트 (OAuth 지원 추가)
ALTER TABLE google_sheets_connections 
ADD COLUMN IF NOT EXISTS google_account_id UUID REFERENCES google_accounts(id) ON DELETE SET NULL;

-- auth_type에 oauth 추가
ALTER TABLE google_sheets_connections 
DROP CONSTRAINT IF EXISTS google_sheets_connections_auth_type_check;

ALTER TABLE google_sheets_connections 
ADD CONSTRAINT google_sheets_connections_auth_type_check 
CHECK (auth_type IN ('public', 'api_key', 'service_account', 'oauth'));

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_google_sheets_connections_google_account ON google_sheets_connections(google_account_id);

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