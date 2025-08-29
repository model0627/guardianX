import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * @swagger
 * /api/user/api-keys:
 *   get:
 *     summary: 사용자의 API 키 목록 조회
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API 키 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 apiKeys:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       keyPreview:
 *                         type: string
 *                       permissions:
 *                         type: array
 *                         items:
 *                           type: string
 *                       lastUsed:
 *                         type: string
 *                         format: date-time
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const result = await query(`
      SELECT 
        id,
        name,
        CONCAT(LEFT(key_hash, 4), '...', RIGHT(key_hash, 4)) as key_preview,
        permissions,
        last_used,
        created_at
      FROM api_keys 
      WHERE user_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `, [user.userId]);

    const apiKeys = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      keyPreview: row.key_preview,
      permissions: row.permissions || [],
      lastUsed: row.last_used,
      createdAt: row.created_at
    }));

    return NextResponse.json({
      success: true,
      apiKeys
    });
  } catch (error) {
    console.error('API keys list error:', error);
    return NextResponse.json(
      { error: 'API 키 목록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/user/api-keys:
 *   post:
 *     summary: 새 API 키 생성
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: API 키 이름
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: API 키 권한 목록
 *                 default: ["read"]
 *     responses:
 *       201:
 *         description: API 키 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 apiKey:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     key:
 *                       type: string
 *                       description: 생성된 API 키 (한 번만 표시됨)
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { name, permissions = ['read'] } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'API 키 이름은 필수입니다.' },
        { status: 400 }
      );
    }

    // API 키 생성 (gx_로 시작하는 32자리 랜덤 문자열)
    const apiKey = 'gx_' + randomBytes(32).toString('hex');
    const keyHash = await bcrypt.hash(apiKey, 12);

    // 데이터베이스에 저장
    const result = await query(`
      INSERT INTO api_keys (user_id, name, key_hash, permissions)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, permissions, created_at
    `, [user.userId, name.trim(), keyHash, JSON.stringify(permissions)]);

    const newApiKey = result.rows[0];

    return NextResponse.json({
      success: true,
      apiKey: {
        id: newApiKey.id,
        name: newApiKey.name,
        key: apiKey, // 실제 키는 한 번만 반환
        permissions: newApiKey.permissions,
        createdAt: newApiKey.created_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('API key creation error:', error);
    return NextResponse.json(
      { error: 'API 키 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}