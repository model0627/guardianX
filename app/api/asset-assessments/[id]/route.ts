import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken, getUserWithTenant } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * @swagger
 * /api/asset-assessments/{id}:
 *   get:
 *     summary: 특정 자산 평가 상세 조회
 *     tags: [Asset Assessments]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 평가 ID
 *     responses:
 *       200:
 *         description: 평가 상세 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assessment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     asset_id:
 *                       type: string
 *                       format: uuid
 *                     asset_name:
 *                       type: string
 *                     asset_type:
 *                       type: string
 *                     assessment_name:
 *                       type: string
 *                     status:
 *                       type: string
 *                     checklist_name:
 *                       type: string
 *                     checklist_version:
 *                       type: string
 *                     checklist_description:
 *                       type: string
 *                     created_by_name:
 *                       type: string
 *                     stats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         passed:
 *                           type: integer
 *                         failed:
 *                           type: integer
 *                         skipped:
 *                           type: integer
 *                         not_applicable:
 *                           type: integer
 *                         not_checked:
 *                           type: integer
 *                         progress:
 *                           type: number
 *                         score:
 *                           type: number
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 resultsByCategory:
 *                   type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Assessment not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const assessmentId = params.id;

    // 평가 기본 정보 조회
    const assessmentResult = await query(
      `SELECT 
        aa.*,
        ac.name as checklist_name,
        ac.version as checklist_version,
        ac.description as checklist_description,
        u.name as created_by_name
      FROM asset_assessments aa
      LEFT JOIN assessment_checklists ac ON aa.checklist_id = ac.id
      LEFT JOIN users u ON aa.created_by = u.id
      WHERE aa.id = $1 AND aa.tenant_id = $2`,
      [assessmentId, user.tenantId]
    );

    if (assessmentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    const assessment = assessmentResult.rows[0];

    // 평가 상세 결과 조회
    const resultsQuery = await query(
      `SELECT 
        aar.*,
        ai.code,
        ai.title,
        ai.description,
        ai.category,
        ai.subcategory,
        ai.severity,
        ai.remediation,
        ai.reference_links,
        u1.name as verified_by_name
      FROM asset_assessment_results aar
      JOIN assessment_items ai ON aar.item_id = ai.id
      LEFT JOIN users u1 ON aar.verified_by = u1.id
      WHERE aar.assessment_id = $1
      ORDER BY ai.category, ai.code`,
      [assessmentId]
    );

    // 카테고리별로 그룹화
    const resultsByCategory: Record<string, any[]> = {};
    resultsQuery.rows.forEach(result => {
      const category = result.category || 'Others';
      if (!resultsByCategory[category]) {
        resultsByCategory[category] = [];
      }
      resultsByCategory[category].push(result);
    });

    // 통계 계산
    const stats = {
      total: resultsQuery.rows.length,
      passed: resultsQuery.rows.filter(r => r.status === 'pass').length,
      failed: resultsQuery.rows.filter(r => r.status === 'fail').length,
      skipped: resultsQuery.rows.filter(r => r.status === 'skip').length,
      not_applicable: resultsQuery.rows.filter(r => r.status === 'not_applicable').length,
      not_checked: resultsQuery.rows.filter(r => r.status === 'not_checked').length,
      progress: 0,
      score: 0
    };

    const checkedItems = stats.total - stats.not_checked;
    if (stats.total > 0) {
      stats.progress = Math.round((checkedItems / stats.total) * 100);
    }
    
    if (checkedItems > 0) {
      stats.score = Math.round((stats.passed / checkedItems) * 100);
    }

    return NextResponse.json({
      assessment: {
        ...assessment,
        stats
      },
      results: resultsQuery.rows,
      resultsByCategory
    });

  } catch (error) {
    console.error('Error fetching assessment details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/asset-assessments/{id}:
 *   delete:
 *     summary: 자산 평가 삭제
 *     tags: [Asset Assessments]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 평가 ID
 *     responses:
 *       200:
 *         description: 평가 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Assessment not found
 *       409:
 *         description: Cannot delete assessment in progress
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const assessmentId = params.id;

    // 평가 존재 확인
    const existingAssessment = await query(
      'SELECT id, status FROM asset_assessments WHERE id = $1 AND tenant_id = $2',
      [assessmentId, user.tenantId]
    );

    if (existingAssessment.rows.length === 0) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // 진행 중인 평가는 삭제 불가
    if (existingAssessment.rows[0].status === 'in_progress') {
      return NextResponse.json(
        { error: 'Cannot delete assessment in progress' },
        { status: 409 }
      );
    }

    // 평가 삭제 (CASCADE로 관련 결과도 자동 삭제)
    await query(
      'DELETE FROM asset_assessments WHERE id = $1 AND tenant_id = $2',
      [assessmentId, user.tenantId]
    );

    return NextResponse.json({ 
      message: 'Assessment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting assessment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}