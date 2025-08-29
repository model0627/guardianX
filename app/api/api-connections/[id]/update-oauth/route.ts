import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spreadsheetId, authType } = await request.json();
    const connectionId = params.id;

    // Check if user has Google account connected
    const googleAccountResult = await query(
      'SELECT id FROM google_accounts WHERE user_id = $1',
      [user.userId]
    );

    if (googleAccountResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Google 계정을 먼저 연결해주세요.' },
        { status: 400 }
      );
    }

    const googleAccountId = googleAccountResult.rows[0].id;

    // Check if google_sheets_connections entry exists
    const existingResult = await query(
      'SELECT id FROM google_sheets_connections WHERE api_connection_id = $1',
      [connectionId]
    );

    if (existingResult.rows.length > 0) {
      // Update existing entry
      await query(
        `UPDATE google_sheets_connections 
         SET auth_type = $1, 
             google_account_id = $2,
             spreadsheet_id = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE api_connection_id = $4`,
        [authType, googleAccountId, spreadsheetId, connectionId]
      );
    } else {
      // Create new entry
      await query(
        `INSERT INTO google_sheets_connections (
          api_connection_id, spreadsheet_id, auth_type, google_account_id
        ) VALUES ($1, $2, $3, $4)`,
        [connectionId, spreadsheetId, authType, googleAccountId]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OAuth 설정이 업데이트되었습니다.'
    });

  } catch (error) {
    console.error('Error updating OAuth settings:', error);
    return NextResponse.json(
      { error: 'OAuth 설정 업데이트 실패' },
      { status: 500 }
    );
  }
}