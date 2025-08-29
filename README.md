# GuardianX - 통합 보안 관리 플랫폼

GuardianX는 IPAM(IP 주소 관리), SOAR(보안 오케스트레이션), 자산 점검 기능을 통합한 기업용 보안 관리 플랫폼입니다. Next.js 15 기반의 풀스택 애플리케이션으로, 멀티테넌트 환경에서 네트워크 자산과 보안을 효율적으로 관리할 수 있습니다.

## 🚀 프로젝트 구조

```
guardianX/
├── app/
│   ├── api/                    # API Routes (백엔드)
│   │   ├── auth/              # 인증 (로그인, 로그아웃, 회원가입)
│   │   ├── health/            # 시스템 상태 확인 (API/DB)
│   │   ├── tenants/           # 테넌트 관리 및 멤버십
│   │   ├── user/              # 사용자 정보 및 현재 테넌트
│   │   ├── ipam/              # IPAM 관련 API
│   │   │   ├── offices/       # 사무실 관리
│   │   │   ├── server-rooms/  # 서버실 관리
│   │   │   ├── racks/         # 랙 관리
│   │   │   ├── ip-ranges/     # IP 대역 관리
│   │   │   ├── ip-addresses/  # IP 주소 관리
│   │   │   ├── devices/       # 디바이스 관리
│   │   │   ├── libraries/     # 라이브러리 관리
│   │   │   └── contacts/      # 담당자 관리
│   │   ├── soar/              # SOAR 보안 관련 API
│   │   │   ├── events/        # 위협 이벤트
│   │   │   ├── playbooks/     # 자동 대응
│   │   │   ├── incidents/     # 인시던트 관리
│   │   │   └── analytics/     # 보안 분석
│   │   ├── asset-audit/       # 자산 점검 관련 API
│   │   │   ├── assessment-items/     # 점검 항목 관리
│   │   │   ├── assessment-checklists/# 체크리스트 관리
│   │   │   ├── asset-assessments/    # 자산 점검 실행
│   │   │   └── assessment-results/   # 점검 결과
│   │   ├── api-connections/   # 외부 API 연결 관리
│   │   ├── sync/              # 데이터 동기화
│   │   ├── init/              # 서버 초기화 및 스케줄러
│   │   └── docs/              # API 문서 자동 생성
│   ├── api-docs/              # 대화형 API 문서 페이지
│   ├── dashboard/             # 메인 대시보드
│   │   └── layout.tsx         # 공통 사이드바 레이아웃 사용
│   ├── ipam/                  # IPAM 모듈
│   │   ├── layout.tsx         # 공통 사이드바 레이아웃 사용
│   │   ├── offices/           # 사무실 관리 페이지
│   │   ├── server-rooms/      # 서버실 관리 페이지
│   │   ├── racks/             # 랙 관리 페이지
│   │   ├── ip-ranges/         # IP 대역 관리 페이지
│   │   ├── ip-addresses/      # IP 주소 관리 페이지
│   │   ├── devices/           # 디바이스 관리 페이지
│   │   ├── libraries/         # 라이브러리 관리 페이지
│   │   └── contacts/          # 담당자 관리 페이지
│   ├── soar/                  # SOAR 보안 모듈
│   │   ├── events/            # 위협 이벤트 관리
│   │   ├── playbooks/         # 자동 대응 플레이북
│   │   ├── threat-intelligence/# 위협 인텔리전스
│   │   ├── incidents/         # 인시던트 관리
│   │   └── analytics/         # 보안 분석
│   ├── asset-audit/           # 자산 점검 모듈
│   │   ├── assessment-results/# 점검 결과 보기
│   │   ├── checklists/        # 체크리스트 관리
│   │   ├── schedules/         # 점검 일정 관리
│   │   └── reports/           # 보고서 생성
│   ├── api-connections/       # API 연결 관리 페이지
│   ├── tenant-setup/          # 테넌트 생성/선택
│   ├── tenants/               # 테넌트 관리 페이지
│   ├── page.tsx               # 로그인 페이지
│   └── layout.tsx             # 글로벌 레이아웃
├── components/                # 재사용 가능한 UI 컴포넌트
│   ├── Sidebar.tsx            # 공통 사이드바 컴포넌트
│   └── Toast.tsx              # 토스트 알림 컴포넌트
├── lib/
│   ├── auth.ts                # JWT/API키 이중 인증 시스템
│   ├── database.ts            # PostgreSQL 연결 풀 관리
│   ├── swagger.ts             # API 문서 자동화
│   ├── cron-scheduler.ts      # 서버 자동 동기화 스케줄러
│   └── startup.ts             # 서버 초기화 관리
├── hooks/
│   └── useToast.ts            # 토스트 알림 커스텀 훅
├── db/
│   ├── docker-compose.yml     # PostgreSQL 컨테이너 설정
│   ├── init/                  # 데이터베이스 초기화 스크립트 (20+ 파일)
│   ├── sql/                   # 추가 스키마 및 마이그레이션
│   └── reset_db.sh            # DB 리셋 스크립트
├── docs/                      # 프로젝트 문서
└── middleware.ts              # 라우트 보호, 인증, CORS
```

## 🛠 기술 스택

### 프론트엔드
- **Framework**: Next.js 15 (App Router) + React 19
- **Language**: TypeScript (엄격 모드)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React (1000+ 아이콘)
- **State Management**: React Hooks + Context API
- **Toast Notifications**: 커스텀 훅 기반 알림 시스템

### 백엔드
- **Runtime**: Node.js (Edge Runtime 호환)
- **Database**: PostgreSQL 15 with Docker
- **Authentication**: 이중 인증 (JWT + API Keys)
- **ORM**: Raw SQL with Connection Pooling
- **API Documentation**: next-swagger-doc (자동 생성)
- **Scheduling**: node-cron (자동 동기화)

### 인프라
- **Containerization**: Docker Compose (PostgreSQL)
- **Deployment**: Vercel Ready
- **Development**: Turbopack (빠른 빌드)
- **Security**: CORS, CSP, XSS Protection

## 📋 주요 기능

### 🔐 통합 인증 시스템
- ✅ 이중 인증 지원 (JWT + API Keys)
- ✅ 안전한 비밀번호 해싱 (bcryptjs)
- ✅ 세션 관리 (HttpOnly 쿠키)
- ✅ 역할 기반 접근 제어 (Owner, Admin, Member)
- ✅ 미들웨어 기반 라우트 보호

### 🏢 멀티테넌트 아키텍처
- ✅ 테넌트 생성 및 관리
- ✅ 사용자-테넌트 매핑 및 역할 관리
- ✅ 완전한 테넌트별 데이터 격리
- ✅ 테넌트 전환 기능
- ✅ 24개 테이블에 걸친 테넌트 ID 적용

### 📊 통합 대시보드 & UI
- ✅ 공통 사이드바 컴포넌트 (코드 중복 제거)
- ✅ 반응형 모바일 친화적 디자인
- ✅ 실시간 시스템 상태 모니터링 (API/DB)
- ✅ 계층적 메뉴 구조 (IPAM, SOAR, 자산점검)
- ✅ 토스트 알림 시스템
- ✅ 테넌트 관리 드롭다운

### 🌐 IPAM (IP 주소 관리) 모듈
- ✅ **사무실 관리**: 물리적 위치 및 연락처 정보
- ✅ **서버실 관리**: 환경 정보 및 용량 관리  
- ✅ **랙 관리**: 물리적 서버 랙 배치
- ✅ **IP 대역 관리**: CIDR 기반 네트워크 관리
- ✅ **IP 주소 관리**: 개별 IP 할당 및 추적
- ✅ **디바이스 관리**: 서버, 스위치, 라우터 등
- ✅ **라이브러리 관리**: 외부 데이터 소스 연동
- ✅ **담당자 관리**: 디바이스별 책임자 할당

### 🛡️ SOAR (보안 오케스트레이션) 모듈
- ✅ **위협 이벤트**: 보안 이벤트 탐지 및 분석
- ✅ **자동 대응**: 플레이북 기반 자동화
- ✅ **위협 인텔리전스**: 외부 위협 정보 연동
- ✅ **인시던트 관리**: 보안 사고 대응 워크플로우
- ✅ **보안 분석**: 위험도 평가 및 트렌드 분석

### 🔍 자산 점검 모듈
- ✅ **점검 항목 관리**: 보안 체크리스트 표준화
- ✅ **체크리스트 관리**: 자산별 맞춤 점검 목록
- ✅ **자산 점검 실행**: 자동화된 점검 프로세스
- ✅ **점검 결과**: 상세 결과 및 리포트
- ✅ **점검 일정**: 주기적 점검 스케줄링

### 🔗 API 연결 및 동기화
- ✅ **외부 API 연결**: 써드파티 시스템 통합
- ✅ **자동 동기화**: 크론 기반 스케줄러
- ✅ **필드 매핑**: 유연한 데이터 변환
- ✅ **동기화 히스토리**: 상세한 실행 로그
- ✅ **에러 처리**: 안정적인 동기화 관리

### 🛠 개발자 도구
- ✅ 자동 API 문서화 (Swagger UI)
- ✅ 실시간 시스템 Health Check
- ✅ TypeScript 완전 지원
- ✅ 서버 자동 초기화
- ✅ 개발환경 Hot Reload

## 🚦 시작하기

### 1. 필수 조건
- Node.js 18+ 
- Docker & Docker Compose
- npm 또는 yarn

### 2. 프로젝트 클론 및 설치
```bash
git clone https://github.com/your-username/guardianX.git
cd guardianX

# 의존성 설치
npm install
```

### 3. 데이터베이스 설정
```bash
# PostgreSQL 컨테이너 시작
cd db
docker-compose up -d

# 데이터베이스 상태 확인
docker-compose logs postgres

# 데이터베이스 초기화 (필요시)
./reset_db.sh
```

### 4. 환경 변수 설정
```bash
# .env.example을 복사하여 .env.local 생성
cp .env.example .env.local

# 필요한 환경 변수들은 이미 보안 키와 함께 설정됨
# DATABASE_URL, JWT_SECRET 등이 자동 설정됨
```

### 5. 개발 서버 실행
```bash
# 개발 서버 시작 (Turbopack 사용)
npm run dev

# 또는 일반 빌드
npm run build && npm start
```

### 6. 접속 URL
- **로그인 페이지**: http://localhost:3000
- **메인 대시보드**: http://localhost:3000/dashboard
- **IPAM 모듈**: http://localhost:3000/ipam
- **SOAR 모듈**: http://localhost:3000/soar
- **자산 점검**: http://localhost:3000/asset-audit
- **테넌트 설정**: http://localhost:3000/tenant-setup
- **API 문서**: http://localhost:3000/api-docs
- **시스템 상태**: http://localhost:3000/api/health

### 7. 기본 사용자 계정
데이터베이스 초기화 후 다음 계정으로 로그인:
- **이메일**: shawn@gmail.com
- **비밀번호**: password123
- **역할**: Owner (전체 권한)

## 🔌 주요 API 엔드포인트

### 인증 & 사용자 관리
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | 사용자 로그인 | ❌ |
| POST | `/api/auth/logout` | 사용자 로그아웃 | ✅ |
| POST | `/api/auth/register` | 회원가입 | ❌ |
| GET | `/api/user/current-tenant` | 현재 테넌트 정보 | ✅ |

### 시스템 상태
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | 전체 시스템 상태 (API + DB) | ❌ |
| GET | `/api/health/db` | 데이터베이스 상태만 | ❌ |
| POST | `/api/init` | 서버 스케줄러 초기화 | ✅ |

### 테넌트 관리
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/tenants` | 테넌트 목록 조회 | ✅ |
| POST | `/api/tenants` | 새 테넌트 생성 | ✅ |
| POST | `/api/tenants/{id}/switch` | 테넌트 전환 | ✅ |

### IPAM 관리
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/ipam/offices` | 사무실 목록 | ✅ |
| GET | `/api/ipam/devices` | 디바이스 목록 | ✅ |
| GET | `/api/ipam/ip-addresses` | IP 주소 목록 | ✅ |
| POST | `/api/ipam/*` | 리소스 생성 | ✅ |
| PUT | `/api/ipam/*` | 리소스 수정 | ✅ |
| DELETE | `/api/ipam/*` | 리소스 삭제 | ✅ |

### 자산 점검
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/assessment-items` | 점검 항목 목록 | ✅ |
| GET | `/api/assessment-checklists` | 체크리스트 목록 | ✅ |
| POST | `/api/asset-assessments` | 점검 실행 | ✅ |
| GET | `/api/asset-assessments` | 점검 결과 조회 | ✅ |

### API 연결 및 동기화
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/api-connections` | API 연결 목록 | ✅ |
| POST | `/api/sync/devices` | 디바이스 동기화 실행 | ✅ |
| PUT | `/api/api-connections/{id}/toggle-auto-sync` | 자동 동기화 토글 | ✅ |

## 📚 데이터베이스 스키마

### 핵심 테이블 구조
- **users**: 사용자 계정 정보
- **tenants**: 테넌트 정보
- **tenant_memberships**: 사용자-테넌트 매핑
- **api_keys**: API 키 관리

### IPAM 테이블들 (8개)
- **offices**: 사무실 정보
- **server_rooms**: 서버실 정보  
- **racks**: 랙 정보
- **ip_ranges**: IP 대역 정보
- **ip_addresses**: 개별 IP 주소
- **devices**: 네트워크 디바이스
- **libraries**: 외부 라이브러리 연동
- **contacts**: 담당자 정보

### 자산 점검 테이블들 (6개)
- **assessment_items**: 점검 항목
- **assessment_checklists**: 체크리스트
- **asset_assessments**: 점검 실행 정보
- **asset_assessment_results**: 점검 결과
- **checklist_items**: 체크리스트-항목 매핑

### API 연결 테이블들 (3개)
- **api_connections**: 외부 API 연결 정보
- **sync_history**: 동기화 실행 히스토리
- **google_oauth_accounts**: Google OAuth 연동

## 🔧 고급 기능

### 자동 동기화 시스템
```typescript
// 크론탭 기반 자동 스케줄러
// lib/cron-scheduler.ts에서 구현
// - 5분마다 자동 동기화
// - 실패 시 재시도 로직
// - 상세한 실행 로그
```

### 멀티테넌트 데이터 격리
```sql
-- 모든 쿼리에 테넌트 ID 필터링 자동 적용
SELECT * FROM devices WHERE tenant_id = $1 AND status = 'active';
```

### API 키 기반 접근
```bash
# JWT 토큰 또는 API 키 모두 지원
curl -H "Authorization: Bearer JWT_TOKEN" /api/devices
curl -H "X-API-Key: gx_api_key" /api/devices
```

## 🚀 배포

### Vercel 배포 (추천)
1. GitHub 리포지토리 연결
2. 환경 변수 설정
3. PostgreSQL 호스팅 서비스 연결 (Supabase/Neon)
4. 자동 빌드 및 배포

### 필수 환경 변수
```env
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.com
```

### Docker 배포
```bash
# PostgreSQL 및 애플리케이션 통합 실행
docker-compose up -d
```

## 🤝 기여 가이드

### 개발 워크플로우
1. **이슈 생성**: 새 기능이나 버그 리포트
2. **브랜치 생성**: `feature/기능명` 또는 `fix/버그명`
3. **개발 규칙**:
   - TypeScript 엄격 모드 준수
   - 모든 API는 Swagger 문서화 필수
   - 멀티테넌트 데이터 격리 준수
   - 공통 컴포넌트 우선 사용
4. **테스트**: 전체 플로우 검증
5. **Pull Request**: 상세한 변경 내용 기술

### 코딩 컨벤션
- **API Routes**: RESTful 네이밍, 복수형 사용
- **컴포넌트**: PascalCase, Props 타입 정의
- **데이터베이스**: snake_case, 테넌트 ID 필수
- **에러 처리**: try-catch 블록 및 의미있는 에러 메시지

## 📈 로드맵

### Phase 1: 핵심 기능 (완료 ✅)
- ✅ 멀티테넌트 아키텍처
- ✅ IPAM 기본 기능
- ✅ 자산 점검 시스템
- ✅ API 연결 및 동기화

### Phase 2: 고도화 (진행 중 🚧)
- 🚧 SOAR 보안 기능 확장
- 🚧 고급 리포팅 기능
- 🚧 알림 및 대시보드 개선
- 🚧 모바일 앱 지원

### Phase 3: 엔터프라이즈 (계획 📋)
- 📋 SSO 통합 (SAML, OIDC)
- 📋 감사 로그 및 컴플라이언스
- 📋 고성능 대용량 처리
- 📋 클라우드 네이티브 배포

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 사용합니다.

---

**프로젝트명**: GuardianX - 통합 보안 관리 플랫폼  
**개발자**: Shawn  
**생성일**: 2025-08-13  
**마지막 업데이트**: 2025-01-08  
**버전**: v2.0.0-beta  
**기술 스택**: Next.js 15, TypeScript, PostgreSQL, Docker