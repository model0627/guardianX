# 개발 워크플로우 가이드

GuardianX 프로젝트의 개발 프로세스와 베스트 프랙티스를 정리한 문서입니다.

## 📋 목차

1. [프로젝트 설정](#프로젝트-설정)
2. [개발 프로세스](#개발-프로세스)
3. [API 개발 워크플로우](#api-개발-워크플로우)
4. [코드 품질 관리](#코드-품질-관리)
5. [배포 프로세스](#배포-프로세스)
6. [문제 해결](#문제-해결)

## 프로젝트 설정

### 초기 설정

```bash
# 프로젝트 클론 후
cd guardianX
npm install
npm run dev
```

### 개발 환경 확인

```bash
# 개발 서버 실행
npm run dev

# 접속 확인
# - 메인 페이지: http://localhost:3000
# - API 문서: http://localhost:3000/api-docs
# - Health Check: http://localhost:3000/api/health
```

### 환경 변수 설정

필요한 환경 변수가 있다면 `.env.local` 파일에 추가:

```env
# 개발 환경용 설정
NEXT_PUBLIC_APP_NAME=GuardianX
NEXT_PUBLIC_APP_VERSION=1.0.0

# API 관련 설정 (필요시)
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
```

## 개발 프로세스

### 브랜치 전략

```
main (또는 master)
├── develop
├── feature/user-management
├── feature/product-catalog
├── hotfix/critical-bug-fix
└── release/v1.1.0
```

### 커밋 메시지 컨벤션

```bash
# 타입: 간단한 설명

feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅, 세미콜론 누락 등
refactor: 코드 리팩토링
test: 테스트 추가
chore: 빌드 업무, 패키지 매니저 설정 등

# 예시
feat: 사용자 등록 API 추가
fix: 로그인 시 토큰 검증 오류 수정
docs: API 문서화 가이드 추가
```

### Pull Request 템플릿

```markdown
## 변경 사항
- [ ] 새로운 기능 추가
- [ ] 기존 기능 수정
- [ ] 버그 수정
- [ ] 문서 업데이트
- [ ] 리팩토링

## 설명
이 PR의 목적과 변경사항을 간단히 설명해주세요.

## 테스트
- [ ] 로컬에서 정상 동작 확인
- [ ] API 문서 업데이트 완료
- [ ] 기존 기능에 영향 없음 확인

## 스크린샷 (UI 변경 시)
변경된 UI가 있다면 스크린샷을 첨부해주세요.

## 추가 정보
리뷰어가 알아야 할 추가 정보가 있다면 작성해주세요.
```

## API 개발 워크플로우

### 1. 요구사항 분석

```markdown
## API 요구사항 체크리스트

### 기능 정의
- [ ] API의 목적과 기능 명확화
- [ ] 입력/출력 데이터 구조 정의
- [ ] 비즈니스 로직 요구사항 정리

### 기술 고려사항
- [ ] 데이터베이스 스키마 설계 (필요시)
- [ ] 인증/권한 요구사항
- [ ] 성능 요구사항
- [ ] 보안 고려사항
```

### 2. API 설계

```bash
# 1. API 경로 설계
GET    /api/users          # 사용자 목록 조회
POST   /api/users          # 새 사용자 생성
GET    /api/users/{id}     # 특정 사용자 조회
PUT    /api/users/{id}     # 사용자 정보 수정
DELETE /api/users/{id}     # 사용자 삭제

# 2. RESTful 원칙 준수 확인
# - 명사 사용 (동사 금지)
# - 복수형 사용
# - 일관된 네이밍 컨벤션
# - 적절한 HTTP 메서드 사용
```

### 3. 구현 단계

#### 3-1. API Route 생성

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // 비즈니스 로직 구현
    const users = await getUsersFromDatabase();
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 입력 검증
    const validationResult = validateUserInput(body);
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: validationResult.message },
        { status: 400 }
      );
    }
    
    // 비즈니스 로직
    const newUser = await createUser(body);
    
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 3-2. Swagger 문서화

```typescript
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 사용자 목록 조회
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *     responses:
 *       200:
 *         description: 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
```

#### 3-3. 프론트엔드 연동

```typescript
// lib/api.ts에 API 함수 추가
export const api = {
  users: {
    getAll: (params?: { page?: number }) => 
      fetchAPI(`/users${params ? '?' + new URLSearchParams(params).toString() : ''}`),
    
    create: (data: CreateUserRequest) => 
      fetchAPI('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  }
};
```

#### 3-4. 타입 정의

```typescript
// lib/types.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  role?: 'user' | 'admin';
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 4. 테스트

#### 4-1. API 테스트

```bash
# Health Check
curl http://localhost:3000/api/health

# 사용자 목록 조회
curl http://localhost:3000/api/users

# 새 사용자 생성
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "테스트 사용자",
    "email": "test@example.com"
  }'

# Swagger UI에서 직접 테스트
# http://localhost:3000/api-docs
```

#### 4-2. 프론트엔드 통합 테스트

```typescript
// 컴포넌트에서 API 호출 테스트
const [users, setUsers] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchUsers = async () => {
    try {
      const response = await api.users.getAll();
      setUsers(response.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchUsers();
}, []);
```

## 코드 품질 관리

### ESLint 설정

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error"
  }
}
```

### 코드 포맷팅 (Prettier)

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### 코드 리뷰 체크리스트

```markdown
## 코드 리뷰 체크리스트

### API Route
- [ ] 적절한 HTTP 메서드 사용
- [ ] 입력 데이터 검증 구현
- [ ] 에러 핸들링 적절히 구현
- [ ] 보안 고려사항 반영
- [ ] Swagger 문서화 완료

### 코드 품질
- [ ] TypeScript 타입 정의 완료
- [ ] 함수/변수 네이밍 명확
- [ ] 불필요한 코드 제거
- [ ] 성능 고려사항 반영
- [ ] 로깅 적절히 구현

### 문서화
- [ ] API 문서 업데이트
- [ ] 코드 주석 적절히 작성
- [ ] README 업데이트 (필요시)
```

## 배포 프로세스

### Vercel 배포

#### 1. 자동 배포 설정

```json
// vercel.json (필요시)
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "@vercel/node"
    }
  }
}
```

#### 2. 환경 변수 설정

Vercel 대시보드에서 환경 변수 설정:

```env
# Production 환경 변수
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-domain.vercel.app/api
DATABASE_URL=your_production_database_url
JWT_SECRET=your_production_jwt_secret
```

#### 3. 배포 확인

```bash
# 배포 후 확인 사항
# 1. 메인 페이지 정상 로드
# 2. API 엔드포인트 정상 작동
# 3. API 문서 페이지 정상 표시
# 4. Health Check 통과
```

### CI/CD 파이프라인 (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linting
        run: npm run lint
        
      - name: Run type check
        run: npx tsc --noEmit
        
      - name: Build project
        run: npm run build
        
      - name: Deploy to Vercel
        uses: vercel/action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 문제 해결

### 자주 발생하는 문제들

#### 1. API Route가 404 오류

```typescript
// 해결방법: 파일 경로와 함수명 확인
// ❌ 잘못된 경우
export default function handler() { ... }

// ✅ 올바른 경우 (App Router)
export async function GET() { ... }
```

#### 2. CORS 오류

```typescript
// Next.js API Routes에서는 기본적으로 CORS가 해결됨
// 외부 API 호출 시에만 문제 발생 가능
```

#### 3. Swagger 문서가 업데이트 되지 않음

```bash
# 개발 서버 재시작
npm run dev

# 브라우저 캐시 클리어
# Ctrl+F5 또는 Cmd+Shift+R
```

#### 4. 타입 오류

```typescript
// TypeScript 타입 확인
npx tsc --noEmit

// API 응답 타입 정의 확인
interface ApiResponse<T = any> {
  data: T;
  error?: string;
}
```

### 디버깅 방법

#### 1. 로깅 활용

```typescript
// 개발 환경에서만 로깅
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}

// 에러 로깅은 항상 수행
console.error('Error occurred:', error);
```

#### 2. Network 탭 확인

```bash
# 브라우저 개발자 도구에서
# 1. Network 탭 열기
# 2. API 요청 확인
# 3. 요청/응답 데이터 검토
# 4. 상태 코드 확인
```

#### 3. API 테스트 도구 활용

```bash
# Postman
# - API 엔드포인트 직접 테스트
# - 다양한 시나리오 테스트

# Swagger UI
# - http://localhost:3000/api-docs
# - 인터랙티브 API 테스트
```

## 🎯 개발 베스트 프랙티스

1. **일관성**: 코딩 스타일과 네이밍 컨벤션 일관성 유지
2. **문서화**: 모든 API 변경 시 문서 동시 업데이트
3. **테스트**: 새 기능 개발 시 반드시 테스트 수행
4. **보안**: 입력 검증과 에러 핸들링 필수 구현
5. **성능**: 불필요한 API 호출 최소화
6. **협업**: PR 리뷰와 코드 품질 체크 필수

이 가이드를 따라 개발하면 일관되고 품질 높은 코드를 유지할 수 있습니다! 🚀