import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/database';
import { getTokenFromRequest, verifyToken, getUserWithTenant } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * @swagger
 * /api/asset-assessments:
 *   get:
 *     summary: 자산 점검 목록 조회
 *     tags: [Asset Assessments]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed]
 *         description: 평가 상태로 필터링
 *       - in: query
 *         name: asset_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 자산 ID로 필터링
 *     responses:
 *       200:
 *         description: 자산 점검 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assessments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       asset_id:
 *                         type: string
 *                         format: uuid
 *                       asset_name:
 *                         type: string
 *                       asset_type:
 *                         type: string
 *                       assessment_name:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [pending, in_progress, completed]
 *                       started_at:
 *                         type: string
 *                         format: date-time
 *                       completed_at:
 *                         type: string
 *                         format: date-time
 *                       total_items:
 *                         type: integer
 *                       passed_items:
 *                         type: integer
 *                       failed_items:
 *                         type: integer
 *                       skipped_items:
 *                         type: integer
 *                       overall_score:
 *                         type: number
 *                       risk_level:
 *                         type: string
 *                         enum: [low, medium, high, critical]
 *                       progress_percentage:
 *                         type: number
 *                       checklist_name:
 *                         type: string
 *                       checklist_version:
 *                         type: string
 *                       created_by_name:
 *                         type: string
 *                       created_at:
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assetId = searchParams.get('asset_id');

    // 자산 점검 목록 조회
    let whereClause = 'WHERE aa.tenant_id = $1';
    const params = [user.tenantId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND aa.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (assetId) {
      whereClause += ` AND aa.asset_id = $${paramIndex}`;
      params.push(assetId);
      paramIndex++;
    }

    const result = await query(
      `SELECT 
        aa.id,
        aa.asset_id,
        aa.asset_name,
        aa.asset_type,
        aa.assessment_name,
        aa.status,
        aa.started_at,
        aa.completed_at,
        aa.total_items,
        aa.passed_items,
        aa.failed_items,
        aa.skipped_items,
        aa.overall_score,
        aa.risk_level,
        aa.created_at,
        ac.name as checklist_name,
        ac.version as checklist_version,
        u.name as created_by_name,
        -- 진행률 계산
        CASE 
          WHEN aa.total_items > 0 THEN 
            ROUND(((aa.passed_items + aa.failed_items + aa.skipped_items)::decimal / aa.total_items) * 100, 1)
          ELSE 0 
        END as progress_percentage
      FROM asset_assessments aa
      LEFT JOIN assessment_checklists ac ON aa.checklist_id = ac.id
      LEFT JOIN users u ON aa.created_by = u.id
      ${whereClause}
      ORDER BY aa.created_at DESC`,
      params
    );

    return NextResponse.json({ assessments: result.rows });
  } catch (error) {
    console.error('Error fetching asset assessments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/asset-assessments:
 *   post:
 *     summary: 자산 평가 생성
 *     tags: [Asset Assessments]
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
 *               - checklist_id
 *               - asset_ids
 *               - assessment_name
 *             properties:
 *               checklist_id:
 *                 type: string
 *                 format: uuid
 *                 description: 체크리스트 ID
 *               asset_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: 평가할 자산 ID 목록
 *               assessment_name:
 *                 type: string
 *                 description: 평가 이름
 *     responses:
 *       201:
 *         description: 평가 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 assessments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       asset_id:
 *                         type: string
 *                         format: uuid
 *                       asset_name:
 *                         type: string
 *                       asset_type:
 *                         type: string
 *                       assessment_name:
 *                         type: string
 *                       status:
 *                         type: string
 *                       total_items:
 *                         type: integer
 *                       asset_ip_addresses:
 *                         type: string
 *       400:
 *         description: Missing required fields
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Checklist or assets not found
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
      checklist_id,
      asset_ids, // 선택된 자산 ID 배열
      assessment_name
    } = body;

    // 필수 필드 검증
    if (!checklist_id || !asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 체크리스트 존재 확인 및 항목 수 가져오기
    const checklistResult = await query(
      `SELECT 
        ac.id,
        ac.name,
        COUNT(ci.item_id) as item_count
      FROM assessment_checklists ac
      LEFT JOIN checklist_items ci ON ac.id = ci.checklist_id
      WHERE ac.id = $1 AND ac.tenant_id = $2
      GROUP BY ac.id, ac.name`,
      [checklist_id, user.tenantId]
    );

    if (checklistResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Checklist not found' },
        { status: 404 }
      );
    }

    const checklist = checklistResult.rows[0];

    // 자산 정보 가져오기
    const assetsResult = await query(
      `SELECT 
        d.id,
        d.name,
        d.device_type as type,
        string_agg(DISTINCT ip.ip_address::text, ', ') as ip_addresses
      FROM devices d
      LEFT JOIN device_ip_mappings dim ON d.id = dim.device_id
      LEFT JOIN ip_addresses ip ON dim.ip_address_id = ip.id AND ip.status = 'allocated'
      WHERE d.id = ANY($1)
      GROUP BY d.id, d.name, d.device_type`,
      [asset_ids]
    );

    if (assetsResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid assets found' },
        { status: 404 }
      );
    }

    const result = await transaction(async (client) => {
      const createdAssessments = [];

      // 각 자산에 대해 평가 생성
      for (const asset of assetsResult.rows) {
        const assessmentResult = await client.query(
          `INSERT INTO asset_assessments (
            tenant_id,
            checklist_id,
            asset_id,
            asset_name,
            asset_type,
            assessment_name,
            status,
            total_items,
            started_at,
            created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9)
          RETURNING *`,
          [
            user.tenantId,
            checklist_id,
            asset.id,
            asset.name,
            asset.type,
            assessment_name || `${asset.name} - ${checklist.name}`,
            'pending',
            checklist.item_count,
            user.userId
          ]
        );

        const assessment = assessmentResult.rows[0];
        createdAssessments.push({
          ...assessment,
          asset_ip_addresses: asset.ip_addresses
        });

        // 체크리스트 항목들에 대한 결과 템플릿 생성
        const checklistItemsResult = await client.query(
          `SELECT ci.item_id, ai.code, ai.title, ai.severity
           FROM checklist_items ci
           JOIN assessment_items ai ON ci.item_id = ai.id
           WHERE ci.checklist_id = $1
           ORDER BY ci.order_index`,
          [checklist_id]
        );

        // 각 항목에 대한 결과 레코드 생성
        for (const item of checklistItemsResult.rows) {
          await client.query(
            `INSERT INTO asset_assessment_results (
              tenant_id,
              assessment_id,
              item_id,
              status,
              score
            ) VALUES ($1, $2, $3, $4, $5)`,
            [user.tenantId, assessment.id, item.item_id, 'skip', 0]
          );
        }
      }

      return createdAssessments;
    });

    return NextResponse.json({ 
      message: `${result.length}개 자산에 대한 평가가 생성되었습니다.`,
      assessments: result
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating asset assessments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/asset-assessments:
 *   put:
 *     summary: 자산 평가 업데이트
 *     tags: [Asset Assessments]
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
 *               - assessment_id
 *               - status
 *             properties:
 *               assessment_id:
 *                 type: string
 *                 format: uuid
 *                 description: 평가 ID
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed]
 *                 description: 평가 상태
 *               results:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     item_id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       enum: [not_checked, passed, failed, skipped]
 *                     score:
 *                       type: number
 *                     finding:
 *                       type: string
 *                     evidence:
 *                       type: string
 *                 description: 평가 항목별 결과
 *     responses:
 *       200:
 *         description: 평가 업데이트 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 assessment:
 *                   type: object
 *       400:
 *         description: Missing required fields
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Assessment not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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
    const { assessment_id, status, results } = body;

    if (!assessment_id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 평가 존재 확인
    const assessmentResult = await query(
      'SELECT id FROM asset_assessments WHERE id = $1 AND tenant_id = $2',
      [assessment_id, user.tenantId]
    );

    if (assessmentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    const result = await transaction(async (client) => {
      // 평가 상태 업데이트
      const updateData: any = { status };
      let updateQuery = 'UPDATE asset_assessments SET status = $1';
      let params = [status];
      let paramIndex = 2;

      if (status === 'in_progress' && !results) {
        updateQuery += `, started_at = CURRENT_TIMESTAMP`;
      } else if (status === 'completed') {
        updateQuery += `, completed_at = CURRENT_TIMESTAMP`;
      }

      updateQuery += `, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} RETURNING *`;
      params.push(assessment_id, user.tenantId);

      const updateResult = await client.query(updateQuery, params);

      // 결과가 있는 경우 업데이트
      if (results && Array.isArray(results)) {
        for (const resultItem of results) {
          await client.query(
            `UPDATE asset_assessment_results SET
              status = $1,
              score = $2,
              finding = $3,
              evidence = $4,
              updated_at = CURRENT_TIMESTAMP
            WHERE assessment_id = $5 AND item_id = $6`,
            [
              resultItem.status,
              resultItem.score || 0,
              resultItem.finding || null,
              resultItem.evidence || null,
              assessment_id,
              resultItem.item_id
            ]
          );
        }
      }

      return updateResult.rows[0];
    });

    return NextResponse.json({ 
      message: 'Assessment updated successfully',
      assessment: result
    });

  } catch (error) {
    console.error('Error updating asset assessment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}