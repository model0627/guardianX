import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import jwt from 'jsonwebtoken';

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 사용자 로그아웃
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: 인증되지 않은 요청
 *       500:
 *         description: 서버 오류
 */
export async function POST(request: NextRequest) {
  try {
    // 쿠키 또는 Authorization 헤더에서 토큰 가져오기
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (token && process.env.JWT_SECRET) {
      try {
        // 토큰 검증 및 사용자 정보 추출
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        
        // 감사 로그 기록
        await query(
          'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
          [
            decoded.userId,
            'user.logout',
            'user',
            decoded.userId,
            request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            '127.0.0.1',
            request.headers.get('user-agent') || 'Unknown'
          ]
        );
      } catch (jwtError) {
        // JWT 검증 실패는 무시하고 쿠키만 삭제
        console.log('JWT verification failed during logout:', jwtError);
      }
    }

    // 로그아웃 응답 (쿠키 삭제)
    const response = NextResponse.json({
      success: true,
      message: '로그아웃이 완료되었습니다.'
    });

    // HttpOnly 쿠키 삭제
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // 즉시 만료
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    
    // 에러가 발생해도 쿠키는 삭제
    const response = NextResponse.json(
      { 
        success: true, 
        message: '로그아웃이 완료되었습니다.' 
      }
    );

    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    return response;
  }
}