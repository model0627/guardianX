# CloudGuard IPAM

CloudGuard IPAM은 기업용 IP 주소 관리 시스템입니다. Next.js 15 기반의 풀스택 애플리케이션으로, 멀티테넌트 환경에서 IP 네트워크, 서브넷, 디바이스를 효율적으로 관리할 수 있습니다.

## 🚀 프로젝트 구조

```
guardianX/
├── app/
│   ├── api/                 # API Routes (백엔드)
│   │   ├── auth/           # 인증 (로그인, 로그아웃)
│   │   ├── health/         # 시스템 상태 확인
│   │   ├── tenants/        # 테넌트 관리
│   │   ├── user/           # 사용자 관리
│   │   └── docs/           # API 문서 자동 생성
│   ├── api-docs/           # 대화형 API 문서 페이지
│   ├── dashboard/          # IPAM 대시보드 (메인 앱)
│   ├── tenant-setup/       # 테넌트 생성/선택
│   ├── page.tsx            # 로그인 페이지
│   └── layout.tsx          # 글로벌 레이아웃
├── lib/
│   ├── auth.ts             # JWT/API키 인증 시스템
│   ├── database.ts         # PostgreSQL 연결 관리
│   └── swagger.ts          # API 문서 자동화
├── db/
│   ├── docker-compose.yml  # PostgreSQL 컨테이너 설정
│   ├── init/               # 데이터베이스 초기화 스크립트
│   └── reset_db.sh         # DB 리셋 스크립트
├── components/             # 재사용 가능한 UI 컴포넌트
├── hooks/                  # 커스텀 React 훅
└── middleware.ts           # 라우트 보호 및 인증
```

## 🛠 기술 스택

### 프론트엔드
- **Framework**: Next.js 15 (App Router) + React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Toast**: 커스텀 훅 기반 알림 시스템

### 백엔드
- **Runtime**: Node.js (Edge Runtime 호환)
- **Database**: PostgreSQL with Docker
- **Authentication**: JWT (jose) + API Keys (bcryptjs)
- **API Documentation**: next-swagger-doc (자동 생성)

### 인프라
- **Containerization**: Docker Compose (PostgreSQL)
- **Deployment**: Vercel Ready
- **Development**: Turbopack (빠른 빌드)

## 📋 주요 기능

### 🔐 인증 시스템
- ✅ 이중 인증 지원 (JWT + API Keys)
- ✅ 안전한 비밀번호 해싱 (bcrypt)
- ✅ 세션 관리 (HttpOnly 쿠키)
- ✅ 역할 기반 접근 제어

### 🏢 멀티테넌트 아키텍처
- ✅ 테넌트 생성 및 관리
- ✅ 사용자-테넌트 매핑
- ✅ 테넌트별 데이터 격리
- ✅ 역할 기반 권한 (Owner, Admin, Member)

### 📊 대시보드 & UI
- ✅ 반응형 사이드바 네비게이션
- ✅ 실시간 시스템 상태 모니터링 (API/DB)
- ✅ IPAM 전용 메뉴 구조
- ✅ 모바일 친화적 디자인
- ✅ Toast 알림 시스템

### 🌐 IPAM 기능 (개발 예정)
- 🔄 IP 네트워크 관리
- 🔄 서브넷 할당 및 추적
- 🔄 디바이스 등록 및 모니터링
- 🔄 네트워크 보안 감시
- 🔄 사용 현황 리포트

### 🛠 개발자 도구
- ✅ 자동 API 문서화 (Swagger)
- ✅ Database Health Check
- ✅ TypeScript 완전 지원
- ✅ 개발환경 Hot Reload

## 🚦 시작하기

### 1. 필수 조건
- Node.js 18+ 
- Docker & Docker Compose
- npm 또는 yarn

### 2. 데이터베이스 설정
```bash
# PostgreSQL 컨테이너 시작
cd db
docker-compose up -d

# 데이터베이스 상태 확인
docker-compose logs postgres
```

### 3. 환경 변수 설정
```bash
# .env.example을 복사하여 .env.local 생성
cp .env.example .env.local

# 필요한 환경 변수들은 이미 보안 키와 함께 설정됨
```

### 4. 개발 서버 실행
```bash
# 의존성 설치
npm install

# 개발 서버 시작 (Turbopack 사용)
npm run dev
```

### 5. 접속 URL
- **로그인 페이지**: http://localhost:3000
- **대시보드**: http://localhost:3000/dashboard (로그인 후)
- **API 문서**: http://localhost:3000/api-docs
- **시스템 상태**: http://localhost:3000/api/health

### 6. 기본 사용자 계정
데이터베이스 초기화 후 다음 계정으로 로그인할 수 있습니다:
- **이메일**: admin@guardianx.com
- **비밀번호**: password123

## 🔌 API 엔드포인트

### 인증
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | 사용자 로그인 | ❌ |
| POST | `/api/auth/logout` | 사용자 로그아웃 | ✅ |

### 시스템 상태
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | 전체 시스템 상태 | ❌ |
| GET | `/api/health/db` | 데이터베이스 상태만 | ❌ |

### 테넌트 관리
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/tenants` | 테넌트 목록 조회 | ✅ |
| POST | `/api/tenants` | 새 테넌트 생성 | ✅ |

### 사용자 관리
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/user/current-tenant` | 현재 사용자의 테넌트 정보 | ✅ |
| POST | `/api/user/current-tenant` | 활성 테넌트 변경 | ✅ |

### API 사용 예시

```bash
# 시스템 상태 확인
curl http://localhost:3000/api/health

# 로그인
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@guardianx.com", "password": "password123"}'

# 인증이 필요한 API (토큰 방식)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/user/current-tenant

# 인증이 필요한 API (API 키 방식)
curl -H "X-API-Key: gx_your_api_key" \
  http://localhost:3000/api/tenants
```

## 📚 API 문서화 가이드

새로운 API를 추가할 때는 다음 단계를 따라주세요:

### 1. API Route 생성
`app/api/[endpoint]/route.ts` 파일을 생성합니다.

### 2. Swagger 주석 추가
각 API 함수에 JSDoc 형태의 Swagger 주석을 추가합니다:

```typescript
/**
 * @swagger
 * /api/example:
 *   get:
 *     summary: API 요약 설명
 *     tags: [TagName]
 *     responses:
 *       200:
 *         description: 성공 응답 설명
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: string
 */
```

### 3. Schema 정의 (선택사항)
복잡한 데이터 구조는 `lib/swagger.ts`의 components.schemas에 추가합니다.

### 4. 자동 반영
API 문서는 자동으로 `/api-docs` 페이지에 반영됩니다.

## 🔧 데이터베이스 관리

### 데이터베이스 초기화
```bash
cd db
./reset_db.sh  # 데이터베이스 리셋 및 초기 데이터 생성
```

### 수동 SQL 실행
```bash
# 컨테이너 내부 접속
docker exec -it guardianx_postgres psql -U user -d guardianx_dev

# SQL 파일 실행
docker exec -i guardianx_postgres psql -U user -d guardianx_dev < init/01_create_tables.sql
```

### 백업 및 복원
```bash
# 백업
docker exec guardianx_postgres pg_dump -U user guardianx_dev > backup.sql

# 복원
docker exec -i guardianx_postgres psql -U user -d guardianx_dev < backup.sql
```

## 🚀 배포

### Vercel 배포
1. GitHub 리포지토리 연결
2. 환경 변수 설정 (DATABASE_URL, JWT_SECRET 등)
3. PostgreSQL 호스팅 서비스 연결 (예: Supabase, Neon)
4. 자동 빌드 및 배포

### 필수 환경 변수
```env
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.com
```

## 📖 개발 워크플로우

### 새 API 개발 프로세스

1. **API Route 파일 생성**
   - `app/api/[name]/route.ts` 생성
   - HTTP 메서드별 함수 구현

2. **Swagger 문서화**
   - JSDoc 주석으로 API 스펙 정의
   - 스키마가 복잡한 경우 `lib/swagger.ts`에 추가

3. **프론트엔드 연동**
   - `lib/api.ts`에 API 호출 함수 추가
   - 컴포넌트에서 API 사용

4. **테스트 및 검증**
   - API 문서에서 직접 테스트
   - 프론트엔드에서 정상 작동 확인

## 📝 컨벤션

### API Routes 네이밍
- 복수형 사용: `/users`, `/products`
- RESTful 패턴 준수
- 명확하고 직관적인 엔드포인트명

### Swagger 태그
- **Health**: 시스템 상태 확인
- **Auth**: 인증 및 세션 관리  
- **User**: 사용자 정보 및 프로필
- **Tenant**: 테넌트 관리 및 멀티테넌시
- **IPAM**: IP 네트워크 관리 (향후 추가)

## 🔍 시스템 모니터링

### 대시보드 상태 표시
- **API 상태**: 🟢 활성 | 🔴 비활성 | 🟡 확인 중
- **DB 상태**: 🟢 연결됨 | 🔴 연결 실패 | 🟡 확인 중
- **실시간 업데이트**: 페이지 로드 시 자동 상태 확인

### 활동 피드
- 새로운 서브넷 생성 알림
- 디바이스 등록 이벤트
- 보안 정책 변경 로그
- 시스템 이벤트 추적

## 🤝 기여 방법

1. **이슈 생성**: 새 기능이나 버그 리포트
2. **브랜치 생성**: `feature/기능명` 또는 `fix/버그명`
3. **개발 가이드라인**:
   - TypeScript 엄격 모드 준수
   - API 추가 시 Swagger 문서화 필수
   - 데이터베이스 변경 시 마이그레이션 스크립트 포함
4. **테스트**: 로컬에서 전체 플로우 테스트
5. **Pull Request**: 자세한 변경 내용 설명

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 사용합니다.

---

**프로젝트명**: CloudGuard IPAM  
**개발자**: Shawn  
**생성일**: 2025-08-13  
**마지막 업데이트**: 2025-01-08  
**버전**: v1.0.0-beta