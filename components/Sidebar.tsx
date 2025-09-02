'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Shield, 
  Building2, 
  Users, 
  LogOut, 
  X,
  Server,
  Activity,
  FileText,
  Database,
  Settings,
  BarChart3,
  ChevronRight,
  ChevronDown,
  Network,
  Package,
  UserCheck,
  Bell,
  AlertTriangle,
  Eye,
  Zap,
  Brain,
  TrendingUp,
  Target,
  Search,
  CheckCircle,
  Clipboard,
  Lock,
  Wrench,
  PieChart
} from 'lucide-react';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

interface TenantInfo {
  id: string;
  name: string;
  domain: string;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentTenant, setCurrentTenant] = useState<TenantInfo | null>(null);
  const [otherTenants, setOtherTenants] = useState<TenantInfo[]>([]);
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [ipamMenuOpen, setIpamMenuOpen] = useState(pathname.startsWith('/ipam'));
  const [soarMenuOpen, setSoarMenuOpen] = useState(pathname.startsWith('/soar'));
  const [assetAuditMenuOpen, setAssetAuditMenuOpen] = useState(pathname.startsWith('/asset-audit'));

  useEffect(() => {
    fetchCurrentTenant();
  }, []);

  useEffect(() => {
    // 경로에 따라 메뉴 상태 설정
    setIpamMenuOpen(pathname.startsWith('/ipam'));
    setSoarMenuOpen(pathname.startsWith('/soar'));
    setAssetAuditMenuOpen(pathname.startsWith('/asset-audit'));
  }, [pathname]);

  const fetchCurrentTenant = async () => {
    try {
      const response = await fetch('/api/user/current-tenant', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentTenant(data.tenant);
        setOtherTenants(data.otherTenants || []);
      }
    } catch (error) {
      console.error('Failed to fetch tenant info:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleTenantSwitch = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/tenants/${tenantId}/switch`, {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to switch tenant:', error);
    }
  };

  // IPAM 하위 메뉴 항목들
  const ipamMenuItems = [
    {
      id: 'offices',
      name: '사무실',
      icon: Building2,
      href: '/ipam/offices'
    },
    {
      id: 'server-rooms',
      name: '서버실',
      icon: Server,
      href: '/ipam/server-rooms'
    },
    {
      id: 'racks',
      name: '랙',
      icon: Database,
      href: '/ipam/racks'
    },
    {
      id: 'ip-ranges',
      name: 'IP 대역',
      icon: Network,
      href: '/ipam/ip-ranges'
    },
    {
      id: 'ip-addresses',
      name: 'IP 주소',
      icon: Activity,
      href: '/ipam/ip-addresses'
    },
    {
      id: 'devices',
      name: '디바이스',
      icon: Server,
      href: '/ipam/devices'
    },
    {
      id: 'library',
      name: '라이브러리',
      icon: Package,
      href: '/ipam/library'
    },
    {
      id: 'contacts',
      name: '담당자',
      icon: Users,
      href: '/ipam/contacts'
    }
  ];

  // SOAR 하위 메뉴 항목들
  const soarMenuItems = [
    {
      id: 'dashboard',
      name: '보안 대시보드',
      icon: Shield,
      href: '/soar'
    },
    {
      id: 'events',
      name: '위협 이벤트',
      icon: AlertTriangle,
      href: '/soar/events'
    },
    {
      id: 'playbooks',
      name: '자동 대응',
      icon: Zap,
      href: '/soar/playbooks'
    },
    {
      id: 'threat-intel',
      name: '위협 인텔리전스',
      icon: Brain,
      href: '/soar/threat-intelligence'
    },
    {
      id: 'incidents',
      name: '인시던트 관리',
      icon: Target,
      href: '/soar/incidents'
    },
    {
      id: 'analytics',
      name: '보안 분석',
      icon: TrendingUp,
      href: '/soar/analytics'
    }
  ];

  // 자산 점검 하위 메뉴 항목들
  const assetAuditMenuItems = [
    {
      id: 'dashboard',
      name: '점검 대시보드',
      icon: BarChart3,
      href: '/asset-audit'
    },
    {
      id: 'assessment-items',
      name: '평가 항목 관리',
      icon: Clipboard,
      href: '/asset-audit/assessment-items'
    },
    {
      id: 'assessment-results',
      name: '점검 결과 관리',
      icon: Target,
      href: '/asset-audit/assessment-results'
    },
    {
      id: 'vulnerability-scan',
      name: '취약점 스캔',
      icon: Search,
      href: '/asset-audit/vulnerability-scan'
    },
    {
      id: 'compliance-check',
      name: '컴플라이언스 점검',
      icon: CheckCircle,
      href: '/asset-audit/compliance-check'
    },
    {
      id: 'asset-inventory',
      name: '자산 인벤토리',
      icon: Database,
      href: '/asset-audit/asset-inventory'
    },
    {
      id: 'security-assessment',
      name: '보안 평가',
      icon: Lock,
      href: '/asset-audit/security-assessment'
    },
    {
      id: 'patch-management',
      name: '패치 관리',
      icon: Wrench,
      href: '/asset-audit/patch-management'
    },
    {
      id: 'configuration-audit',
      name: '설정 감사',
      icon: Settings,
      href: '/asset-audit/configuration-audit'
    },
    {
      id: 'risk-assessment',
      name: '위험 평가',
      icon: AlertTriangle,
      href: '/asset-audit/risk-assessment'
    },
    {
      id: 'reports',
      name: '감사 보고서',
      icon: FileText,
      href: '/asset-audit/reports'
    }
  ];

  return (
    <aside className={`bg-white shadow-lg transition-all duration-300 ${
      sidebarOpen ? 'w-64' : 'w-64'
    } lg:block ${sidebarOpen ? 'fixed inset-y-0 left-0 z-50 lg:relative' : 'hidden'}`}>
      
      {/* 헤더 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">GuardianX</h2>
              <p className="text-xs text-gray-500">
                {pathname.startsWith('/ipam') ? 'IPAM' : 
                 pathname.startsWith('/soar') ? 'SOAR' : 
                 pathname.startsWith('/asset-audit') ? 'AUDIT' : 'System'}
              </p>
            </div>
          </div>
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 테넌트 정보 */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <button
            onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
            className="w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="font-medium text-gray-900">
                  {currentTenant?.name || '테넌트 선택'}
                </div>
                <div className="text-xs text-gray-500">
                  {currentTenant?.domain || 'domain.com'}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
                tenantDropdownOpen ? 'rotate-180' : ''
              }`} />
            </div>
          </button>

          {tenantDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              {otherTenants.length > 0 && (
                <>
                  <div className="p-2 border-b border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">테넌트 전환</p>
                    {otherTenants.map((tenant) => (
                      <button
                        key={tenant.id}
                        onClick={() => {
                          handleTenantSwitch(tenant.id);
                          setTenantDropdownOpen(false);
                        }}
                        className="w-full p-2 text-left hover:bg-gray-50 rounded text-sm"
                      >
                        <div className="font-medium">{tenant.name}</div>
                        <div className="text-xs text-gray-500">{tenant.domain}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}
              
              <div className="p-2">
                <p className="text-xs font-medium text-gray-500 mb-2">관리 메뉴</p>
                <Link 
                  href="/tenants/manage" 
                  className="block p-2 text-left hover:bg-gray-50 rounded text-sm"
                  onClick={() => setTenantDropdownOpen(false)}
                >
                  <div className="flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    테넌트 관리
                  </div>
                </Link>
                <Link 
                  href="/tenants/members" 
                  className="block p-2 text-left hover:bg-gray-50 rounded text-sm"
                  onClick={() => setTenantDropdownOpen(false)}
                >
                  <div className="flex items-center">
                    <UserCheck className="w-4 h-4 mr-2" />
                    멤버 관리
                  </div>
                </Link>
                <Link 
                  href="/tenant-setup" 
                  className="block p-2 text-left hover:bg-gray-50 rounded text-sm"
                  onClick={() => setTenantDropdownOpen(false)}
                >
                  <div className="flex items-center">
                    <Building2 className="w-4 h-4 mr-2" />
                    테넌트 설정
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 네비게이션 메뉴 */}
      <nav className="flex-1 p-4">
        {/* 대시보드 링크 */}
        <div className="mb-4">
          <Link
            href="/dashboard"
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              pathname === '/dashboard' 
                ? 'bg-orange-100 text-orange-700' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <BarChart3 className={`w-5 h-5 ${pathname === '/dashboard' ? 'text-orange-600' : 'text-gray-400'}`} />
            <span className="truncate flex-1 text-left">메인 대시보드</span>
          </Link>
        </div>

        {/* IPAM 관리 메뉴 (드롭다운) */}
        <div className="space-y-1">
          <button
            onClick={() => setIpamMenuOpen(!ipamMenuOpen)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              pathname.startsWith('/ipam') 
                ? 'bg-orange-100 text-orange-700' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <Network className={`w-5 h-5 ${pathname.startsWith('/ipam') ? 'text-orange-600' : 'text-gray-400'}`} />
            <span className="truncate flex-1 text-left">IPAM 관리</span>
            {ipamMenuOpen ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {/* IPAM 하위 메뉴들 */}
          {ipamMenuOpen && (
            <div className="ml-6 space-y-1">
              {ipamMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-gray-400'}`} />
                    <span className="truncate flex-1 text-left">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* SOAR 보안 메뉴 (드롭다운) */}
        <div className="space-y-1 mt-4">
          <button
            onClick={() => setSoarMenuOpen(!soarMenuOpen)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              pathname.startsWith('/soar') 
                ? 'bg-orange-100 text-orange-700' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <Shield className={`w-5 h-5 ${pathname.startsWith('/soar') ? 'text-orange-600' : 'text-gray-400'}`} />
            <span className="truncate flex-1 text-left">SOAR 보안</span>
            {soarMenuOpen ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {/* SOAR 하위 메뉴들 */}
          {soarMenuOpen && (
            <div className="ml-6 space-y-1">
              {soarMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/soar' && pathname.startsWith(item.href + '/'));
                
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-gray-400'}`} />
                    <span className="truncate flex-1 text-left">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* 자산 점검 메뉴 (드롭다운) */}
        <div className="space-y-1 mt-4">
          <button
            onClick={() => setAssetAuditMenuOpen(!assetAuditMenuOpen)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              pathname.startsWith('/asset-audit') 
                ? 'bg-orange-100 text-orange-700' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <Search className={`w-5 h-5 ${pathname.startsWith('/asset-audit') ? 'text-orange-600' : 'text-gray-400'}`} />
            <span className="truncate flex-1 text-left">자산 점검</span>
            {assetAuditMenuOpen ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {/* 자산 점검 하위 메뉴들 */}
          {assetAuditMenuOpen && (
            <div className="ml-6 space-y-1">
              {assetAuditMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/asset-audit' && pathname.startsWith(item.href + '/'));
                
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-gray-400'}`} />
                    <span className="truncate flex-1 text-left">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* 로그아웃 버튼 - 최하단 고정 */}
      <div className="mt-auto p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 text-gray-400" />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}