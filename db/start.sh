#!/bin/bash

# GuardianX 로컬 데이터베이스 시작 스크립트

echo "🚀 GuardianX 로컬 데이터베이스를 시작합니다..."

# Docker 실행 확인
if ! command -v docker &> /dev/null; then
    echo "❌ Docker가 설치되어 있지 않습니다."
    echo "https://www.docker.com/get-started 에서 Docker를 설치해주세요."
    exit 1
fi

# Docker Compose 실행 확인
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose가 설치되어 있지 않습니다."
    exit 1
fi

# 현재 디렉토리 확인
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml 파일을 찾을 수 없습니다."
    echo "db 디렉토리에서 이 스크립트를 실행해주세요."
    exit 1
fi

# 기존 컨테이너 확인
if [ "$(docker ps -q -f name=guardianx-postgres)" ]; then
    echo "✅ 데이터베이스가 이미 실행 중입니다."
    docker-compose ps
else
    echo "📦 PostgreSQL 컨테이너를 시작합니다..."
    docker-compose up -d
    
    echo "⏳ 데이터베이스 초기화를 기다립니다..."
    sleep 5
    
    # 헬스체크
    for i in {1..30}; do
        if docker-compose exec -T postgres pg_isready -U app -d guardianx_dev &>/dev/null; then
            echo "✅ 데이터베이스가 준비되었습니다!"
            break
        fi
        echo "⏳ 대기 중... ($i/30)"
        sleep 1
    done
fi

echo ""
echo "📊 데이터베이스 정보:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: guardianx_dev"
echo "  Username: app"
echo "  Password: secret"
echo ""
echo "🔗 연결 URL: postgresql://app:secret@localhost:5432/guardianx_dev"
echo ""
echo "💡 팁:"
echo "  - 로그 확인: docker-compose logs -f postgres"
echo "  - DB 접속: docker-compose exec postgres psql -U app -d guardianx_dev"
echo "  - 중지: docker-compose stop"
echo "  - pgAdmin: docker-compose --profile tools up -d (http://localhost:5050)"