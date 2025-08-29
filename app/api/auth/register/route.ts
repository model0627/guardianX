import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, transaction } from '@/lib/database';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 새 사용자 회원가입
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "홍길동"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "hong@example.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "password123"
 *               confirmPassword:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       201:
 *         description: 회원가입 성공
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
 *       409:
 *         description: 이미 존재하는 이메일
 *       500:
 *         description: 서버 오류
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, confirmPassword } = body;

    // 입력 검증
    if (!name || !email || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: '이름, 이메일, 비밀번호가 모두 필요합니다.' 
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

    // 비밀번호 길이 검증
    if (password.length < 8) {
      return NextResponse.json(
        { 
          success: false, 
          error: '비밀번호는 최소 8자 이상이어야 합니다.' 
        },
        { status: 400 }
      );
    }

    // 비밀번호 확인
    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        { 
          success: false, 
          error: '비밀번호가 일치하지 않습니다.' 
        },
        { status: 400 }
      );
    }

    // 이름 길이 검증
    if (name.length < 2 || name.length > 50) {
      return NextResponse.json(
        { 
          success: false, 
          error: '이름은 2자 이상 50자 이하여야 합니다.' 
        },
        { status: 400 }
      );
    }

    // 이메일 중복 확인
    const existingUserResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUserResult.rows.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: '이미 등록된 이메일입니다.' 
        },
        { status: 409 }
      );
    }

    // 비밀번호 해시화
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 트랜잭션으로 사용자 생성
    const result = await transaction(async (client) => {
      // 사용자 생성
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, name, role, is_active, email_verified) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, email, name, role, is_active, email_verified, created_at`,
        [email.toLowerCase(), passwordHash, name.trim(), 'user', true, false]
      );

      const user = userResult.rows[0];

      // 사용자 프로필 생성
      await client.query(
        'INSERT INTO user_profiles (user_id, bio) VALUES ($1, $2)',
        [user.id, `${name}님의 프로필입니다.`]
      );

      // 감사 로그 기록
      await client.query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          user.id,
          'user.created',
          'user',
          user.id,
          JSON.stringify({ email: user.email, name: user.name }),
          request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          '127.0.0.1',
          request.headers.get('user-agent') || 'Unknown'
        ]
      );

      return user;
    });

    // JWT 토큰 생성
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET이 설정되지 않았습니다.');
    }

    const tokenPayload = {
      userId: result.id,
      email: result.email,
      role: result.role
    };

    const token = (jwt as any).sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your-secret-key',
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
      }
    );

    // 응답 데이터 (비밀번호 제외)
    const responseUser = {
      id: result.id,
      email: result.email,
      name: result.name,
      role: result.role,
      emailVerified: result.email_verified,
      createdAt: result.created_at
    };

    // JWT 토큰을 HttpOnly 쿠키로 설정
    const response = NextResponse.json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      user: responseUser,
      token // 클라이언트에서 localStorage 저장용 (선택사항)
    }, { status: 201 });

    // HttpOnly 쿠키 설정
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
      path: '/'
    });

    return response;

  } catch (error: any) {
    console.error('Register error:', error);
    
    // 중복 키 오류 처리
    if (error.code === '23505' && error.constraint?.includes('email')) {
      return NextResponse.json(
        { 
          success: false, 
          error: '이미 등록된 이메일입니다.' 
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: '회원가입 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}