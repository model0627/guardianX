import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { query } from './database';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
}

/**
 * JWT 토큰에서 사용자 정보 추출
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET이 설정되지 않았습니다.');
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
      tenantId: payload.tenantId as string | undefined
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * NextRequest에서 인증 토큰 추출
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  // 1. Authorization 헤더에서 Bearer 토큰 확인
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. 쿠키에서 토큰 확인
  const cookieToken = request.cookies.get('token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * 인증된 사용자의 현재 테넌트 정보를 가져오는 함수
 */
export async function getUserWithTenant(userId: string): Promise<AuthUser | null> {
  try {
    const result = await query(
      `SELECT 
        u.id,
        u.email,
        u.role,
        u.current_tenant_id
      FROM users u
      WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.current_tenant_id
    };
  } catch (error) {
    console.error('Error fetching user with tenant:', error);
    return null;
  }
}

/**
 * NextRequest에서 API 키 추출
 */
export function getApiKeyFromRequest(request: NextRequest): string | null {
  // 1. X-API-Key 헤더에서 확인
  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // 2. Authorization 헤더에서 ApiKey 스키마 확인
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('ApiKey ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * API 키로 사용자 인증
 */
export async function verifyApiKey(apiKey: string): Promise<AuthUser | null> {
  try {
    // API 키는 Node.js runtime에서만 검증 (bcrypt 사용)
    const bcrypt = require('bcryptjs');
    const { query } = require('@/lib/database');

    // API 키 형식 확인 (gx_로 시작)
    if (!apiKey.startsWith('gx_')) {
      return null;
    }

    // 데이터베이스에서 활성 API 키들 조회
    const apiKeyResult = await query(`
      SELECT ak.id, ak.user_id, ak.key_hash, ak.permissions,
             u.email, u.name, u.role, u.is_active
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      WHERE ak.is_active = true AND u.is_active = true
    `);

    // 해시 비교를 통해 올바른 API 키 찾기
    for (const row of apiKeyResult.rows) {
      const isMatch = await bcrypt.compare(apiKey, row.key_hash);
      if (isMatch) {
        // 마지막 사용 시간 업데이트
        await query(`
          UPDATE api_keys SET last_used = NOW() WHERE id = $1
        `, [row.id]);

        return {
          userId: row.user_id,
          email: row.email,
          role: row.role
        };
      }
    }

    return null;
  } catch (error) {
    console.error('API key verification failed:', error);
    return null;
  }
}

/**
 * Middleware에서 사용할 JWT 전용 인증 (Edge Runtime 호환)
 */
export async function getAuthUserFromJWT(request: NextRequest): Promise<AuthUser | null> {
  const token = getTokenFromRequest(request);
  if (!token) {
    return null;
  }

  return await verifyToken(token);
}

/**
 * API 라우트에서 사용할 전체 인증 (JWT 토큰 또는 API 키)
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  // 1. API 키 인증 시도
  const apiKey = getApiKeyFromRequest(request);
  if (apiKey) {
    try {
      const apiKeyUser = await verifyApiKey(apiKey);
      if (apiKeyUser) {
        return apiKeyUser;
      }
    } catch (error) {
      console.error('API key verification error:', error);
    }
  }

  // 2. JWT 토큰 인증 시도
  const token = getTokenFromRequest(request);
  if (!token) {
    return null;
  }

  return await verifyToken(token);
}

/**
 * 역할 기반 권한 확인
 */
export function hasRole(user: AuthUser, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.role);
}

/**
 * 관리자 권한 확인
 */
export function isAdmin(user: AuthUser): boolean {
  return user.role === 'admin';
}

/**
 * 모더레이터 이상 권한 확인
 */
export function isModerator(user: AuthUser): boolean {
  return ['admin', 'moderator'].includes(user.role);
}

/**
 * 사용자 본인 또는 관리자 권한 확인
 */
export function canAccessUser(requestUser: AuthUser, targetUserId: string): boolean {
  return requestUser.userId === targetUserId || isAdmin(requestUser);
}

/**
 * JWT 토큰 생성 (Node.js runtime에서만 사용)
 * Edge runtime에서는 사용하지 않음
 */
export function createToken(payload: AuthUser): string {
  // 이 함수는 API 라우트에서만 사용되므로 기존 코드 유지
  const jwt = require('jsonwebtoken');
  
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET이 설정되지 않았습니다.');
  }

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
    }
  );
}

/**
 * 비밀번호 강도 검증
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('비밀번호는 최소 8자 이상이어야 합니다.');
  }

  if (password.length > 128) {
    errors.push('비밀번호는 최대 128자를 초과할 수 없습니다.');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('소문자를 포함해야 합니다.');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('대문자를 포함해야 합니다.');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('숫자를 포함해야 합니다.');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('특수문자를 포함해야 합니다.');
  }

  // 연속된 문자 확인
  if (/(.)\1{2,}/.test(password)) {
    errors.push('동일한 문자를 3번 이상 연속 사용할 수 없습니다.');
  }

  // 순차적인 문자 확인
  if (/123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
    errors.push('순차적인 문자나 숫자를 사용할 수 없습니다.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 이메일 형식 검증
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 사용자 이름 검증
 */
export function validateName(name: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!name || name.trim().length === 0) {
    errors.push('이름은 필수입니다.');
  }

  if (name.length < 2) {
    errors.push('이름은 최소 2자 이상이어야 합니다.');
  }

  if (name.length > 50) {
    errors.push('이름은 최대 50자를 초과할 수 없습니다.');
  }

  // 특수문자 확인 (기본적인 것만 허용)
  if (!/^[a-zA-Z가-힣\s\-'\.]+$/.test(name)) {
    errors.push('이름에 허용되지 않는 문자가 포함되어 있습니다.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 레이트 리미팅을 위한 IP 추출
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return '127.0.0.1';
}

/**
 * User-Agent 추출
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'Unknown';
}