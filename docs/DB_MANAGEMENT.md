# 데이터베이스 관리 가이드

GuardianX 프로젝트의 PostgreSQL 데이터베이스 초기화, 관리, 문제 해결 가이드입니다.

## 📋 목차

1. [데이터베이스 초기 설정](#데이터베이스-초기-설정)
2. [테이블 생성 및 초기화](#테이블-생성-및-초기화)
3. [시드 데이터 삽입](#시드-데이터-삽입)
4. [데이터베이스 상태 확인](#데이터베이스-상태-확인)
5. [문제 해결](#문제-해결)
6. [백업 및 복원](#백업-및-복원)

## 데이터베이스 초기 설정

### 1. PostgreSQL 컨테이너 시작

```bash
# db 디렉토리로 이동
cd db

# Docker Compose로 PostgreSQL 시작
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f postgres
```

### 2. 데이터베이스 연결 확인

```bash
# 컨테이너 내부에서 PostgreSQL 접속
docker-compose exec db psql -U app -d guardianx_dev

# 또는 로컬에서 직접 접속 (psql 설치된 경우)
psql "postgresql://app:secret@localhost:5432/guardianx_dev"
```

### 3. 기본 정보 확인

```sql
-- 현재 데이터베이스 정보
SELECT current_database(), current_user, version();

-- 테이블 목록 확인
\dt

-- 스키마 목록 확인
\dn

-- 확장 기능 확인
\dx
```

## 테이블 생성 및 초기화

### 1. "relation does not exist" 오류 해결

이 오류가 발생하면 테이블이 생성되지 않은 것입니다.

#### 방법 1: 초기화 스크립트 실행

```bash
# 1. UUID 확장 설치
docker-compose exec db psql -U app -d guardianx_dev -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# 2. 테이블 생성 스크립트 실행
docker-compose exec -T db psql -U app -d guardianx_dev < db/init/01_create_tables.sql

# 3. 테이블 생성 확인
docker-compose exec db psql -U app -d guardianx_dev -c "\dt"
```

#### 방법 2: 직접 SQL 실행

```bash
# 개별 테이블 생성 (users 테이블 예시)
docker-compose exec db psql -U app -d guardianx_dev -c "
CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
"
```

### 2. 생성되는 테이블 목록

| 테이블명 | 용도 | 주요 컬럼 |
|----------|------|-----------|
| `users` | 사용자 정보 | id, email, password_hash, name, role |
| `user_profiles` | 사용자 프로필 | user_id, bio, avatar_url, location |
| `sessions` | 세션 관리 | user_id, token, expires_at |
| `audit_logs` | 감사 로그 | user_id, action, entity_type, ip_address |
| `api_keys` | API 키 관리 | user_id, key_hash, permissions |
| `products` | 샘플 제품 | name, price, category, created_by |

### 3. 테이블 구조 확인

```bash
# 특정 테이블 구조 확인
docker-compose exec db psql -U app -d guardianx_dev -c "\d users"

# 모든 테이블의 행 수 확인
docker-compose exec db psql -U app -d guardianx_dev -c "
SELECT 
    schemaname,
    tablename,
    n_tup_ins as \"Total Rows\"
FROM pg_stat_user_tables 
ORDER BY tablename;
"
```

## 시드 데이터 삽입

### 1. 테스트 사용자 생성

#### 비밀번호 해시 생성
```bash
# bcryptjs로 비밀번호 해시 생성 (password123)
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('password123', 12));"
```

#### 사용자 데이터 삽입
```bash
# 기본 테스트 사용자 3명 생성
docker-compose exec db psql -U app -d guardianx_dev -c "
INSERT INTO users (email, password_hash, name, role, is_active, email_verified) VALUES 
('admin@guardianx.com', '\$2b\$12\$siQuUIZslsZ0WMeGLxGbe.9rPaepLX.AXnD85UhCiXpLyXTHMuTWW', 'Admin User', 'admin', true, true),
('john.doe@example.com', '\$2b\$12\$siQuUIZslsZ0WMeGLxGbe.9rPaepLX.AXnD85UhCiXpLyXTHMuTWW', 'John Doe', 'user', true, true),
('test@guardianx.com', '\$2b\$12\$siQuUIZslsZ0WMeGLxGbe.9rPaepLX.AXnD85UhCiXpLyXTHMuTWW', 'Test User', 'user', true, false)
ON CONFLICT (email) DO NOTHING;
"
```

#### 사용자 프로필 생성
```bash
# 사용자 프로필 데이터 삽입
docker-compose exec db psql -U app -d guardianx_dev -c "
INSERT INTO user_profiles (user_id, bio) 
SELECT id, name || '님의 프로필입니다.' FROM users 
WHERE email IN ('admin@guardianx.com', 'john.doe@example.com', 'test@guardianx.com')
ON CONFLICT (user_id) DO NOTHING;
"
```

### 2. 전체 시드 데이터 실행

```bash
# 시드 데이터 스크립트 실행
docker-compose exec -T db psql -U app -d guardianx_dev < db/init/02_seed_data.sql
```

### 3. 생성된 사용자 확인

```bash
# 사용자 목록 확인
docker-compose exec db psql -U app -d guardianx_dev -c "
SELECT email, name, role, is_active, email_verified, created_at 
FROM users 
ORDER BY created_at;
"

# 사용자 프로필 포함 확인
docker-compose exec db psql -U app -d guardianx_dev -c "
SELECT u.email, u.name, u.role, p.bio 
FROM users u 
LEFT JOIN user_profiles p ON u.id = p.user_id;
"
```

### 4. 기본 테스트 계정 정보

| 이메일 | 비밀번호 | 역할 | 상태 |
|--------|----------|------|------|
| `admin@guardianx.com` | `password123` | admin | 활성화, 이메일 인증됨 |
| `john.doe@example.com` | `password123` | user | 활성화, 이메일 인증됨 |
| `test@guardianx.com` | `password123` | user | 활성화, 이메일 미인증 |

## 데이터베이스 상태 확인

### 1. API를 통한 확인

```bash
# Health Check API (데이터베이스 연결 상태 포함)
curl http://localhost:3000/api/health

# 로그인 테스트
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@guardianx.com",
    "password": "password123"
  }'
```

### 2. 직접 데이터베이스 확인

```bash
# 테이블 존재 확인
docker-compose exec db psql -U app -d guardianx_dev -c "\dt"

# 테이블별 레코드 수 확인
docker-compose exec db psql -U app -d guardianx_dev -c "
SELECT 
    'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 
    'user_profiles' as table_name, COUNT(*) as record_count FROM user_profiles
UNION ALL
SELECT 
    'audit_logs' as table_name, COUNT(*) as record_count FROM audit_logs;
"

# 최근 생성된 사용자 확인
docker-compose exec db psql -U app -d guardianx_dev -c "
SELECT email, name, role, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 5;
"
```

### 3. 연결 풀 상태 확인

```bash
# PostgreSQL 연결 상태
docker-compose exec db psql -U app -d guardianx_dev -c "
SELECT 
    datname,
    numbackends,
    xact_commit,
    xact_rollback
FROM pg_stat_database 
WHERE datname = 'guardianx_dev';
"
```

## 문제 해결

### 1. "relation does not exist" 오류

**원인**: 테이블이 생성되지 않음

**해결방법**:
```bash
# 1단계: 테이블 확인
docker-compose exec db psql -U app -d guardianx_dev -c "\dt"

# 2단계: 없으면 테이블 생성
docker-compose exec -T db psql -U app -d guardianx_dev < db/init/01_create_tables.sql

# 3단계: 시드 데이터 삽입
docker-compose exec -T db psql -U app -d guardianx_dev < db/init/02_seed_data.sql
```

### 2. "password authentication failed" 오류

**원인**: 잘못된 데이터베이스 자격 증명

**해결방법**:
```bash
# 환경 변수 확인
echo $DATABASE_URL

# .env.local 파일 확인
cat .env.local | grep DB_

# 올바른 자격 증명으로 연결 테스트
docker-compose exec db psql -U app -d guardianx_dev -c "SELECT current_user;"
```

### 3. 포트 충돌 오류

**원인**: 5432 포트가 이미 사용 중

**해결방법**:
```bash
# 사용 중인 프로세스 확인
lsof -i :5432

# docker-compose.yml에서 포트 변경
# ports:
#   - "5433:5432"

# .env.local에서 포트 업데이트
# DB_PORT=5433
```

### 4. 컨테이너 초기화 오류

**해결방법**:
```bash
# 컨테이너 완전 재시작
docker-compose down -v
rm -rf db/data
docker-compose up -d

# 로그 확인
docker-compose logs postgres
```

### 5. 권한 오류

**해결방법**:
```bash
# app 사용자 권한 확인
docker-compose exec db psql -U app -d guardianx_dev -c "\dp users"

# 권한 재부여
docker-compose exec db psql -U app -d guardianx_dev -c "
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app;
"
```

## 백업 및 복원

### 1. 데이터베이스 백업

```bash
# 전체 데이터베이스 백업
docker-compose exec postgres pg_dump -U app guardianx_dev > backup_$(date +%Y%m%d_%H%M%S).sql

# 특정 테이블만 백업
docker-compose exec postgres pg_dump -U app -t users -t user_profiles guardianx_dev > users_backup.sql

# 압축 백업
docker-compose exec postgres pg_dump -U app guardianx_dev | gzip > backup.sql.gz
```

### 2. 데이터베이스 복원

```bash
# 백업에서 복원
docker-compose exec -T postgres psql -U app guardianx_dev < backup.sql

# 압축 파일에서 복원
gunzip -c backup.sql.gz | docker-compose exec -T postgres psql -U app guardianx_dev
```

### 3. 데이터베이스 초기화

```bash
# 모든 데이터 삭제 후 재생성
docker-compose exec db psql -U app -d guardianx_dev -c "
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO app;
GRANT ALL ON SCHEMA public TO public;
"

# 테이블 재생성
docker-compose exec -T db psql -U app -d guardianx_dev < db/init/01_create_tables.sql

# 시드 데이터 재삽입
docker-compose exec -T db psql -U app -d guardianx_dev < db/init/02_seed_data.sql
```

## 📝 자동화 스크립트

### 완전 초기화 스크립트

```bash
#!/bin/bash
# db/reset_db.sh

echo "🔄 데이터베이스를 완전히 초기화합니다..."

# 1. 컨테이너 중지 및 볼륨 삭제
docker-compose down -v
rm -rf data/

# 2. 컨테이너 재시작
docker-compose up -d

# 3. 데이터베이스 준비 대기
echo "⏳ 데이터베이스 시작을 기다립니다..."
sleep 10

# 4. 테이블 생성
echo "📋 테이블을 생성합니다..."
docker-compose exec -T db psql -U app -d guardianx_dev < init/01_create_tables.sql

# 5. 시드 데이터 삽입
echo "🌱 시드 데이터를 삽입합니다..."
docker-compose exec -T db psql -U app -d guardianx_dev < init/02_seed_data.sql

# 6. 상태 확인
echo "✅ 초기화 완료!"
docker-compose exec db psql -U app -d guardianx_dev -c "SELECT COUNT(*) as user_count FROM users;"

echo "🎯 테스트 계정: admin@guardianx.com / password123"
```

실행 권한 부여:
```bash
chmod +x db/reset_db.sh
```

## 🎯 빠른 참조

### 자주 사용하는 명령어

```bash
# 데이터베이스 상태 확인
curl http://localhost:3000/api/health

# 테이블 목록
docker-compose exec db psql -U app -d guardianx_dev -c "\dt"

# 사용자 목록
docker-compose exec db psql -U app -d guardianx_dev -c "SELECT email, name, role FROM users;"

# 로그 확인
docker-compose logs postgres

# 컨테이너 재시작
docker-compose restart postgres
```

### 환경 변수

```env
DATABASE_URL=postgresql://app:secret@localhost:5432/guardianx_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=guardianx_dev
DB_USER=app
DB_PASSWORD=secret
```

이제 데이터베이스 관리 작업을 체계적으로 수행할 수 있습니다! 🚀