import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken, getUserWithTenant } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * @swagger
 * /api/assessment-items:
 *   get:
 *     summary: 평가 항목 목록 조회
 *     tags: [Assessment Items]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: 평가 항목 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       code:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       category:
 *                         type: string
 *                       subcategory:
 *                         type: string
 *                       severity:
 *                         type: string
 *                         enum: [low, medium, high, critical]
 *                       version:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [active, draft, deprecated]
 *                       compliance_standards:
 *                         type: array
 *                         items:
 *                           type: string
 *                       check_type:
 *                         type: string
 *                       remediation:
 *                         type: string
 *                       reference_links:
 *                         type: array
 *                         items:
 *                           type: string
 *                       tags:
 *                         type: array
 *                         items:
 *                           type: string
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

    // 평가 항목 조회
    const result = await query(
      `SELECT 
        ai.id,
        ai.code,
        ai.title,
        ai.description,
        ai.category,
        ai.subcategory,
        ai.severity,
        ai.version,
        ai.status,
        ai.compliance_standards,
        ai.check_type,
        ai.remediation,
        ai.reference_links,
        ai.tags,
        ai.created_at,
        ai.updated_at,
        u1.name as created_by_name,
        u2.name as updated_by_name
      FROM assessment_items ai
      LEFT JOIN users u1 ON ai.created_by = u1.id
      LEFT JOIN users u2 ON ai.updated_by = u2.id
      WHERE ai.tenant_id = $1
      ORDER BY ai.code`,
      [user.tenantId]
    );

    return NextResponse.json({ items: result.rows });
  } catch (error) {
    console.error('Error fetching assessment items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
      code,
      title,
      description,
      category,
      subcategory,
      severity,
      version,
      status,
      compliance_standards,
      check_type,
      remediation,
      reference_links,
      tags
    } = body;

    // 필수 필드 검증
    if (!code || !title || !description || !category || !severity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 코드 중복 체크
    const existingItem = await query(
      'SELECT id FROM assessment_items WHERE tenant_id = $1 AND code = $2',
      [user.tenantId, code]
    );

    if (existingItem.rows.length > 0) {
      return NextResponse.json(
        { error: 'Code already exists' },
        { status: 409 }
      );
    }

    // 새 평가 항목 생성
    const result = await query(
      `INSERT INTO assessment_items (
        tenant_id, code, title, description, category, subcategory,
        severity, version, status, compliance_standards, check_type,
        remediation, reference_links, tags, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
      RETURNING *`,
      [
        user.tenantId,
        code,
        title,
        description,
        category,
        subcategory || null,
        severity,
        version || '1.0.0',
        status || 'active',
        compliance_standards || [],
        check_type || 'automated',
        remediation,
        reference_links || [],
        tags || [],
        user.userId
      ]
    );

    return NextResponse.json({ 
      message: 'Assessment item created successfully',
      item: result.rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating assessment item:', error);
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
      code,
      title,
      description,
      category,
      subcategory,
      severity,
      version,
      status,
      compliance_standards,
      check_type,
      remediation,
      reference_links,
      tags
    } = body;

    // 필수 필드 검증
    if (!id || !code || !title || !description || !category || !severity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 항목 존재 여부 및 권한 확인
    const existingItem = await query(
      'SELECT id FROM assessment_items WHERE id = $1 AND tenant_id = $2',
      [id, user.tenantId]
    );

    if (existingItem.rows.length === 0) {
      return NextResponse.json(
        { error: 'Assessment item not found' },
        { status: 404 }
      );
    }

    // 다른 항목과의 코드 중복 체크
    const duplicateCheck = await query(
      'SELECT id FROM assessment_items WHERE tenant_id = $1 AND code = $2 AND id != $3',
      [user.tenantId, code, id]
    );

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'Code already exists' },
        { status: 409 }
      );
    }

    // 평가 항목 업데이트
    const result = await query(
      `UPDATE assessment_items SET
        code = $1,
        title = $2,
        description = $3,
        category = $4,
        subcategory = $5,
        severity = $6,
        version = $7,
        status = $8,
        compliance_standards = $9,
        check_type = $10,
        remediation = $11,
        reference_links = $12,
        tags = $13,
        updated_by = $14,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15 AND tenant_id = $16
      RETURNING *`,
      [
        code,
        title,
        description,
        category,
        subcategory || null,
        severity,
        version || '1.0.0',
        status || 'active',
        compliance_standards || [],
        check_type || 'automated',
        remediation,
        reference_links || [],
        tags || [],
        user.userId,
        id,
        user.tenantId
      ]
    );

    return NextResponse.json({ 
      message: 'Assessment item updated successfully',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating assessment item:', error);
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
        { error: 'Missing item ID' },
        { status: 400 }
      );
    }

    // 항목 존재 여부 및 권한 확인
    const existingItem = await query(
      'SELECT id FROM assessment_items WHERE id = $1 AND tenant_id = $2',
      [id, user.tenantId]
    );

    if (existingItem.rows.length === 0) {
      return NextResponse.json(
        { error: 'Assessment item not found' },
        { status: 404 }
      );
    }

    // 체크리스트에서 사용 중인지 확인
    const usageCheck = await query(
      'SELECT COUNT(*) as count FROM checklist_items WHERE item_id = $1',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete item that is used in checklists' },
        { status: 409 }
      );
    }

    // 평가 항목 삭제
    await query(
      'DELETE FROM assessment_items WHERE id = $1 AND tenant_id = $2',
      [id, user.tenantId]
    );

    return NextResponse.json({ 
      message: 'Assessment item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting assessment item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}