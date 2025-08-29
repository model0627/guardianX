'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  TrendingDown,
  Server,
  Database,
  Laptop,
  Smartphone,
  Router,
  Activity,
  FileText,
  Settings,
  Users,
  BarChart3,
  PieChart,
  Download,
  Filter,
  Calendar,
  RefreshCw,
  Eye,
  AlertCircle,
  Target,
  Zap
} from 'lucide-react';

interface AssetStats {
  totalAssets: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  complianceScore: number;
  lastScanDate: string;
  riskScore: number;
}

interface VulnerabilityTrend {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface AssetCategory {
  type: string;
  count: number;
  vulnerable: number;
  icon: any;
  color: string;
}

export default function AssetAuditPage() {
  const [stats, setStats] = useState<AssetStats>({
    totalAssets: 0,
    criticalVulnerabilities: 0,
    highVulnerabilities: 0,
    complianceScore: 0,
    lastScanDate: '',
    riskScore: 0
  });

  const [vulnerabilityTrends, setVulnerabilityTrends] = useState<VulnerabilityTrend[]>([]);
  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    document.title = '점검 대시보드 - GuardianX';
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsRefreshing(true);
    
    // 시뮬레이션된 데이터 로딩
    setTimeout(() => {
      setStats({
        totalAssets: 1247,
        criticalVulnerabilities: 23,
        highVulnerabilities: 89,
        complianceScore: 87.5,
        lastScanDate: new Date().toISOString(),
        riskScore: 6.8
      });

      setVulnerabilityTrends([
        { date: '2024-08-21', critical: 31, high: 95, medium: 156, low: 89 },
        { date: '2024-08-22', critical: 28, high: 92, medium: 148, low: 93 },
        { date: '2024-08-23', critical: 25, high: 89, medium: 152, low: 87 },
        { date: '2024-08-24', critical: 23, high: 89, medium: 149, low: 91 },
      ]);

      setAssetCategories([
        { type: 'Servers', count: 156, vulnerable: 12, icon: Server, color: 'bg-blue-500' },
        { type: 'Workstations', count: 423, vulnerable: 67, icon: Laptop, color: 'bg-green-500' },
        { type: 'Mobile Devices', count: 234, vulnerable: 23, icon: Smartphone, color: 'bg-purple-500' },
        { type: 'Network Devices', count: 89, vulnerable: 8, icon: Router, color: 'bg-orange-500' },
        { type: 'Databases', count: 45, vulnerable: 3, icon: Database, color: 'bg-red-500' },
        { type: 'IoT Devices', count: 300, vulnerable: 45, icon: Activity, color: 'bg-teal-500' }
      ]);
      
      setIsRefreshing(false);
    }, 1000);
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const getRiskColor = (score: number) => {
    if (score >= 8) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 6) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (score >= 4) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      {/* Top Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">자산 점검 대시보드</h2>
          <span className="text-sm text-gray-500">
            마지막 업데이트: {new Date().toLocaleString('ko-KR')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            새로고침
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4" />
            보고서 내보내기
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">총 자산</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalAssets.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600">+5.2%</span>
            <span className="text-sm text-gray-500 ml-1">지난주 대비</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">치명적 취약점</p>
              <p className="text-3xl font-bold text-red-600">{stats.criticalVulnerabilities}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600">-12.5%</span>
            <span className="text-sm text-gray-500 ml-1">지난주 대비</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">컴플라이언스 점수</p>
              <p className={`text-3xl font-bold ${getComplianceColor(stats.complianceScore)}`}>
                {stats.complianceScore}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600">+2.3%</span>
            <span className="text-sm text-gray-500 ml-1">지난주 대비</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">위험 점수</p>
              <p className="text-3xl font-bold text-orange-600">{stats.riskScore}/10</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className={`px-2 py-1 text-xs rounded-full border ${getRiskColor(stats.riskScore)}`}>
              {stats.riskScore >= 8 ? '높음' : stats.riskScore >= 6 ? '보통' : stats.riskScore >= 4 ? '낮음' : '매우 낮음'}
            </span>
          </div>
        </div>
      </div>

      {/* Charts and Asset Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vulnerability Trends */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">취약점 추이</h3>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select className="text-sm border-gray-300 rounded">
                  <option>지난 7일</option>
                  <option>지난 30일</option>
                  <option>지난 90일</option>
                </select>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {vulnerabilityTrends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(trend.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      Critical: {trend.critical}
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      High: {trend.high}
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      Medium: {trend.medium}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Asset Categories */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">자산 카테고리별 현황</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {assetCategories.map((category, index) => {
                const Icon = category.icon;
                const vulnerabilityRate = (category.vulnerable / category.count) * 100;
                return (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${category.color} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{category.type}</p>
                        <p className="text-sm text-gray-500">{category.count}개 자산</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">{category.vulnerable}개 취약</p>
                      <p className="text-xs text-gray-500">{vulnerabilityRate.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">최근 활동</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              모두 보기
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          <div className="p-6 flex items-center gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">새로운 치명적 취약점 발견</p>
              <p className="text-sm text-gray-500">서버 WEB-001에서 CVE-2024-1234 취약점이 발견되었습니다</p>
              <p className="text-xs text-gray-400 mt-1">5분 전</p>
            </div>
            <button className="text-blue-600 hover:text-blue-700 text-sm">
              확인
            </button>
          </div>
          
          <div className="p-6 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">패치 적용 완료</p>
              <p className="text-sm text-gray-500">DB-SERVER-03에 보안 패치가 성공적으로 적용되었습니다</p>
              <p className="text-xs text-gray-400 mt-1">23분 전</p>
            </div>
            <button className="text-blue-600 hover:text-blue-700 text-sm">
              상세보기
            </button>
          </div>
          
          <div className="p-6 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">컴플라이언스 스캔 완료</p>
              <p className="text-sm text-gray-500">전체 시스템에 대한 PCI DSS 컴플라이언스 스캔이 완료되었습니다</p>
              <p className="text-xs text-gray-400 mt-1">1시간 전</p>
            </div>
            <button className="text-blue-600 hover:text-blue-700 text-sm">
              보고서 보기
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">빠른 스캔</span>
          </div>
          <p className="text-sm text-gray-500">즉시 취약점 스캔 실행</p>
        </button>
        
        <button className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-green-600" />
            <span className="font-medium text-gray-900">보고서 생성</span>
          </div>
          <p className="text-sm text-gray-500">감사 보고서 생성</p>
        </button>
        
        <button className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-gray-900">정책 설정</span>
          </div>
          <p className="text-sm text-gray-500">보안 정책 관리</p>
        </button>
        
        <button className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-5 h-5 text-orange-600" />
            <span className="font-medium text-gray-900">실시간 모니터링</span>
          </div>
          <p className="text-sm text-gray-500">자산 상태 모니터링</p>
        </button>
      </div>
    </div>
  );
}