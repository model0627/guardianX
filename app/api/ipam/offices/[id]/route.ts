import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAuthUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[API DEBUG] Office detail API called for ID:', id);
    
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // Get current user's tenant ID
    const userResult = await query(`
      SELECT current_tenant_id FROM users WHERE id = $1
    `, [user.userId]);

    if (userResult.rows.length === 0 || !userResult.rows[0].current_tenant_id) {
      return NextResponse.json(
        { error: '테넌트 정보를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    const tenantId = userResult.rows[0].current_tenant_id;

    // Get office details
    const result = await query(`
      SELECT 
        id, name, description, address, contact_person, phone, email, created_at, updated_at
      FROM offices 
      WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '사무실을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Add counts (simplified for now)
    const office = {
      ...result.rows[0],
      server_rooms_count: 0,
      devices_count: 0
    };

    return NextResponse.json({
      success: true,
      office: office
    });

  } catch (error) {
    console.error('[API] Office detail error:', error);
    return NextResponse.json(
      { error: '사무실 상세 정보 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}