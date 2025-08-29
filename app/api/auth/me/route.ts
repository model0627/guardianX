import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/database';

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 현재 로그인한 사용자 정보 조회
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
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
 *                     emailVerified:
 *                       type: boolean
 *                     lastLogin:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     profile:
 *                       type: object
 *                       properties:
 *                         bio:
 *                           type: string
 *                         avatarUrl:
 *                           type: string
 *                         location:
 *                           type: string
 *                         website:
 *                           type: string
 *       401:
 *         description: 인증되지 않은 요청
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function GET(request: NextRequest) {
  try {
    // 쿠키 또는 Authorization 헤더에서 토큰 가져오기
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: '인증 토큰이 필요합니다.' 
        },
        { status: 401 }
      );
    }

    // JWT 토큰 검증
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET이 설정되지 않았습니다.');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    } catch (jwtError) {
      return NextResponse.json(
        { 
          success: false, 
          error: '유효하지 않은 토큰입니다.' 
        },
        { status: 401 }
      );
    }

    // 사용자 정보 조회 (프로필 포함)
    const userResult = await query(`
      SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.role, 
        u.is_active, 
        u.email_verified, 
        u.last_login, 
        u.created_at,
        p.bio,
        p.avatar_url,
        p.location,
        p.website,
        p.phone
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.id = $1 AND u.is_active = true
    `, [decoded.userId]);

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: '사용자를 찾을 수 없습니다.' 
        },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // 응답 데이터 구성
    const responseUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.email_verified,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      profile: {
        bio: user.bio,
        avatarUrl: user.avatar_url,
        location: user.location,
        website: user.website,
        phone: user.phone
      }
    };

    return NextResponse.json({
      success: true,
      user: responseUser
    });

  } catch (error) {
    console.error('Get user info error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: '사용자 정보 조회 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}