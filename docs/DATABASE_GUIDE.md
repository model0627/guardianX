# PostgreSQL 데이터베이스 연결 가이드

GuardianX 프로젝트에서 PostgreSQL 데이터베이스를 설정하고 사용하는 방법을 안내합니다.

## 📋 목차

1. [데이터베이스 설정](#데이터베이스-설정)
2. [환경 변수 구성](#환경-변수-구성)
3. [데이터베이스 연결 사용법](#데이터베이스-연결-사용법)
4. [환경별 설정](#환경별-설정)
5. [문제 해결](#문제-해결)

## 데이터베이스 설정

### PostgreSQL 설치

#### macOS (Homebrew)
```bash
# PostgreSQL 설치
brew install postgresql

# 서비스 시작
brew services start postgresql

# 데이터베이스 생성
createdb guardianx_dev
```

#### Ubuntu/Debian
```bash
# PostgreSQL 설치
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# PostgreSQL 서비스 시작
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 사용자 및 데이터베이스 생성
sudo -u postgres psql
CREATE USER your_username WITH PASSWORD 'your_password';
CREATE DATABASE guardianx_dev OWNER your_username;
GRANT ALL PRIVILEGES ON DATABASE guardianx_dev TO your_username;
\q
```

#### Docker 사용
```bash
# PostgreSQL 컨테이너 실행
docker run --name guardianx-postgres \
  -e POSTGRES_DB=guardianx_dev \
  -e POSTGRES_USER=your_username \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d postgres:15

# 컨테이너 확인
docker ps
```

## 환경 변수 구성

### 1. 개발 환경 (.env.local)

```env
# PostgreSQL 데이터베이스 설정
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/guardianx_dev

# 또는 개별 설정 사용
DB_HOST=localhost
DB_PORT=5432
DB_NAME=guardianx_dev
DB_USER=your_username
DB_PASSWORD=your_password
DB_SSL=false

# 연결 풀 설정
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# 디버깅
DEBUG_MODE=true
LOG_LEVEL=debug
```

### 2. 프로덕션 환경 (Vercel)

Vercel 대시보드에서 환경 변수 설정:

```env
# 필수 환경 변수
DATABASE_URL=postgresql://username:password@hostname:5432/database_name
NODE_ENV=production
DB_SSL=true

# 보안 설정
JWT_SECRET=super-secure-random-string-minimum-32-characters
API_SECRET_KEY=your-production-api-key

# 성능 설정
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000
```

### 3. 스테이징 환경

```env
# 스테이징용 설정
DATABASE_URL=postgresql://staging_user:staging_pass@staging-host:5432/guardianx_staging
NODE_ENV=staging
DB_SSL=true

# 스테이징 특화 설정
DEBUG_MODE=false
LOG_LEVEL=info
```

## 데이터베이스 연결 사용법

### 1. 기본 쿼리 실행

```typescript
import { query } from '@/lib/database';

// 사용자 목록 조회
export async function getUsers() {
  try {
    const result = await query('SELECT * FROM users ORDER BY created_at DESC');
    return result.rows;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
}

// 매개변수가 있는 쿼리
export async function getUserById(id: string) {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}
```

### 2. 트랜잭션 사용

```typescript
import { transaction } from '@/lib/database';

// 사용자 생성과 프로필 생성을 하나의 트랜잭션으로
export async function createUserWithProfile(userData: any, profileData: any) {
  return await transaction(async (client) => {
    // 사용자 생성
    const userResult = await client.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [userData.name, userData.email]
    );
    
    const user = userResult.rows[0];
    
    // 프로필 생성
    await client.query(
      'INSERT INTO user_profiles (user_id, bio, avatar) VALUES ($1, $2, $3)',
      [user.id, profileData.bio, profileData.avatar]
    );
    
    return user;
  });
}
```

### 3. 페이지네이션 구현

```typescript
import { query, getPagination, createPaginationResult } from '@/lib/database';

export async function getPaginatedUsers(page: number = 1, limit: number = 20) {
  try {
    const { offset } = getPagination(page, limit);
    
    // 전체 개수 조회
    const countResult = await query('SELECT COUNT(*) FROM users');
    const total = parseInt(countResult.rows[0].count);
    
    // 페이지네이션된 데이터 조회
    const dataResult = await query(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    return createPaginationResult(dataResult.rows, total, page, limit);
  } catch (error) {
    console.error('Failed to fetch paginated users:', error);
    throw error;
  }
}
```

### 4. 동적 WHERE 절 구성

```typescript
import { query, buildWhereClause } from '@/lib/database';

export async function searchUsers(filters: {
  name?: string;
  email?: string;
  role?: string;
}) {
  try {
    const { whereClause, values } = buildWhereClause(filters);
    
    const sql = `
      SELECT * FROM users 
      ${whereClause}
      ORDER BY created_at DESC
    `;
    
    const result = await query(sql, values);
    return result.rows;
  } catch (error) {
    console.error('Failed to search users:', error);
    throw error;
  }
}
```

### 5. API Route에서 사용

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const users = await getPaginatedUsers(page, limit);
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const result = await query(
      'INSERT INTO users (name, email, role) VALUES ($1, $2, $3) RETURNING *',
      [body.name, body.email, body.role || 'user']
    );
    
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

## 환경별 설정

### 1. 로컬 개발 환경

```bash
# PostgreSQL 로컬 설치 후
createdb guardianx_dev
createuser --interactive your_username

# .env.local 파일 생성
cp .env.example .env.local

# 실제 값으로 수정
vim .env.local
```

### 2. Docker Compose를 이용한 개발 환경

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: guardianx_dev
      POSTGRES_USER: your_username
      POSTGRES_PASSWORD: your_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
# Docker Compose 실행
docker-compose up -d

# 데이터베이스 상태 확인
docker-compose logs postgres
```

### 3. 클라우드 데이터베이스 (예: Supabase, Neon, RDS)

#### Supabase
```env
DATABASE_URL=postgresql://postgres:your_password@db.your_project.supabase.co:5432/postgres
DB_SSL=true
```

#### Neon
```env
DATABASE_URL=postgresql://username:password@ep-cool-name-123456.us-east-1.aws.neon.tech/neondb
DB_SSL=true
```

#### AWS RDS
```env
DATABASE_URL=postgresql://username:password@your-db.123456789012.us-west-2.rds.amazonaws.com:5432/guardianx
DB_SSL=true
```

### 4. Vercel 배포 시 설정

Vercel 대시보드에서:

1. **Project Settings** → **Environment Variables**
2. 다음 변수들 추가:
   ```
   DATABASE_URL: your_production_database_url
   JWT_SECRET: your_production_jwt_secret
   DB_SSL: true
   NODE_ENV: production
   ```

## 데이터베이스 스키마 예시

```sql
-- 사용자 테이블
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용자 프로필 테이블
CREATE TABLE user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  avatar VARCHAR(500),
  location VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- 트리거 함수 (updated_at 자동 업데이트)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 문제 해결

### 자주 발생하는 문제들

#### 1. 연결 실패
```bash
# 에러: ECONNREFUSED
# 해결: PostgreSQL 서비스 상태 확인
sudo systemctl status postgresql

# macOS에서
brew services list | grep postgresql
```

#### 2. 인증 실패
```bash
# 에러: password authentication failed
# 해결: 사용자 권한 확인
sudo -u postgres psql
\du  # 사용자 목록 확인
```

#### 3. 데이터베이스 존재하지 않음
```bash
# 에러: database "guardianx_dev" does not exist
# 해결: 데이터베이스 생성
createdb guardianx_dev
```

#### 4. SSL 연결 문제
```env
# 개발환경에서 SSL 비활성화
DB_SSL=false

# 프로덕션에서 SSL 필수
DB_SSL=true
```

### 디버깅 방법

#### 1. 연결 테스트
```bash
# psql로 직접 연결 테스트
psql "postgresql://username:password@localhost:5432/guardianx_dev"
```

#### 2. 로그 확인
```typescript
// DEBUG_MODE=true일 때 쿼리 로그 확인
// 개발자 도구 콘솔에서 확인 가능
```

#### 3. Health Check API 사용
```bash
# 데이터베이스 상태 확인
curl http://localhost:3000/api/health
```

### 성능 최적화

#### 1. 연결 풀 튜닝
```env
# 개발환경
DB_POOL_MIN=2
DB_POOL_MAX=10

# 프로덕션환경
DB_POOL_MIN=5
DB_POOL_MAX=50
```

#### 2. 쿼리 최적화
```sql
-- 인덱스 사용 확인
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';

-- 슬로우 쿼리 로깅 활성화
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- 1초 이상 쿼리 로깅
```

## 🎯 베스트 프랙티스

1. **보안**: 프로덕션에서는 반드시 SSL 사용
2. **연결 관리**: 연결 풀 적절히 설정
3. **에러 처리**: 모든 데이터베이스 작업에 try-catch 사용
4. **트랜잭션**: 관련된 여러 작업은 트랜잭션으로 묶기
5. **인덱스**: 자주 조회되는 컬럼에 인덱스 생성
6. **환경 분리**: 개발/스테이징/프로덕션 환경 명확히 분리

이제 PostgreSQL 데이터베이스와 완벽하게 연동된 API를 구축할 수 있습니다! 🚀