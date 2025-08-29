import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function GET(
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

    const connectionId = params.id;

    // Get Google Sheets connection info
    const result = await query(
      `SELECT 
        gc.auth_type,
        gc.spreadsheet_id,
        gc.spreadsheet_url,
        gc.sheet_name,
        gc.range_notation,
        gc.google_account_id,
        ga.email as google_email
       FROM google_sheets_connections gc
       LEFT JOIN google_accounts ga ON gc.google_account_id = ga.id
       WHERE gc.api_connection_id = $1`,
      [connectionId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Google Sheets connection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching Google Sheets info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Google Sheets info' },
      { status: 500 }
    );
  }
}