# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (uses Turbopack for faster builds)
- **Build for production**: `npm run build`
- **Start production server**: `npm start`
- **Lint code**: `npm run lint`
- **Database management**: 
  - Start PostgreSQL: `cd db && docker-compose up -d`
  - Reset database: `cd db && ./reset_db.sh`
  - View database logs: `cd db && docker-compose logs postgres`

## Project Architecture

This is a full-stack Next.js 15 application with integrated frontend and backend using the App Router pattern. The architecture follows a multi-tenant design with role-based authentication.

### Core Structure
- **Frontend & Backend**: Unified Next.js application using App Router
- **Database**: PostgreSQL with connection pooling via `lib/database.ts`
- **Authentication**: Dual system supporting JWT tokens and API keys
- **Multi-tenant**: Tenant-based data isolation with join functionality
- **API Documentation**: Auto-generated Swagger docs at `/api-docs`

### Key Libraries
- **Database**: `pg` (PostgreSQL client)
- **Authentication**: `jose` (JWT), `bcryptjs` (password hashing), `jsonwebtoken`
- **UI**: React 19, Tailwind CSS v4, `lucide-react` icons
- **API Docs**: `next-swagger-doc`

### Authentication System
The app supports two authentication methods:
1. **JWT Tokens**: For web sessions (cookies/headers)
2. **API Keys**: For programmatic access (prefixed with `gx_`)

Both methods are handled by `lib/auth.ts` with middleware-based route protection in `middleware.ts`.

### Database Architecture
- **Connection**: Centralized pool management in `lib/database.ts`
- **Schema**: Multi-tenant with audit logging, user roles, API key management
- **Utilities**: Built-in pagination, transaction support, dynamic WHERE clauses
- **Setup**: Docker Compose setup in `db/` directory with init scripts

### Protected Routes
- `/dashboard`, `/profile`, `/admin` require authentication
- `/api/users`, `/api/admin` require authentication
- Admin-only routes: `/admin`, `/api/admin`
- Public routes: `/api-docs`, `/api/health`, `/api/auth/*`

### Multi-tenant Features
- Tenant creation and management via `/api/tenants`
- User-tenant relationships with join functionality
- Tenant-scoped data access patterns
- Current tenant context via `/api/user/current-tenant`

### API Patterns
- RESTful design with consistent error handling
- Swagger documentation with JSDoc comments
- Health check endpoints: `/api/health` (full system), `/api/health/db` (database only)
- Pagination support via query parameters
- Role-based access control on all protected endpoints

### Database Environment Variables
```env
DATABASE_URL=postgresql://user:password@localhost:5432/guardianx_dev
# OR individual settings:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=guardianx_dev
DB_USER=username
DB_PASSWORD=password
DB_SSL=false  # true for production
```

### Security Features
- Password strength validation
- Rate limiting preparation (IP extraction utilities)
- CORS configuration in middleware
- Security headers (CSP, X-Frame-Options, etc.)
- API key hashing and rotation support

### Dashboard Features
- **Responsive Sidebar Navigation**: IPAM-focused menu with collapsible mobile support
- **System Status Monitoring**: Real-time API and Database health indicators
- **Multi-tenant Context**: Sidebar displays current tenant information and user role
- **IPAM-Specific Menu Items**:
  - Dashboard (overview with statistics)
  - IP Networks management
  - Subnet administration
  - Device registry
  - Network monitoring
  - Security oversight
  - User management
  - Reporting tools
  - IP database
  - System settings

### UI/UX Features
- **Toast Notifications**: Success/error feedback for user actions
- **Status Indicators**: Color-coded system health (green=active, red=inactive, yellow=checking)
- **CloudGuard IPAM Branding**: Consistent orange theme throughout
- **Mobile-Friendly**: Responsive design with hamburger menu for mobile devices
- **Activity Feed**: Real-time display of recent system activities and changes

## Development Workflow

1. **Database Setup**: Run `cd db && docker-compose up -d` to start PostgreSQL
2. **Environment**: Copy `.env.example` to `.env.local` and configure
3. **Development**: Run `npm run dev` to start with Turbopack
4. **API Testing**: Visit `/api-docs` for interactive Swagger interface
5. **Database Management**: Use provided scripts in `db/` directory

## Code Conventions

- TypeScript strict mode enabled
- Path aliasing: `@/*` maps to project root
- Database queries use parameterized statements ($1, $2, etc.)
- API routes follow RESTful patterns with proper HTTP status codes
- All database operations include error handling and logging
- Authentication middleware runs on all requests except public routes

## Server-Side Cron Job Implementation Guide

본 프로젝트에서 검증된 크론탭(cron job) 구현 패턴을 따라 새로운 스케줄된 작업을 구현할 때 사용하세요.

### 📁 파일 구조
```
lib/
├── cron-scheduler.ts         # 크론 스케줄러 메인 로직
├── startup.ts               # 서버 초기화 관리
app/api/
├── init/route.ts           # 서버 초기화 API 엔드포인트
└── your-feature/
    └── route.ts            # 수동 실행용 API (선택사항)
```

### 🔧 구현 단계

#### 1. 크론 스케줄러 파일 생성 (`lib/your-cron-scheduler.ts`)
```typescript
import cron from 'node-cron';
import { query } from '@/lib/database';

let schedulerTask: cron.ScheduledTask | null = null;

// 전역 중복 실행 방지를 위한 변수
declare global {
  var __YOUR_FEATURE_SCHEDULER_RUNNING__: boolean | undefined;
}

export function startYourFeatureScheduler() {
  // 전역 상태 확인으로 중복 실행 방지
  if (global.__YOUR_FEATURE_SCHEDULER_RUNNING__) {
    console.log('[Your Feature] Global scheduler already running, skipping');
    return;
  }

  if (schedulerTask) {
    console.log('[Your Feature] Local scheduler already running, stopping previous task');
    schedulerTask.stop();
    schedulerTask.destroy();
    schedulerTask = null;
  }

  console.log('[Your Feature] Starting scheduler - will run every X minutes');
  global.__YOUR_FEATURE_SCHEDULER_RUNNING__ = true;
  
  // 크론 표현식: */5 * * * * (5분마다), 0 0 * * * (매일 자정), 등
  schedulerTask = cron.schedule('*/5 * * * *', async () => {
    await runYourFeatureTask();
  }, {
    scheduled: true,
    timezone: "Asia/Seoul"
  });

  console.log('[Your Feature] Scheduler started successfully');
}

export function stopYourFeatureScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask.destroy();
    schedulerTask = null;
    console.log('[Your Feature] Scheduler stopped');
  }
  global.__YOUR_FEATURE_SCHEDULER_RUNNING__ = false;
}

async function runYourFeatureTask() {
  try {
    console.log('[Your Feature] Running scheduled task at', new Date().toISOString());
    
    // 작업 로직 구현
    // 예: 데이터베이스 정리, 외부 API 호출, 리포트 생성 등
    
    console.log('[Your Feature] Task completed successfully');
  } catch (error) {
    console.error('[Your Feature] Task failed:', error);
  }
}
```

#### 2. 서버 초기화에 추가 (`lib/startup.ts`)
```typescript
import { startYourFeatureScheduler } from './your-cron-scheduler';

export function initializeServer() {
  if (isInitialized) {
    console.log('[Startup] Server already initialized');
    return;
  }

  console.log('[Startup] Initializing server...');
  
  try {
    // 기존 스케줄러들
    startServerAutoSync();
    
    // 새로운 스케줄러 추가
    startYourFeatureScheduler();
    
    isInitialized = true;
    console.log('[Startup] Server initialization completed successfully');
  } catch (error) {
    console.error('[Startup] Error during server initialization:', error);
  }
}
```

#### 3. 데이터베이스 스키마 추가 (선택사항)
작업 히스토리를 추적하려면:
```sql
-- db/sql/XX_your_feature_history.sql
CREATE TABLE your_feature_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  execution_type VARCHAR(20) NOT NULL DEFAULT 'auto' CHECK (execution_type IN ('manual', 'auto')),
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_your_feature_history_started_at ON your_feature_history(started_at DESC);
```

#### 4. 수동 실행 API 엔드포인트 (선택사항)
```typescript
// app/api/your-feature/manual-run/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 수동 작업 실행
    await performYourFeatureTask('manual', user.userId);

    return NextResponse.json({
      success: true,
      message: '작업이 성공적으로 실행되었습니다.'
    });
  } catch (error) {
    console.error('Manual task error:', error);
    return NextResponse.json(
      { error: '작업 실행 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
```

### 🛡️ 중요한 베스트 프랙티스

#### 1. 중복 실행 방지
- **전역 변수 사용**: `global.__YOUR_FEATURE_SCHEDULER_RUNNING__`
- **로컬 체크**: `schedulerTask` 변수로 이중 체크
- **서버 재시작 시 정리**: 기존 스케줄러 정리 후 새로 시작

#### 2. 에러 처리
```typescript
async function runYourFeatureTask() {
  try {
    // 히스토리 레코드 생성
    const historyId = await createTaskHistory();
    
    try {
      // 실제 작업 수행
      const result = await performTask();
      
      // 성공 시 히스토리 업데이트
      await updateTaskHistory(historyId, 'completed', result);
    } catch (taskError) {
      // 실패 시 히스토리 업데이트
      await updateTaskHistory(historyId, 'failed', null, taskError.message);
      throw taskError;
    }
  } catch (error) {
    console.error('[Your Feature] Task failed:', error);
  }
}
```

#### 3. 로깅 및 모니터링
- 시작/종료 시간 로그
- 처리된 레코드 수
- 에러 메시지와 스택 트레이스
- 성능 지표 (소요 시간)

#### 4. 크론 표현식 가이드
```typescript
// 매분 실행
'* * * * *'

// 5분마다 실행  
'*/5 * * * *'

// 매시간 정각 실행
'0 * * * *'

// 매일 오전 9시 실행
'0 9 * * *'

// 매주 월요일 오전 9시 실행
'0 9 * * 1'

// 매월 1일 오전 9시 실행
'0 9 1 * *'
```

### 📋 체크리스트

구현 시 다음 사항들을 확인하세요:

- [ ] 전역 중복 실행 방지 로직 구현
- [ ] 적절한 크론 표현식 설정
- [ ] 에러 처리 및 로깅 구현
- [ ] 데이터베이스 트랜잭션 사용 (필요시)
- [ ] 히스토리 테이블 및 추적 로직 (필요시)
- [ ] 서버 초기화에 스케줄러 등록
- [ ] 수동 실행 API 구현 (필요시)
- [ ] 타임존 설정 (`Asia/Seoul`)
- [ ] 적절한 로그 레벨 및 메시지

### 🔍 디버깅 및 테스트

#### 테스트용 단축 스케줄 설정
```typescript
// 개발 중에는 1분마다 실행하여 테스트
const isDevelopment = process.env.NODE_ENV === 'development';
const cronExpression = isDevelopment ? '*/1 * * * *' : '*/5 * * * *';
```

#### 서버 재시작
스케줄러 변경 사항 적용을 위해:
1. 개발 서버 중지 (Ctrl+C)
2. `npm run dev`로 재시작
3. `/api/init` 호출하여 스케줄러 초기화 확인

이 가이드를 따르면 안정적이고 확장 가능한 크론탭 시스템을 구현할 수 있습니다.