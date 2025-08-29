import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/database';

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 사용자 로그인
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@guardianx.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                 token:
 *                   type: string
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 입력 검증
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: '이메일과 비밀번호가 필요합니다.' 
        },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          success: false, 
          error: '올바른 이메일 형식이 아닙니다.' 
        },
        { status: 400 }
      );
    }

    // 사용자 조회
    const userResult = await query(
      'SELECT id, email, password_hash, name, role, is_active, email_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: '등록되지 않은 이메일입니다.' 
        },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    // 계정 상태 확인
    if (!user.is_active) {
      return NextResponse.json(
        { 
          success: false, 
          error: '비활성화된 계정입니다. 관리자에게 문의하세요.' 
        },
        { status: 401 }
      );
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: '비밀번호가 올바르지 않습니다.' 
        },
        { status: 401 }
      );
    }

    // JWT 토큰 생성
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET이 설정되지 않았습니다.');
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const token = (jwt as any).sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your-secret-key',
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
      }
    );

    // 마지막 로그인 시간 업데이트
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // 감사 로그 기록
    await query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        user.id,
        'user.login',
        'user',
        user.id,
        request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        '127.0.0.1',
        request.headers.get('user-agent') || 'Unknown'
      ]
    );

    // 응답 데이터 (비밀번호 제외)
    const responseUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.email_verified
    };

    // JWT 토큰을 HttpOnly 쿠키로 설정
    const response = NextResponse.json({
      success: true,
      message: '로그인이 완료되었습니다.',
      user: responseUser,
      token // 클라이언트에서 localStorage 저장용 (선택사항)
    });

    // HttpOnly 쿠키 설정
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: '로그인 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}