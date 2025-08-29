'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Bell } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

interface AssetAuditLayoutProps {
  children: React.ReactNode;
}

export default function AssetAuditLayout({ children }: AssetAuditLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getPageTitle = () => {
    const pathParts = pathname.split('/');
    
    if (pathname === '/asset-audit') {
      return '자산 점검 대시보드';
    }
    
    // 자산 점검 하위 페이지 제목 매핑
    const pageTitles: Record<string, string> = {
      'vulnerability-scan': '취약점 스캔',
      'compliance-check': '컴플라이언스 점검', 
      'asset-inventory': '자산 인벤토리',
      'security-assessment': '보안 평가',
      'patch-management': '패치 관리',
      'configuration-audit': '설정 감사',
      'risk-assessment': '위험 평가',
      'reports': '감사 보고서'
    };
    
    if (pathParts.length >= 3) {
      return pageTitles[pathParts[2]] || '자산 점검';
    }
    
    return '자산 점검';
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 공통 사이드바 */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* 상단 헤더 */}
        <header className="bg-white shadow-sm border-b border-gray-200 lg:shadow-none">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* 모바일 메뉴 버튼 */}
              <button
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* 페이지 제목 */}
              <div className="flex-1 lg:ml-0">
                <h1 className="text-xl font-semibold text-gray-900">
                  {getPageTitle()}
                </h1>
              </div>

              {/* 헤더 우측 액션들 */}
              <div className="flex items-center space-x-4">
                <button className="p-2 text-gray-400 hover:text-gray-500">
                  <Bell className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* 콘텐츠 */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}