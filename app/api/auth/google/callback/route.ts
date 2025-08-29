import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

/**
 * @swagger
 * /api/auth/google/callback:
 *   post:
 *     summary: Handle Google OAuth callback
 *     description: Process Google OAuth authorization code and store user's Google account credentials
 *     tags:
 *       - Google Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Authorization code from Google OAuth
 *     responses:
 *       200:
 *         description: Google account successfully linked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 googleAccount:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *       400:
 *         description: Missing authorization code
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
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

    const { code } = await request.json();
    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }

    // Google OAuth 클라이언트 설정
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/google/callback`
    );

    try {
      // 인증 코드로 액세스 토큰 요청
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Google 사용자 정보 가져오기
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfoResponse = await oauth2.userinfo.get();
      const googleUser = userInfoResponse.data;

      if (!googleUser.id || !googleUser.email) {
        return NextResponse.json({ error: 'Failed to get Google user information' }, { status: 500 });
      }

      // 기존 Google 계정 연결 확인
      const existingAccountResult = await query(
        'SELECT id FROM google_accounts WHERE user_id = $1 OR google_user_id = $2',
        [user.userId, googleUser.id]
      );

      if (existingAccountResult.rows.length > 0) {
        // 기존 계정 업데이트
        await query(
          `UPDATE google_accounts 
           SET access_token = $1, 
               refresh_token = $2, 
               token_expires_at = $3,
               email = $4,
               name = $5,
               picture_url = $6,
               scope = $7,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $8`,
          [
            tokens.access_token,
            tokens.refresh_token,
            tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            googleUser.email,
            googleUser.name,
            googleUser.picture,
            tokens.scope,
            user.userId
          ]
        );
      } else {
        // 새 Google 계정 연결 생성
        await query(
          `INSERT INTO google_accounts 
           (user_id, google_user_id, email, name, picture_url, access_token, refresh_token, token_expires_at, scope)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            user.userId,
            googleUser.id,
            googleUser.email,
            googleUser.name,
            googleUser.picture,
            tokens.access_token,
            tokens.refresh_token,
            tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            tokens.scope
          ]
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Google 계정이 성공적으로 연결되었습니다.',
        googleAccount: {
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture
        }
      });

    } catch (authError) {
      console.error('Google OAuth error:', authError);
      return NextResponse.json(
        { error: 'Google 인증 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Google callback error:', error);
    return NextResponse.json(
      { error: '요청 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}