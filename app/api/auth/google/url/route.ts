import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

/**
 * @swagger
 * /api/auth/google/url:
 *   get:
 *     summary: Get Google OAuth authorization URL
 *     description: Generate Google OAuth authorization URL for user to authenticate with Google
 *     tags:
 *       - Google Auth
 *     responses:
 *       200:
 *         description: Google OAuth URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authUrl:
 *                   type: string
 *                   description: Google OAuth authorization URL
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Google OAuth 클라이언트 설정
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/google/callback`
    );

    // 권한 스코프 설정
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly'
    ];

    // OAuth URL 생성
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // 리프레시 토큰을 위해 필요
      prompt: 'consent', // 항상 동의 화면 표시 (리프레시 토큰 획득을 위해)
      scope: scopes,
      state: user.userId // 보안을 위해 사용자 ID 전달
    });

    return NextResponse.json({
      authUrl
    });

  } catch (error) {
    console.error('Google auth URL generation error:', error);
    return NextResponse.json(
      { error: 'Google 인증 URL 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}