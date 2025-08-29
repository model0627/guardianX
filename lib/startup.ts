// 애플리케이션 시작 시 실행되는 초기화 함수들
import { startServerAutoSync } from './cron-scheduler';

let isInitialized = false;

export function initializeServer() {
  if (isInitialized) {
    console.log('[Startup] Server already initialized');
    return;
  }

  console.log('[Startup] Initializing server...');
  
  try {
    // 서버 사이드 자동 동기화 스케줄러 시작
    startServerAutoSync();
    
    isInitialized = true;
    console.log('[Startup] Server initialization completed successfully');
  } catch (error) {
    console.error('[Startup] Error during server initialization:', error);
  }
}

// 서버 종료 시 정리 작업
export function cleanupServer() {
  console.log('[Startup] Cleaning up server...');
  // 필요한 경우 정리 작업 추가
}