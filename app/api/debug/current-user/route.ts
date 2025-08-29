import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken, getUserWithTenant } from '@/lib/auth';

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
    let userWithTenant = user;
    if (!user.tenantId) {
      const dbUser = await getUserWithTenant(user.userId);
      if (dbUser) {
        userWithTenant = { ...user, tenantId: dbUser.tenantId };
      }
    }

    return NextResponse.json({ 
      user: userWithTenant,
      debug: {
        tokenUserId: user.userId,
        tokenTenantId: user.tenantId,
        dbTenantId: userWithTenant.tenantId
      }
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}