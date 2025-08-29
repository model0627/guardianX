import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing checklists without auth...');
    
    // shawn@gmail.com의 테넌트 ID로 직접 쿼리
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
        u1.email as created_by_name,
        u2.email as updated_by_name,
        COUNT(ci.item_id) as item_count
      FROM assessment_checklists ac
      LEFT JOIN users u1 ON ac.created_by = u1.id
      LEFT JOIN users u2 ON ac.updated_by = u2.id
      LEFT JOIN checklist_items ci ON ac.id = ci.checklist_id
      WHERE ac.tenant_id = '15a96ee7-2f61-45c9-b89c-13d3212997fc'
      GROUP BY ac.id, u1.email, u2.email
      ORDER BY ac.name`,
      []
    );

    console.log('Found checklists:', result.rows.length);
    console.log('Checklists data:', result.rows);

    return NextResponse.json({ 
      success: true,
      count: result.rows.length,
      checklists: result.rows 
    });
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}