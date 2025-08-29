import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken, getUserWithTenant } from '@/lib/auth';

export const runtime = 'nodejs';

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

    const checklistId = params.id;

    // 체크리스트 기본 정보 조회
    const checklistResult = await query(
      `SELECT 
        ac.*,
        u1.name as created_by_name,
        u2.name as updated_by_name
      FROM assessment_checklists ac
      LEFT JOIN users u1 ON ac.created_by = u1.id
      LEFT JOIN users u2 ON ac.updated_by = u2.id
      WHERE ac.id = $1 AND ac.tenant_id = $2`,
      [checklistId, user.tenantId]
    );

    if (checklistResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Checklist not found' },
        { status: 404 }
      );
    }

    const checklist = checklistResult.rows[0];

    // 체크리스트에 포함된 평가 항목들 조회
    const itemsResult = await query(
      `SELECT 
        ci.item_id,
        ci.order_index,
        ci.is_required,
        ci.custom_weight,
        ai.code,
        ai.title,
        ai.description,
        ai.category,
        ai.subcategory,
        ai.severity
      FROM checklist_items ci
      JOIN assessment_items ai ON ci.item_id = ai.id
      WHERE ci.checklist_id = $1
      ORDER BY ci.order_index`,
      [checklistId]
    );

    const item_ids = itemsResult.rows.map(row => row.item_id);
    const items = itemsResult.rows;

    return NextResponse.json({
      checklist: {
        ...checklist,
        item_ids,
        items
      }
    });

  } catch (error) {
    console.error('Error fetching checklist details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}