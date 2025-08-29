#!/bin/bash

# GuardianX 데이터베이스 완전 초기화 스크립트

echo "🔄 GuardianX 데이터베이스를 완전히 초기화합니다..."

# 현재 디렉토리 확인
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml 파일을 찾을 수 없습니다."
    echo "db 디렉토리에서 이 스크립트를 실행해주세요."
    exit 1
fi

# 1. 컨테이너 중지 및 볼륨 삭제
echo "🛑 기존 컨테이너를 중지하고 데이터를 삭제합니다..."
docker-compose down -v
rm -rf data/

# 2. 컨테이너 재시작
echo "🚀 PostgreSQL 컨테이너를 시작합니다..."
docker-compose up -d

# 3. 데이터베이스 준비 대기
echo "⏳ 데이터베이스 시작을 기다립니다..."
for i in {1..30}; do
    if docker-compose exec -T db pg_isready -U app -d guardianx_dev &>/dev/null; then
        echo "✅ 데이터베이스가 준비되었습니다!"
        break
    fi
    echo "⏳ 대기 중... ($i/30)"
    sleep 1
done

# 4. UUID 확장 설치
echo "🔧 UUID 확장을 설치합니다..."
docker-compose exec db psql -U app -d guardianx_dev -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" &>/dev/null

# 5. 테이블 생성
echo "📋 테이블을 생성합니다..."
if docker-compose exec -T db psql -U app -d guardianx_dev < init/01_create_tables.sql &>/dev/null; then
    echo "✅ 테이블 생성 완료!"
else
    echo "❌ 테이블 생성 실패!"
    exit 1
fi

# 6. 시드 데이터 삽입
echo "🌱 시드 데이터를 삽입합니다..."

# 비밀번호 해시 생성 (password123)
PASSWORD_HASH='$2b$12$siQuUIZslsZ0WMeGLxGbe.9rPaepLX.AXnD85UhCiXpLyXTHMuTWW'

# 테스트 사용자 생성
docker-compose exec db psql -U app -d guardianx_dev -c "
INSERT INTO users (email, password_hash, name, role, is_active, email_verified) VALUES 
('admin@guardianx.com', '$PASSWORD_HASH', 'Admin User', 'admin', true, true),
('john.doe@example.com', '$PASSWORD_HASH', 'John Doe', 'user', true, true),
('test@guardianx.com', '$PASSWORD_HASH', 'Test User', 'user', true, false)
ON CONFLICT (email) DO NOTHING;
" &>/dev/null

# 사용자 프로필 생성
docker-compose exec db psql -U app -d guardianx_dev -c "
INSERT INTO user_profiles (user_id, bio) 
SELECT id, name || '님의 프로필입니다.' FROM users 
WHERE email IN ('admin@guardianx.com', 'john.doe@example.com', 'test@guardianx.com')
ON CONFLICT (user_id) DO NOTHING;
" &>/dev/null

# 7. 상태 확인
echo "📊 초기화 결과를 확인합니다..."
USER_COUNT=$(docker-compose exec -T db psql -U app -d guardianx_dev -c "SELECT COUNT(*) FROM users;" | grep -oE '[0-9]+' | head -1)
TABLE_COUNT=$(docker-compose exec -T db psql -U app -d guardianx_dev -c "\dt" | grep -c "public |")

echo ""
echo "✅ 데이터베이스 초기화 완료!"
echo "📊 통계:"
echo "  - 생성된 테이블: $TABLE_COUNT개"
echo "  - 생성된 사용자: $USER_COUNT명"
echo ""
echo "🔑 테스트 계정 정보:"
echo "  - 관리자: admin@guardianx.com / password123"
echo "  - 일반사용자: john.doe@example.com / password123"
echo "  - 테스트사용자: test@guardianx.com / password123"
echo ""
echo "🌐 접속 정보:"
echo "  - 웹사이트: http://localhost:3000"
echo "  - API 문서: http://localhost:3000/api-docs"
echo "  - Health Check: http://localhost:3000/api/health"
echo "  - pgAdmin: http://localhost:5050 (admin@guardianx.com / admin123)"
echo ""
echo "🎉 모든 준비가 완료되었습니다!"