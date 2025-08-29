# 로컬 PostgreSQL 데이터베이스 설정

이 디렉토리는 GuardianX 프로젝트의 로컬 PostgreSQL 데이터베이스를 Docker로 관리합니다.

## 📁 디렉토리 구조

```
db/
├── docker-compose.yml    # Docker Compose 설정
├── init/                # 초기화 SQL 스크립트
│   ├── 01_create_tables.sql  # 테이블 생성
│   └── 02_seed_data.sql      # 개발용 시드 데이터
├── data/                # PostgreSQL 데이터 (자동 생성, .gitignore)
└── README.md           # 이 파일
```

## 🚀 빠른 시작

### 1. 데이터베이스 시작

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

### 2. 데이터베이스 접속 정보

```
Host: localhost
Port: 5432
Database: guardianx_dev
Username: app
Password: secret
```

### 3. 데이터베이스 중지

```bash
# 컨테이너 중지
docker-compose stop

# 컨테이너 제거 (데이터는 유지)
docker-compose down

# 컨테이너와 데이터 모두 제거 (주의!)
docker-compose down -v
rm -rf data/
```

## 🛠 관리 명령어

### psql로 직접 접속

```bash
# Docker 컨테이너 내부에서 psql 실행 (컨테이너명: pg17)
docker exec pg17 psql -U app -d guardianx_dev

# 또는 docker-compose를 통해
docker-compose exec postgres psql -U app -d guardianx_dev

# 또는 로컬에 psql이 설치된 경우
psql "postgresql://app:secret@localhost:5432/guardianx_dev"
```

### 유용한 SQL 명령어

```sql
-- 테이블 목록 확인
\dt

-- 특정 테이블 구조 확인
\d users

-- 사용자 수 확인
SELECT COUNT(*) FROM users;

-- 제품 목록 확인
SELECT id, name, price, category FROM products LIMIT 10;

-- 뷰 확인
SELECT * FROM user_details;

-- 권한 확인
\dp
```

### 데이터베이스 백업 및 복원

```bash
# 백업 (pg17 컨테이너 사용)
docker exec pg17 pg_dump -U app guardianx_dev > backup.sql

# 복원 (pg17 컨테이너 사용)
docker exec -i pg17 psql -U app guardianx_dev < backup.sql

# 또는 docker-compose를 통해
docker-compose exec postgres pg_dump -U app guardianx_dev > backup.sql
docker-compose exec -T postgres psql -U app guardianx_dev < backup.sql
```

## 📊 pgAdmin 사용 (선택사항)

pgAdmin은 웹 기반 PostgreSQL 관리 도구입니다.

### pgAdmin 시작

```bash
# pgAdmin 포함하여 시작
docker-compose --profile tools up -d

# pgAdmin 접속
# URL: http://localhost:5050
# Email: admin@guardianx.com
# Password: admin123
```

### pgAdmin에서 서버 추가

1. pgAdmin 로그인 후 "Add New Server" 클릭
2. 다음 정보 입력:
   - General 탭:
     - Name: GuardianX Local
   - Connection 탭:
     - Host: postgres (Docker 네트워크 내부 호스트명)
     - Port: 5432
     - Database: guardianx_dev
     - Username: app
     - Password: secret

## 🔧 초기화 스크립트

### 01_create_tables.sql

다음 테이블들을 생성합니다:

- **users**: 사용자 정보
- **user_profiles**: 사용자 프로필
- **sessions**: 세션 관리
- **audit_logs**: 감사 로그
- **api_keys**: API 키 관리
- **products**: 샘플 제품 테이블

특징:
- UUID 기본 키 사용
- 자동 updated_at 트리거
- 적절한 인덱스 설정
- 외래 키 제약 조건

### 02_seed_data.sql

개발 환경용 샘플 데이터:

- 5명의 테스트 사용자
- 사용자 프로필 정보
- 10개의 샘플 제품
- API 키 샘플
- 감사 로그 샘플

### 03_create_tenants.sql

멀티 테넌트 시스템 구성:

- **tenants**: 테넌트 정보
- 사용자-테넌트 관계 설정

### 04_create_ipam_tables.sql

IPAM (IP Address Management) 테이블 생성:

- **offices**: 사무실 정보
- **server_rooms**: 서버실 정보
- **racks**: 랙 정보
- **ip_ranges**: IP 대역 정보
- **ip_addresses**: IP 주소 정보
- **devices**: 디바이스 정보
- **device_ip_mappings**: 디바이스-IP 매핑
- **device_library**: 디바이스 템플릿
- **contacts**: 담당자 정보
- **contact_resource_mappings**: 담당자-자원 매핑

### 05_update_racks_schema.sql

랙 테이블 스키마 업데이트:

- `rack_number` 필드 추가
- `size_u`, `used_u` 필드 추가 (U 단위 관리)
- 기존 `rack_height` 데이터 마이그레이션
- 인덱스 및 제약 조건 추가

### 06_insert_sample_ipam_data.sql

IPAM 기능 테스트용 샘플 데이터:

- Mgmt 대역 (192.168.130.0/24) 추가
- 할당된 IP 주소 (Cesar Schroeder, Shawn)
- 사용가능/예약된 IP 주소들

## 📝 개발 중 실행된 쿼리 기록 규칙

새로운 기능을 개발할 때 실행한 SQL 쿼리들은 반드시 다음과 같이 기록합니다:

1. **파일명 규칙**: `순서번호_기능설명.sql` (예: `07_add_device_monitoring.sql`)
2. **저장 위치**: `./db/init/` 폴더
3. **파일 내용 구성**:
   ```sql
   -- 기능 설명
   -- 실행 날짜: YYYY-MM-DD
   -- 목적: 상세한 목적 설명
   
   -- 실제 SQL 쿼리들
   -- 각 쿼리별로 주석 추가
   ```

4. **필수 기록 대상**:
   - 테이블 구조 변경 (ALTER TABLE)
   - 새 테이블 생성 (CREATE TABLE)
   - 인덱스 추가/삭제
   - 샘플 데이터 삽입
   - 데이터 마이그레이션

이렇게 하면 다른 개발자나 프로덕션 환경에서도 동일한 데이터베이스 상태를 재현할 수 있습니다.

## 🔒 보안 주의사항

⚠️ **중요**: 이 설정은 **개발 환경 전용**입니다!

프로덕션 환경에서는:
1. 강력한 비밀번호 사용
2. SSL 연결 필수
3. 네트워크 격리
4. 정기적인 백업
5. 감사 로깅 활성화

## 📝 환경 변수

`.env.local` 파일에 설정된 값들:

```env
DATABASE_URL=postgresql://app:secret@localhost:5432/guardianx_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=guardianx_dev
DB_USER=app
DB_PASSWORD=secret
DB_SSL=false
```

## 🐛 문제 해결

### 포트 충돌

```bash
# 5432 포트가 이미 사용 중인 경우
# docker-compose.yml에서 포트 변경
ports:
  - "5433:5432"  # 호스트 포트를 5433으로 변경

# .env.local도 업데이트
DB_PORT=5433
```

### 권한 문제

```bash
# data 디렉토리 권한 문제 시
sudo chown -R $(whoami) ./data
```

### 초기화 스크립트 재실행

```bash
# 데이터베이스 완전 재설정
docker-compose down -v
rm -rf data/
docker-compose up -d

# 특정 마이그레이션 스크립트 수동 실행
docker exec pg17 psql -U app -d guardianx_dev -f /docker-entrypoint-initdb.d/05_update_racks_schema.sql
docker exec pg17 psql -U app -d guardianx_dev -f /docker-entrypoint-initdb.d/06_insert_sample_ipam_data.sql

# 개발 중 실행한 쿼리들을 마이그레이션 파일로 저장
# 새로운 기능을 개발할 때마다 사용된 SQL 쿼리들을 ./db/init/ 폴더에 순서대로 저장합니다
```

### 연결 실패

```bash
# PostgreSQL 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs postgres

# 네트워크 확인
docker network ls
docker network inspect guardianx-network
```

## 📚 추가 자료

- [PostgreSQL 공식 문서](https://www.postgresql.org/docs/)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [pgAdmin 문서](https://www.pgadmin.org/docs/)

---

**주의**: `data/` 디렉토리는 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.