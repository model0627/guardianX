'use client';

import { useState, useEffect } from 'react';
import { 
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  Trash2,
  Plus,
  Filter,
  Search,
  Download,
  RefreshCw,
  BarChart3,
  Activity,
  Server,
  Shield,
  AlertCircle,
  FileText,
  Calendar,
  User,
  ChevronRight,
  ChevronDown,
  Settings,
  Target
} from 'lucide-react';

// Toast 알림 시스템
const toast = {
  success: (message: string) => {
    const toastEl = document.createElement('div');
    toastEl.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => document.body.removeChild(toastEl), 3000);
  },
  error: (message: string) => {
    const toastEl = document.createElement('div');
    toastEl.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => document.body.removeChild(toastEl), 3000);
  }
};

interface AssetAssessment {
  id: string;
  asset_id: string;
  asset_name: string;
  asset_type: string;
  assessment_name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  total_items: number;
  passed_items: number;
  failed_items: number;
  skipped_items: number;
  overall_score?: number;
  risk_level?: 'critical' | 'high' | 'medium' | 'low';
  created_at: string;
  checklist_name: string;
  checklist_version: string;
  created_by_name: string;
  progress_percentage: number;
}

interface AssetDevice {
  id: string;
  name: string;
  type: string;
  ip_addresses?: string;
  rack_name?: string;
  server_room_name?: string;
  office_name?: string;
}

interface AssessmentChecklist {
  id: string;
  name: string;
  version: string;
  category: string;
  item_count: number;
}

export default function AssessmentResultsPage() {
  const [assessments, setAssessments] = useState<AssetAssessment[]>([]);
  const [assets, setAssets] = useState<AssetDevice[]>([]);
  const [checklists, setChecklists] = useState<AssessmentChecklist[]>([]);
  const [checklistsLoading, setChecklistsLoading] = useState(false);
  const [checklistsError, setChecklistsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [selectedChecklist, setSelectedChecklist] = useState('');
  const [assessmentName, setAssessmentName] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards');

  useEffect(() => {
    document.title = '점검 결과 관리 - GuardianX';
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setChecklistsLoading(true);
      setChecklistsError('');
      
      const [assessmentsResponse, assetsResponse, checklistsResponse] = await Promise.all([
        fetch('/api/asset-assessments'),
        fetch('/api/ipam/devices'),
        fetch('/api/assessment-checklists')
      ]);

      if (assessmentsResponse.ok) {
        const assessmentsData = await assessmentsResponse.json();
        setAssessments(assessmentsData.assessments || []);
      }

      if (assetsResponse.ok) {
        const assetsData = await assetsResponse.json();
        setAssets(assetsData.devices || []);
      }

      if (checklistsResponse.ok) {
        const checklistsData = await checklistsResponse.json();
        console.log('[Frontend] Raw checklists data:', checklistsData);
        const activeChecklists = checklistsData.checklists?.filter((c: any) => c.status === 'active' || c.status === 'draft') || [];
        console.log('[Frontend] Active checklists:', activeChecklists);
        setChecklists(activeChecklists);
        setChecklistsError('');
      } else {
        const errorText = await checklistsResponse.text();
        console.error('[Frontend] Checklists API failed:', checklistsResponse.status, errorText);
        setChecklistsError(`API 오류 (${checklistsResponse.status}): ${errorText}`);
        setChecklists([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setChecklistsError(error instanceof Error ? error.message : '알 수 없는 오류');
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setChecklistsLoading(false);
    }
  };

  const handleCreateAssessment = async () => {
    if (!selectedChecklist || selectedAssets.length === 0) {
      toast.error('체크리스트와 대상 자산을 선택해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/asset-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist_id: selectedChecklist,
          asset_ids: selectedAssets,
          assessment_name: assessmentName
        })
      });

      if (response.ok) {
        toast.success('자산 점검이 성공적으로 생성되었습니다.');
        setShowCreateModal(false);
        setSelectedAssets([]);
        setSelectedChecklist('');
        setAssessmentName('');
        loadData();
      } else {
        const error = await response.json();
        toast.error(error.error || '점검 생성에 실패했습니다.');
      }
    } catch (error) {
      toast.error('점검 생성 중 오류가 발생했습니다.');
    }
  };

  const handleStartAssessment = async (assessmentId: string) => {
    try {
      const response = await fetch('/api/asset-assessments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_id: assessmentId,
          status: 'in_progress'
        })
      });

      if (response.ok) {
        toast.success('점검이 시작되었습니다.');
        loadData();
      } else {
        toast.error('점검 시작에 실패했습니다.');
      }
    } catch (error) {
      toast.error('점검 시작 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/asset-assessments/${assessmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('점검이 성공적으로 삭제되었습니다.');
        loadData();
      } else {
        const error = await response.json();
        toast.error(error.error || '점검 삭제에 실패했습니다.');
      }
    } catch (error) {
      toast.error('점검 삭제 중 오류가 발생했습니다.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-gray-500" />;
      case 'in_progress': return <Activity className="w-4 h-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기 중';
      case 'in_progress': return '진행 중';
      case 'completed': return '완료';
      case 'failed': return '실패';
      default: return status;
    }
  };

  const getRiskLevelColor = (level?: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskLevelText = (level?: string) => {
    switch (level) {
      case 'critical': return '심각';
      case 'high': return '높음';
      case 'medium': return '보통';
      case 'low': return '낮음';
      default: return '미평가';
    }
  };

  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = assessment.assessment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assessment.asset_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || assessment.status === statusFilter;
    const matchesRisk = riskFilter === 'all' || assessment.risk_level === riskFilter;
    return matchesSearch && matchesStatus && matchesRisk;
  });

  // 통계 계산
  const stats = {
    total: assessments.length,
    pending: assessments.filter(a => a.status === 'pending').length,
    in_progress: assessments.filter(a => a.status === 'in_progress').length,
    completed: assessments.filter(a => a.status === 'completed').length,
    failed: assessments.filter(a => a.status === 'failed').length,
    average_score: assessments.filter(a => a.overall_score).length > 0 
      ? Math.round(assessments.filter(a => a.overall_score).reduce((sum, a) => sum + (a.overall_score || 0), 0) / assessments.filter(a => a.overall_score).length)
      : 0
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Target className="w-8 h-8 text-orange-500" />
                자산 점검 결과
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                IPAM 자산에 대한 보안 점검 실행 및 결과를 관리합니다
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'cards' : 'list')}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {viewMode === 'list' ? <BarChart3 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </button>
              <button
                onClick={loadData}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                새 점검 생성
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 통계 대시보드 */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 점검</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Target className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">대기 중</p>
                <p className="text-2xl font-bold text-gray-500">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">진행 중</p>
                <p className="text-2xl font-bold text-blue-600">{stats.in_progress}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">완료</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">실패</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">평균 점수</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.average_score}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-indigo-400" />
            </div>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="점검명 또는 자산명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">모든 상태</option>
                <option value="pending">대기 중</option>
                <option value="in_progress">진행 중</option>
                <option value="completed">완료</option>
                <option value="failed">실패</option>
              </select>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">모든 위험도</option>
                <option value="critical">심각</option>
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>
          </div>
        </div>

        {/* 점검 결과 목록 */}
        {filteredAssessments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">점검 결과가 없습니다</h3>
            <p className="text-gray-500 mb-4">
              {assessments.length === 0 
                ? '아직 실행된 점검이 없습니다. 새 점검을 생성해보세요.'
                : '검색 조건에 맞는 점검 결과가 없습니다.'
              }
            </p>
            {assessments.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md"
              >
                새 점검 생성
              </button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'cards' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredAssessments.map((assessment) => (
              <div key={assessment.id} className={viewMode === 'cards' ? 'bg-white rounded-lg shadow-sm border p-6' : 'bg-white rounded-lg shadow-sm border p-4 flex items-center justify-between'}>
                {viewMode === 'cards' ? (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 rounded-lg">
                          <Server className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 truncate max-w-48">
                            {assessment.assessment_name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {assessment.asset_name} ({assessment.asset_type})
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(assessment.status)}
                        <span className="text-xs font-medium">
                          {getStatusText(assessment.status)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">체크리스트</span>
                        <span className="font-medium">{assessment.checklist_name}</span>
                      </div>
                      
                      {assessment.status !== 'pending' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">진행률</span>
                            <span className="font-medium">{assessment.progress_percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full transition-all"
                              style={{ width: `${assessment.progress_percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {assessment.overall_score !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">점수</span>
                          <span className="font-medium">{assessment.overall_score}%</span>
                        </div>
                      )}

                      {assessment.risk_level && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">위험도</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(assessment.risk_level)}`}>
                            {getRiskLevelText(assessment.risk_level)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">생성일</span>
                        <span className="font-medium">
                          {new Date(assessment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          {assessment.passed_items}
                        </div>
                        <div className="flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-red-500" />
                          {assessment.failed_items}
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-yellow-500" />
                          {assessment.skipped_items}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {assessment.status === 'pending' && (
                          <button
                            onClick={() => handleStartAssessment(assessment.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            시작
                          </button>
                        )}
                        <button
                          onClick={() => window.location.href = `/asset-audit/assessment-results/${assessment.id}`}
                          className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                        >
                          상세보기
                        </button>
                        {assessment.status !== 'in_progress' && (
                          <button
                            onClick={() => handleDeleteAssessment(assessment.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(assessment.status)}
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {assessment.assessment_name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {assessment.asset_name} • {assessment.checklist_name}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      {assessment.overall_score !== undefined && (
                        <div className="text-right">
                          <p className="text-sm text-gray-500">점수</p>
                          <p className="font-medium">{assessment.overall_score}%</p>
                        </div>
                      )}
                      
                      {assessment.risk_level && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(assessment.risk_level)}`}>
                          {getRiskLevelText(assessment.risk_level)}
                        </span>
                      )}
                      
                      <div className="flex items-center gap-2">
                        {assessment.status === 'pending' && (
                          <button
                            onClick={() => handleStartAssessment(assessment.id)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="시작"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => window.location.href = `/asset-audit/assessment-results/${assessment.id}`}
                          className="p-1 text-orange-600 hover:text-orange-800"
                          title="상세보기"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {assessment.status !== 'in_progress' && (
                          <button
                            onClick={() => handleDeleteAssessment(assessment.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 새 점검 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">새 자산 점검 생성</h2>
              <p className="text-sm text-gray-500 mt-1">
                IPAM 자산을 선택하고 점검할 체크리스트를 지정하세요
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* 체크리스트 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  점검 체크리스트 선택 * ({checklists.length}개 사용 가능)
                </label>
                <select
                  value={selectedChecklist}
                  onChange={(e) => setSelectedChecklist(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">체크리스트를 선택하세요</option>
                  {checklists.map((checklist) => (
                    <option key={checklist.id} value={checklist.id}>
                      {checklist.name} v{checklist.version} ({checklist.item_count}개 항목)
                    </option>
                  ))}
                </select>
                {checklistsLoading && (
                  <p className="text-sm text-gray-500 mt-1">
                    체크리스트를 불러오는 중...
                  </p>
                )}
                {!checklistsLoading && checklistsError && (
                  <p className="text-sm text-red-500 mt-1">
                    {checklistsError}
                  </p>
                )}
                {!checklistsLoading && !checklistsError && checklists.length === 0 && (
                  <p className="text-sm text-orange-500 mt-1">
                    사용 가능한 체크리스트가 없습니다.
                  </p>
                )}
              </div>

              {/* 점검명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  점검명 (선택사항)
                </label>
                <input
                  type="text"
                  value={assessmentName}
                  onChange={(e) => setAssessmentName(e.target.value)}
                  placeholder="비워두면 자동으로 생성됩니다"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* 자산 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  점검 대상 자산 선택 * ({selectedAssets.length}개 선택)
                </label>
                <div className="border border-gray-300 rounded-md max-h-64 overflow-y-auto">
                  {assets.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      사용 가능한 자산이 없습니다.
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {assets.map((asset) => (
                        <label key={asset.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedAssets.includes(asset.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAssets([...selectedAssets, asset.id]);
                              } else {
                                setSelectedAssets(selectedAssets.filter(id => id !== asset.id));
                              }
                            }}
                            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{asset.name}</div>
                            <div className="text-sm text-gray-500">
                              {asset.type} • {asset.ip_addresses || 'IP 없음'}
                              {asset.office_name && ` • ${asset.office_name}`}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedAssets([]);
                  setSelectedChecklist('');
                  setAssessmentName('');
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCreateAssessment}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm"
              >
                점검 생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}