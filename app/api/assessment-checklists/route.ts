import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/database';
import { getTokenFromRequest, verifyToken, getUserWithTenant } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * @swagger
 * /api/assessment-checklists:
 *   get:
 *     summary: 평가 체크리스트 목록 조회
 *     tags: [Assessment Checklists]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: 체크리스트 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 checklists:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       version:
 *                         type: string
 *                       category:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [draft, active, archived]
 *                       compliance_framework:
 *                         type: string
 *                       usage_count:
 *                         type: integer
 *                       last_used:
 *                         type: string
 *                         format: date-time
 *                       item_count:
 *                         type: integer
 *                       created_by_name:
 *                         type: string
 *                       updated_by_name:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       400:
 *         description: No tenant selected
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 테넌트 정보가 토큰에 없으면 데이터베이스에서 가져오기
    if (!user.tenantId) {
      const userWithTenant = await getUserWithTenant(user.userId);
      if (!userWithTenant || !userWithTenant.tenantId) {
        return NextResponse.json({ error: 'No tenant selected' }, { status: 400 });
      }
      user.tenantId = userWithTenant.tenantId;
    }

    // 체크리스트 조회 (항목 수 포함)
    const result = await query(
      `SELECT 
        ac.id,
        ac.name,
        ac.description,
        ac.version,
        ac.category,
        ac.status,
        ac.compliance_framework,
        ac.usage_count,
        ac.last_used,
        ac.created_at,
        ac.updated_at,
        u1.name as created_by_name,
        u2.name as updated_by_name,
        COUNT(ci.item_id) as item_count
      FROM assessment_checklists ac
      LEFT JOIN users u1 ON ac.created_by = u1.id
      LEFT JOIN users u2 ON ac.updated_by = u2.id
      LEFT JOIN checklist_items ci ON ac.id = ci.checklist_id
      WHERE ac.tenant_id = $1
      GROUP BY ac.id, u1.name, u2.name
      ORDER BY ac.name`,
      [user.tenantId]
    );

    return NextResponse.json({ checklists: result.rows });
  } catch (error) {
    console.error('Error fetching assessment checklists:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/assessment-checklists:
 *   post:
 *     summary: 새 평가 체크리스트 생성
 *     tags: [Assessment Checklists]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
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
 *                 description: 체크리스트 이름
 *               description:
 *                 type: string
 *                 description: 설명
 *               version:
 *                 type: string
 *                 description: 버전
 *               category:
 *                 type: string
 *                 description: 카테고리
 *               compliance_framework:
 *                 type: string
 *                 description: 컴플라이언스 프레임워크
 *               items:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: 체크리스트에 포함할 항목 ID 목록
 *     responses:
 *       201:
 *         description: 체크리스트 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Missing required fields
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 테넌트 정보가 토큰에 없으면 데이터베이스에서 가져오기
    if (!user.tenantId) {
      const userWithTenant = await getUserWithTenant(user.userId);
      if (!userWithTenant || !userWithTenant.tenantId) {
        return NextResponse.json({ error: 'No tenant selected' }, { status: 400 });
      }
      user.tenantId = userWithTenant.tenantId;
    }

    const body = await request.json();
    const {
      name,
      description,
      version,
      category,
      status,
      compliance_framework,
      item_ids // 선택된 평가 항목 ID 배열
    } = body;

    // 필수 필드 검증
    if (!name || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 트랜잭션 시작
    const result = await transaction(async (client) => {
      // 체크리스트 생성
      const checklistResult = await client.query(
        `INSERT INTO assessment_checklists (
          tenant_id, name, description, version, category, status,
          compliance_framework, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
        RETURNING *`,
        [
          user.tenantId,
          name,
          description || null,
          version || '1.0.0',
          category,
          status || 'draft',
          compliance_framework || null,
          user.userId
        ]
      );

      const checklistId = checklistResult.rows[0].id;

      // 선택된 항목들을 체크리스트에 추가
      if (item_ids && item_ids.length > 0) {
        for (let i = 0; i < item_ids.length; i++) {
          await client.query(
            `INSERT INTO checklist_items (
              tenant_id, checklist_id, item_id, order_index, is_required, custom_weight
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [user.tenantId, checklistId, item_ids[i], i + 1, true, 1.0]
          );
        }
      }

      return checklistResult.rows[0];
    });

    return NextResponse.json({ 
      message: 'Assessment checklist created successfully',
      checklist: result
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating assessment checklist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 인증 확인
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 테넌트 정보가 토큰에 없으면 데이터베이스에서 가져오기
    if (!user.tenantId) {
      const userWithTenant = await getUserWithTenant(user.userId);
      if (!userWithTenant || !userWithTenant.tenantId) {
        return NextResponse.json({ error: 'No tenant selected' }, { status: 400 });
      }
      user.tenantId = userWithTenant.tenantId;
    }

    const body = await request.json();
    const {
      id,
      name,
      description,
      version,
      category,
      status,
      compliance_framework,
      item_ids // 업데이트된 평가 항목 ID 배열
    } = body;

    // 필수 필드 검증
    if (!id || !name || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 체크리스트 존재 여부 및 권한 확인
    const existingChecklist = await query(
      'SELECT id FROM assessment_checklists WHERE id = $1 AND tenant_id = $2',
      [id, user.tenantId]
    );

    if (existingChecklist.rows.length === 0) {
      return NextResponse.json(
        { error: 'Assessment checklist not found' },
        { status: 404 }
      );
    }

    // 트랜잭션 시작
    const result = await transaction(async (client) => {
      // 체크리스트 업데이트
      const updateResult = await client.query(
        `UPDATE assessment_checklists SET
          name = $1,
          description = $2,
          version = $3,
          category = $4,
          status = $5,
          compliance_framework = $6,
          updated_by = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8 AND tenant_id = $9
        RETURNING *`,
        [
          name,
          description || null,
          version || '1.0.0',
          category,
          status || 'draft',
          compliance_framework || null,
          user.userId,
          id,
          user.tenantId
        ]
      );

      // 기존 체크리스트 항목들 삭제
      await client.query(
        'DELETE FROM checklist_items WHERE checklist_id = $1',
        [id]
      );

      // 새로운 항목들 추가
      if (item_ids && item_ids.length > 0) {
        for (let i = 0; i < item_ids.length; i++) {
          await client.query(
            `INSERT INTO checklist_items (
              tenant_id, checklist_id, item_id, order_index, is_required, custom_weight
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [user.tenantId, id, item_ids[i], i + 1, true, 1.0]
          );
        }
      }

      return updateResult.rows[0];
    });

    return NextResponse.json({ 
      message: 'Assessment checklist updated successfully',
      checklist: result
    });
  } catch (error) {
    console.error('Error updating assessment checklist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 인증 확인
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 테넌트 정보가 토큰에 없으면 데이터베이스에서 가져오기
    if (!user.tenantId) {
      const userWithTenant = await getUserWithTenant(user.userId);
      if (!userWithTenant || !userWithTenant.tenantId) {
        return NextResponse.json({ error: 'No tenant selected' }, { status: 400 });
      }
      user.tenantId = userWithTenant.tenantId;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing checklist ID' },
        { status: 400 }
      );
    }

    // 체크리스트 존재 여부 및 권한 확인
    const existingChecklist = await query(
      'SELECT id FROM assessment_checklists WHERE id = $1 AND tenant_id = $2',
      [id, user.tenantId]
    );

    if (existingChecklist.rows.length === 0) {
      return NextResponse.json(
        { error: 'Assessment checklist not found' },
        { status: 404 }
      );
    }

    // 평가 실행에서 사용 중인지 확인
    const usageCheck = await query(
      'SELECT COUNT(*) as count FROM asset_assessments WHERE checklist_id = $1',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete checklist that is used in assessments' },
        { status: 409 }
      );
    }

    // 체크리스트 삭제 (CASCADE로 checklist_items도 자동 삭제)
    await query(
      'DELETE FROM assessment_checklists WHERE id = $1 AND tenant_id = $2',
      [id, user.tenantId]
    );

    return NextResponse.json({ 
      message: 'Assessment checklist deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting assessment checklist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}