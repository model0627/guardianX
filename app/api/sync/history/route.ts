import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const connectionId = url.searchParams.get('connectionId');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let whereClause = '';
    const params: any[] = [limit, offset];

    if (connectionId) {
      whereClause = 'WHERE sh.api_connection_id = $3';
      params.push(connectionId);
    }

    const result = await query(
      `SELECT 
        sh.*,
        ac.name as connection_name,
        ac.api_url,
        u.email as initiated_by_email,
        u.name as initiated_by_name
      FROM sync_history sh
      LEFT JOIN api_connections ac ON sh.api_connection_id = ac.id
      LEFT JOIN users u ON sh.initiated_by = u.id
      ${whereClause}
      ORDER BY sh.sync_started_at DESC
      LIMIT $1 OFFSET $2`,
      params
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total 
       FROM sync_history sh 
       ${whereClause.replace('$3', '$1')}`,
      connectionId ? [connectionId] : []
    );

    const syncHistory = result.rows.map(row => ({
      id: row.id,
      connectionId: row.api_connection_id,
      connectionName: row.connection_name,
      apiUrl: row.api_url,
      syncStartedAt: row.sync_started_at,
      syncCompletedAt: row.sync_completed_at,
      status: row.status,
      executionType: row.execution_type || 'manual',
      recordsProcessed: row.records_processed || 0,
      recordsAdded: row.records_added || 0,
      recordsUpdated: row.records_updated || 0,
      recordsDeactivated: row.records_deactivated || 0,
      errorMessage: row.error_message,
      syncDetails: row.sync_details || {},
      initiatedBy: {
        email: row.initiated_by_email,
        name: row.initiated_by_name
      },
      duration: row.sync_completed_at 
        ? Math.round((new Date(row.sync_completed_at).getTime() - new Date(row.sync_started_at).getTime()) / 1000)
        : null
    }));

    return NextResponse.json({
      history: syncHistory,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit,
        offset,
        hasNext: (offset + limit) < parseInt(countResult.rows[0].total)
      }
    });

  } catch (error) {
    console.error('Error fetching sync history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync history' },
      { status: 500 }
    );
  }
}