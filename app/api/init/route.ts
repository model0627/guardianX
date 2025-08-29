import { NextRequest, NextResponse } from 'next/server';
import { initializeServer } from '@/lib/startup';

// 서버 초기화 API (애플리케이션 시작 시 한 번 호출)
export async function GET(request: NextRequest) {
  try {
    initializeServer();
    
    return NextResponse.json({
      success: true,
      message: '서버 초기화가 완료되었습니다.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Server initialization error:', error);
    return NextResponse.json(
      { error: '서버 초기화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}