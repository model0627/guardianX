import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

/**
 * @swagger
 * /api/auth/google/status:
 *   get:
 *     summary: Check Google account connection status
 *     description: Check if the current user has a Google account connected
 *     tags:
 *       - Google Auth
 *     responses:
 *       200:
 *         description: Google account status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected:
 *                   type: boolean
 *                   description: Whether user has a Google account connected
 *                 googleAccount:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     picture_url:
 *                       type: string
 *                     connected_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Disconnect Google account
 *     description: Remove Google account connection for the current user
 *     tags:
 *       - Google Auth
 *     responses:
 *       200:
 *         description: Google account disconnected successfully
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
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: No Google account found to disconnect
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

    // Google 계정 연결 상태 확인
    const result = await query(
      `SELECT email, name, picture_url, created_at, token_expires_at
       FROM google_accounts 
       WHERE user_id = $1`,
      [user.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        connected: false
      });
    }

    const googleAccount = result.rows[0];
    const isTokenExpired = googleAccount.token_expires_at && new Date() > new Date(googleAccount.token_expires_at);

    return NextResponse.json({
      connected: true,
      googleAccount: {
        email: googleAccount.email,
        name: googleAccount.name,
        picture_url: googleAccount.picture_url,
        connected_at: googleAccount.created_at,
        token_expired: isTokenExpired
      }
    });

  } catch (error) {
    console.error('Google status check error:', error);
    return NextResponse.json(
      { error: 'Google 계정 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Google 계정 연결 해제
    const result = await query(
      'DELETE FROM google_accounts WHERE user_id = $1 RETURNING id',
      [user.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '연결된 Google 계정을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Google 계정 연결이 해제되었습니다.'
    });

  } catch (error) {
    console.error('Google disconnect error:', error);
    return NextResponse.json(
      { error: 'Google 계정 연결 해제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}