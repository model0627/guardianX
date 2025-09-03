import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// 인증이 필요한 경로들
const protectedPaths = [
  '/dashboard',
  '/ipam',
  '/soar',
  '/asset-audit',
  '/profile',
  '/admin',
  '/api/users',
  '/api/admin',
  '/api/profile',
  '/api/assessment-items',
  '/api/assessment-checklists',
  '/api/asset-assessments',
  '/api/proxy',
  '/api/api-connections'
];

// 관리자만 접근 가능한 경로들
const adminOnlyPaths = [
  '/admin',
  '/api/admin'
];

// 로그인한 사용자가 접근하면 안 되는 경로들 (로그인 페이지 등)
const authOnlyPaths = [
  '/login',
  '/register'
];

// Edge Runtime에서 사용할 간단한 JWT 검증 함수
async function verifyJWTSimple(request: NextRequest): Promise<any | null> {
  try {
    // Authorization 헤더에서 토큰 가져오기
    const authHeader = request.headers.get('authorization');
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // 쿠키에서 토큰 확인
      token = request.cookies.get('token')?.value;
    }

    if (!token || !process.env.JWT_SECRET) {
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string
    };
  } catch (error) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API 문서는 항상 허용
  if (pathname.startsWith('/api-docs')) {
    return NextResponse.next();
  }

  // Health check는 항상 허용
  if (pathname === '/api/health') {
    return NextResponse.next();
  }

  // 인증 API는 별도 처리하지 않음
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // 현재 사용자 정보 가져오기 (Edge Runtime 호환)
  const user = await verifyJWTSimple(request);
  const isAuthenticated = !!user;
  
  // Debug logging for proxy requests
  if (pathname.startsWith('/api/proxy')) {
    console.log(`[Middleware] Proxy request to ${pathname}`);
    console.log(`[Middleware] Authentication: ${isAuthenticated ? 'Success' : 'Failed'}`);
    console.log(`[Middleware] User: ${user?.email || 'None'}`);
  }

  // 1. 인증이 필요한 경로 체크
  const needsAuth = protectedPaths.some(path => pathname.startsWith(path));
  if (needsAuth && !isAuthenticated) {
    // 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. 관리자 전용 경로 체크
  const needsAdmin = adminOnlyPaths.some(path => pathname.startsWith(path));
  if (needsAdmin && (!isAuthenticated || user.role !== 'admin')) {
    return NextResponse.json(
      { error: '관리자 권한이 필요합니다.' },
      { status: 403 }
    );
  }

  // 3. 로그인한 사용자가 접근하면 안 되는 경로 체크
  const isAuthOnlyPath = authOnlyPaths.some(path => pathname.startsWith(path));
  if (isAuthOnlyPath && isAuthenticated) {
    // 이미 로그인한 사용자는 대시보드로 리다이렉트
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 4. CORS 헤더 추가 (API 요청용)
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    
    // CORS 헤더 설정
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    // Preflight 요청 처리
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers });
    }

    return response;
  }

  // 5. 보안 헤더 추가
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self';"
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ]
};