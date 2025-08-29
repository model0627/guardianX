import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: connectionId } = await params;

    // Get user's tenant
    const userTenantResult = await query(
      'SELECT current_tenant_id FROM users WHERE id = $1',
      [user.userId]
    );

    if (userTenantResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const tenantId = userTenantResult.rows[0].current_tenant_id;

    // Get API connection
    const result = await query(
      'SELECT * FROM api_connections WHERE id = $1 AND tenant_id = $2 AND is_active = true',
      [connectionId, tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'API connection not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching API connection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API connection' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: connectionId } = await params;
    const { 
      name,
      api_url,
      connection_type,
      sync_target,
      auto_sync_enabled,
      field_mappings, 
      sync_frequency_minutes, 
      sync_frequency_type 
    } = await request.json();

    // Build dynamic update query - only include fields that exist in database schema
    const updateFields = ['updated_at = CURRENT_TIMESTAMP'];
    const updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(name);
    }

    if (api_url !== undefined) {
      updateFields.push(`api_url = $${paramIndex++}`);
      updateValues.push(api_url);
    }

    if (connection_type !== undefined) {
      updateFields.push(`connection_type = $${paramIndex++}`);
      updateValues.push(connection_type);
    }

    if (sync_target !== undefined) {
      updateFields.push(`sync_target = $${paramIndex++}`);
      updateValues.push(sync_target);
    }

    if (auto_sync_enabled !== undefined) {
      updateFields.push(`auto_sync_enabled = $${paramIndex++}`);
      updateValues.push(auto_sync_enabled);
    }

    if (field_mappings !== undefined) {
      updateFields.push(`field_mappings = $${paramIndex++}`);
      updateValues.push(JSON.stringify(field_mappings));
    }

    if (sync_frequency_minutes !== undefined) {
      updateFields.push(`sync_frequency_minutes = $${paramIndex++}`);
      updateValues.push(parseInt(sync_frequency_minutes) || 5);
    }

    if (sync_frequency_type !== undefined) {
      updateFields.push(`sync_frequency_type = $${paramIndex++}`);
      updateValues.push(sync_frequency_type || 'minutes');
    }

    if (updateFields.length === 1) { // Only 'updated_at = CURRENT_TIMESTAMP'
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updateValues.push(connectionId);

    const result = await query(
      `UPDATE api_connections 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex} AND is_active = true
       RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'API connection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    console.error('Error updating API connection:', error);
    return NextResponse.json(
      { error: 'Failed to update API connection' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: connectionId } = await params;

    // Get user's tenant
    const userTenantResult = await query(
      'SELECT current_tenant_id FROM users WHERE id = $1',
      [user.userId]
    );

    if (userTenantResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const tenantId = userTenantResult.rows[0].current_tenant_id;

    // Check if connection exists and belongs to user's tenant
    const connectionResult = await query(
      'SELECT * FROM api_connections WHERE id = $1 AND tenant_id = $2 AND is_active = true',
      [connectionId, tenantId]
    );

    if (connectionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'API connection not found or access denied' },
        { status: 404 }
      );
    }

    // Soft delete the API connection (only use fields that exist in schema)
    const result = await query(
      `UPDATE api_connections 
       SET is_active = false, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [connectionId, tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Failed to delete API connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'API connection deleted successfully',
      connection: result.rows[0]
    });

  } catch (error) {
    console.error('Error deleting API connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete API connection' },
      { status: 500 }
    );
  }
}