'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Save,
  Play,
  Pause,
  BarChart3,
  Activity,
  Server,
  Shield,
  AlertCircle,
  Target,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  Hash,
  Tag,
  ExternalLink,
  Download,
  RefreshCw
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

interface AssessmentResult {
  id: string;
  item_id: string;
  status: 'not_checked' | 'pass' | 'fail' | 'skip' | 'not_applicable';
  score: number;
  score_possible: number;
  finding?: string;
  evidence?: string;
  code: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  remediation: string;
  reference_links?: string[];
}

interface AssessmentDetail {
  id: string;
  asset_id: string;
  asset_name: string;
  asset_type: string;
  assessment_name: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  checklist_name: string;
  checklist_version: string;
  checklist_description?: string;
  created_by_name: string;
  created_at: string;
  stats: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    not_applicable: number;
    not_checked: number;
    progress: number;
    score: number;
  };
}

export default function AssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [resultsByCategory, setResultsByCategory] = useState<Record<string, AssessmentResult[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [editingResult, setEditingResult] = useState<string | null>(null);
  const [tempResults, setTempResults] = useState<Record<string, any>>({});

  useEffect(() => {
    if (assessmentId) {
      loadAssessmentDetail();
    }
  }, [assessmentId]);

  const loadAssessmentDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/asset-assessments/${assessmentId}`);
      
      if (response.ok) {
        const data = await response.json();
        setAssessment(data.assessment);
        setResults(data.results || []);
        setResultsByCategory(data.resultsByCategory || {});
        
        // 모든 카테고리 확장
        setExpandedCategories(Object.keys(data.resultsByCategory || {}));
      } else {
        toast.error('점검 정보를 불러올 수 없습니다.');
        router.push('/asset-audit/assessment-results');
      }
    } catch (error) {
      console.error('Error loading assessment detail:', error);
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = async () => {
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
        loadAssessmentDetail();
      } else {
        toast.error('점검 시작에 실패했습니다.');
      }
    } catch (error) {
      toast.error('점검 시작 중 오류가 발생했습니다.');
    }
  };

  const handleSaveResult = async (resultId: string) => {
    try {
      const tempResult = tempResults[resultId];
      if (!tempResult) return;

      // 여기서 개별 결과 업데이트 API를 호출해야 합니다
      // 현재는 전체 점검 업데이트 API만 있으므로 임시로 로컬 상태만 업데이트
      setResults(prev => prev.map(r => 
        r.id === resultId ? {
          ...r,
          status: tempResult.status,
          finding: tempResult.finding,
          evidence: tempResult.evidence,
          score: tempResult.status === 'pass' ? r.score_possible : 0
        } : r
      ));

      // 카테고리별 결과도 업데이트
      setResultsByCategory(prev => {
        const newResults = { ...prev };
        Object.keys(newResults).forEach(category => {
          newResults[category] = newResults[category].map(r =>
            r.id === resultId ? {
              ...r,
              status: tempResult.status,
              finding: tempResult.finding,
              evidence: tempResult.evidence,
              score: tempResult.status === 'pass' ? r.score_possible : 0
            } : r
          );
        });
        return newResults;
      });

      setEditingResult(null);
      setTempResults(prev => {
        const newTemp = { ...prev };
        delete newTemp[resultId];
        return newTemp;
      });

      toast.success('점검 결과가 저장되었습니다.');
    } catch (error) {
      toast.error('결과 저장 중 오류가 발생했습니다.');
    }
  };

  const startEditing = (result: AssessmentResult) => {
    setEditingResult(result.id);
    setTempResults(prev => ({
      ...prev,
      [result.id]: {
        status: result.status,
        finding: result.finding || '',
        evidence: result.evidence || ''
      }
    }));
  };

  const cancelEditing = (resultId: string) => {
    setEditingResult(null);
    setTempResults(prev => {
      const newTemp = { ...prev };
      delete newTemp[resultId];
      return newTemp;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'fail': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'skip': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'not_applicable': return <Eye className="w-4 h-4 text-gray-400" />;
      case 'not_checked': return <Clock className="w-4 h-4 text-gray-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pass': return '통과';
      case 'fail': return '실패';
      case 'skip': return '건너뜀';
      case 'not_applicable': return '해당없음';
      case 'not_checked': return '미점검';
      default: return status;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'critical': return '심각';
      case 'high': return '높음';
      case 'medium': return '보통';
      case 'low': return '낮음';
      case 'info': return '정보';
      default: return severity;
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">점검을 찾을 수 없습니다</h3>
          <button
            onClick={() => router.push('/asset-audit/assessment-results')}
            className="text-orange-600 hover:text-orange-800"
          >
            점검 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/asset-audit/assessment-results')}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Target className="w-8 h-8 text-orange-500" />
                  {assessment.assessment_name}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {assessment.asset_name} ({assessment.asset_type}) • {assessment.checklist_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadAssessmentDetail}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              {assessment.status === 'pending' && (
                <button
                  onClick={handleStartAssessment}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  점검 시작
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 점검 개요 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* 기본 정보 */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">점검 정보</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">상태</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(assessment.status)}
                  <span className="font-medium">
                    {assessment.status === 'pending' ? '대기 중' : 
                     assessment.status === 'in_progress' ? '진행 중' :
                     assessment.status === 'completed' ? '완료' : '실패'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">생성일</p>
                <p className="font-medium mt-1">
                  {new Date(assessment.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">체크리스트</p>
                <p className="font-medium mt-1">
                  {assessment.checklist_name} v{assessment.checklist_version}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">생성자</p>
                <p className="font-medium mt-1">{assessment.created_by_name}</p>
              </div>
              {assessment.started_at && (
                <div>
                  <p className="text-sm text-gray-500">시작 시간</p>
                  <p className="font-medium mt-1">
                    {new Date(assessment.started_at).toLocaleString()}
                  </p>
                </div>
              )}
              {assessment.completed_at && (
                <div>
                  <p className="text-sm text-gray-500">완료 시간</p>
                  <p className="font-medium mt-1">
                    {new Date(assessment.completed_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 통계 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">점검 통계</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>진행률</span>
                  <span>{assessment.stats.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${assessment.stats.progress}%` }}
                  ></div>
                </div>
              </div>

              {assessment.stats.progress > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>점수</span>
                    <span>{assessment.stats.score}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        assessment.stats.score >= 80 ? 'bg-green-500' :
                        assessment.stats.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${assessment.stats.score}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>통과: {assessment.stats.passed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span>실패: {assessment.stats.failed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span>건너뜀: {assessment.stats.skipped}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>미점검: {assessment.stats.not_checked}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 점검 항목 결과 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">점검 항목 결과</h2>
            <p className="text-sm text-gray-500 mt-1">
              총 {assessment.stats.total}개 항목
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {Object.entries(resultsByCategory).map(([category, categoryResults]) => (
              <div key={category} className="p-0">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {expandedCategories.includes(category) ? 
                      <ChevronDown className="w-4 h-4" /> : 
                      <ChevronRight className="w-4 h-4" />
                    }
                    <h3 className="font-medium text-gray-900">{category}</h3>
                    <span className="text-sm text-gray-500">({categoryResults.length}개 항목)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {categoryResults.filter(r => r.status === 'pass').length}
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <XCircle className="w-3 h-3 text-red-500" />
                      {categoryResults.filter(r => r.status === 'fail').length}
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {categoryResults.filter(r => r.status === 'not_checked').length}
                    </div>
                  </div>
                </button>

                {expandedCategories.includes(category) && (
                  <div className="px-6 pb-4 space-y-4">
                    {categoryResults.map((result) => (
                      <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-mono font-medium text-gray-500">
                                {result.code}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(result.severity)}`}>
                                {getSeverityText(result.severity)}
                              </span>
                            </div>
                            <h4 className="font-medium text-gray-900 mb-1">{result.title}</h4>
                            <p className="text-sm text-gray-600">{result.description}</p>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {getStatusIcon(result.status)}
                            <span className="text-sm font-medium">
                              {getStatusText(result.status)}
                            </span>
                          </div>
                        </div>

                        {/* 점검 결과 편집 */}
                        {assessment.status !== 'completed' && assessment.status !== 'pending' && (
                          <div className="border-t border-gray-100 pt-4 mt-4">
                            {editingResult === result.id ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      점검 결과 *
                                    </label>
                                    <select
                                      value={tempResults[result.id]?.status || result.status}
                                      onChange={(e) => setTempResults(prev => ({
                                        ...prev,
                                        [result.id]: {
                                          ...prev[result.id],
                                          status: e.target.value
                                        }
                                      }))}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                                    >
                                      <option value="not_checked">미점검</option>
                                      <option value="pass">통과</option>
                                      <option value="fail">실패</option>
                                      <option value="skip">건너뜀</option>
                                      <option value="not_applicable">해당없음</option>
                                    </select>
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    발견 사항
                                  </label>
                                  <textarea
                                    value={tempResults[result.id]?.finding || ''}
                                    onChange={(e) => setTempResults(prev => ({
                                      ...prev,
                                      [result.id]: {
                                        ...prev[result.id],
                                        finding: e.target.value
                                      }
                                    }))}
                                    placeholder="점검 과정에서 발견된 사항을 기록하세요"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                                    rows={3}
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    증거/참고자료
                                  </label>
                                  <textarea
                                    value={tempResults[result.id]?.evidence || ''}
                                    onChange={(e) => setTempResults(prev => ({
                                      ...prev,
                                      [result.id]: {
                                        ...prev[result.id],
                                        evidence: e.target.value
                                      }
                                    }))}
                                    placeholder="스크린샷 경로, 로그 파일, 설정 정보 등을 기록하세요"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                                    rows={2}
                                  />
                                </div>

                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => cancelEditing(result.id)}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                                  >
                                    취소
                                  </button>
                                  <button
                                    onClick={() => handleSaveResult(result.id)}
                                    className="px-3 py-1 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 flex items-center gap-1"
                                  >
                                    <Save className="w-3 h-3" />
                                    저장
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {result.finding && (
                                  <div className="mb-2">
                                    <p className="text-xs text-gray-500 mb-1">발견 사항:</p>
                                    <p className="text-sm text-gray-700">{result.finding}</p>
                                  </div>
                                )}
                                {result.evidence && (
                                  <div className="mb-2">
                                    <p className="text-xs text-gray-500 mb-1">증거/참고자료:</p>
                                    <p className="text-sm text-gray-700">{result.evidence}</p>
                                  </div>
                                )}
                                <button
                                  onClick={() => startEditing(result)}
                                  className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                                >
                                  점검 결과 수정
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 조치 방법 */}
                        <div className="border-t border-gray-100 pt-4 mt-4">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">조치 방법</h5>
                          <p className="text-sm text-gray-600">{result.remediation}</p>
                          
                          {result.reference_links && result.reference_links.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-gray-500 mb-1">참고 자료:</p>
                              <div className="flex flex-wrap gap-2">
                                {result.reference_links.map((link, index) => (
                                  <span key={index} className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    {link}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}