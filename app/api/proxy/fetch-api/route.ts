import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get token from request (supports both Authorization header and cookie)
    const token = getTokenFromRequest(request);
    
    console.log('[Proxy API] Token found:', token ? 'Yes' : 'No');
    
    if (!token) {
      console.log('[Proxy API] No token found in request');
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    // Verify the JWT token
    const user = await verifyToken(token);
    
    console.log('[Proxy API] Token verification:', user ? `Success - ${user.email}` : 'Failed');
    
    if (!user) {
      console.log('[Proxy API] Token verification failed');
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Fetch data from external API
    console.log('[Proxy API] Fetching external URL:', url);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      console.log('[Proxy API] External API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');
        console.log('[Proxy API] External API error:', errorText);
        
        // Don't return 401 from external API as our own 401
        // Return 502 (Bad Gateway) for external API errors
        if (response.status === 401) {
          return NextResponse.json(
            { error: 'External API authentication failed', details: errorText },
            { status: 502 }
          );
        }
        
        return NextResponse.json(
          { error: `External API error: ${response.status}`, details: errorText },
          { status: 502 }
        );
      }

      const data = await response.json();
      console.log('[Proxy API] Successfully fetched data from external API');
      return NextResponse.json(data);

    } catch (fetchError) {
      console.error('Error fetching from external API:', fetchError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch from external API',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy server error' },
      { status: 500 }
    );
  }
}