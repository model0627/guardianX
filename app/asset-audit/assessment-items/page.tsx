'use client';

import { useState, useEffect } from 'react';
import { 
  Plus,
  Edit,
  Trash2,
  Copy,
  Save,
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  FileText,
  Filter,
  Search,
  Download,
  Upload,
  Settings,
  Shield,
  Package,
  Tag,
  Clock,
  History,
  GitBranch,
  Users,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  List,
  Grid,
  Folder,
  FolderOpen,
  CheckSquare,
  Square,
  Hash,
  Calendar,
  User,
  AlertCircle,
  Zap
} from 'lucide-react';

// Toast 알림 커스텀 훅
// 실제 프로젝트에서는 react-hot-toast나 react-toastify를 사용
const toast = {
  success: (message: string) => {
    const toastEl = document.createElement('div');
    toastEl.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-[9999] transition-all duration-300';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    
    setTimeout(() => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(toastEl);
      }, 300);
    }, 3000);
  },
  error: (message: string) => {
    const toastEl = document.createElement('div');
    toastEl.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-[9999] transition-all duration-300';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    
    setTimeout(() => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(toastEl);
      }, 300);
    }, 3000);
  }
};

interface AssessmentItem {
  id: string;
  code: string; // 항목 코드 (예: SEC-001)
  category: string; // 대분류
  subcategory: string; // 중분류
  title: string; // 항목명
  description: string; // 설명
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'; // 중요도
  version: string; // 버전
  status: 'active' | 'deprecated' | 'draft'; // 상태
  compliance_standards: string[]; // 준수 표준 (ISO27001, ISMS-P 등)
  check_type: 'manual' | 'automated' | 'hybrid'; // 점검 방식
  remediation: string; // 조치 방법
  references: string[]; // 참고 자료
  created_at: string;
  updated_at: string;
  created_by: string;
  tags: string[];
}

interface AssessmentChecklist {
  id: string;
  name: string; // 체크리스트 이름
  description: string;
  version: string; // 체크리스트 버전
  category: string; // 체크리스트 분류 (서버, 네트워크, 애플리케이션 등)
  item_ids: string[]; // 포함된 항목 ID들
  item_count: number;
  status: 'active' | 'draft' | 'archived';
  compliance_framework?: string; // 준수 프레임워크
  created_at: string;
  updated_at: string;
  created_by: string;
  last_used?: string;
  usage_count: number;
}

interface ItemVersion {
  version: string;
  changes: string;
  updated_at: string;
  updated_by: string;
}

export default function AssessmentItemsPage() {
  const [items, setItems] = useState<AssessmentItem[]>([]);
  const [checklists, setChecklists] = useState<AssessmentChecklist[]>([]);
  const [filteredItems, setFilteredItems] = useState<AssessmentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<AssessmentItem | null>(null);
  const [selectedChecklist, setSelectedChecklist] = useState<AssessmentChecklist | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);
  const [isNewChecklist, setIsNewChecklist] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'items' | 'checklists'>('items');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [selectedItemsForChecklist, setSelectedItemsForChecklist] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<AssessmentItem | null>(null);
  const [editingChecklist, setEditingChecklist] = useState<AssessmentChecklist | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{type: 'item' | 'checklist', id: string} | null>(null);

  useEffect(() => {
    document.title = '평가 항목 관리 - GuardianX';
    loadAssessmentData();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, categoryFilter, severityFilter]);

  const loadAssessmentData = async () => {
    try {
      const [itemsResponse, checklistsResponse] = await Promise.all([
        fetch('/api/assessment-items'),
        fetch('/api/assessment-checklists')
      ]);

      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        setItems(itemsData.items || []);
      } else {
        toast.error('평가 항목을 불러오는데 실패했습니다.');
      }

      if (checklistsResponse.ok) {
        const checklistsData = await checklistsResponse.json();
        setChecklists(checklistsData.checklists || []);
      } else {
        toast.error('체크리스트를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Error loading assessment data:', error);
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
      
      // 오류 발생 시 샘플 데이터 로드
      const sampleItems: AssessmentItem[] = [
        {
          id: '1',
          code: 'SEC-001',
          category: '계정 및 권한 관리',
          subcategory: '계정 관리',
          title: '미사용 계정 점검',
          description: '90일 이상 미사용된 계정이 존재하는지 점검합니다.',
          severity: 'high',
          version: '2.1.0',
          status: 'active',
          compliance_standards: ['ISO27001', 'ISMS-P', 'PCI-DSS'],
          check_type: 'automated',
          remediation: '미사용 계정을 비활성화하거나 삭제하십시오.',
          references: ['ISO27001 A.9.2.5', 'ISMS-P 2.2.1'],
          created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: '관리자',
          tags: ['계정', '접근통제', '필수']
        },
      {
        id: '2',
        code: 'SEC-002',
        category: '계정 및 권한 관리',
        subcategory: '패스워드 정책',
        title: '패스워드 복잡도 정책',
        description: '패스워드가 복잡도 요구사항을 충족하는지 점검합니다.',
        severity: 'critical',
        version: '2.0.0',
        status: 'active',
        compliance_standards: ['ISO27001', 'ISMS-P'],
        check_type: 'automated',
        remediation: '최소 8자 이상, 영문/숫자/특수문자 조합을 사용하도록 설정하십시오.',
        references: ['ISO27001 A.9.4.3'],
        created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: '관리자',
        tags: ['패스워드', '인증', '필수']
      },
      {
        id: '3',
        code: 'NET-001',
        category: '네트워크 보안',
        subcategory: '방화벽 정책',
        title: '불필요한 포트 오픈 점검',
        description: '외부에서 접근 가능한 불필요한 포트가 열려있는지 점검합니다.',
        severity: 'high',
        version: '1.5.0',
        status: 'active',
        compliance_standards: ['ISO27001', 'ISMS-P'],
        check_type: 'automated',
        remediation: '불필요한 포트는 방화벽에서 차단하십시오.',
        references: ['ISO27001 A.13.1.1'],
        created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: '네트워크팀',
        tags: ['네트워크', '방화벽', '포트']
      },
      {
        id: '4',
        code: 'SYS-001',
        category: '시스템 보안',
        subcategory: '패치 관리',
        title: '보안 패치 적용 여부',
        description: '최신 보안 패치가 적용되었는지 점검합니다.',
        severity: 'critical',
        version: '3.0.0',
        status: 'active',
        compliance_standards: ['ISO27001', 'ISMS-P', 'PCI-DSS'],
        check_type: 'hybrid',
        remediation: '제조사에서 제공하는 최신 보안 패치를 적용하십시오.',
        references: ['ISO27001 A.12.6.1'],
        created_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: '시스템팀',
        tags: ['패치', '취약점', '필수']
      },
      {
        id: '5',
        code: 'APP-001',
        category: '애플리케이션 보안',
        subcategory: 'SQL Injection',
        title: 'SQL Injection 취약점',
        description: '웹 애플리케이션의 SQL Injection 취약점을 점검합니다.',
        severity: 'critical',
        version: '1.2.0',
        status: 'active',
        compliance_standards: ['OWASP Top 10', 'PCI-DSS'],
        check_type: 'manual',
        remediation: '파라미터화된 쿼리를 사용하고 입력값 검증을 수행하십시오.',
        references: ['OWASP A03:2021'],
        created_at: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: '개발팀',
        tags: ['웹보안', 'OWASP', 'SQL']
      }
    ];

    // 샘플 체크리스트 데이터
    const sampleChecklists: AssessmentChecklist[] = [
      {
        id: 'cl-001',
        name: '서버 보안 점검 체크리스트 v2.0',
        description: '리눅스/유닉스 서버 보안 점검을 위한 표준 체크리스트',
        version: '2.0.0',
        category: '서버',
        item_ids: ['1', '2', '4'],
        item_count: 35,
        status: 'active',
        compliance_framework: 'ISMS-P',
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: '보안팀',
        last_used: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        usage_count: 145
      },
      {
        id: 'cl-002',
        name: '네트워크 장비 점검 체크리스트',
        description: '라우터, 스위치, 방화벽 등 네트워크 장비 보안 점검',
        version: '1.5.0',
        category: '네트워크',
        item_ids: ['3'],
        item_count: 28,
        status: 'active',
        compliance_framework: 'ISO27001',
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: '네트워크팀',
        last_used: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        usage_count: 89
      },
      {
        id: 'cl-003',
        name: '웹 애플리케이션 보안 체크리스트',
        description: 'OWASP Top 10 기반 웹 애플리케이션 취약점 점검',
        version: '3.1.0',
        category: '애플리케이션',
        item_ids: ['5'],
        item_count: 42,
        status: 'active',
        compliance_framework: 'OWASP',
        created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: '개발보안팀',
        last_used: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        usage_count: 234
      }
    ];
      
      setItems(sampleItems);
      setChecklists([]);
    }
  };

  const filterItems = () => {
    let filtered = items;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(item => item.severity === severityFilter);
    }

    setFilteredItems(filtered);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleItemSelection = (itemId: string) => {
    setSelectedItemsForChecklist(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'info': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return AlertTriangle;
      case 'high': return AlertCircle;
      case 'medium': return Info;
      case 'low': return CheckCircle;
      default: return Info;
    }
  };

  const getCheckTypeColor = (type: string) => {
    switch (type) {
      case 'automated': return 'text-green-600 bg-green-50';
      case 'manual': return 'text-blue-600 bg-blue-50';
      case 'hybrid': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCheckTypeText = (type: string) => {
    switch (type) {
      case 'automated': return '자동';
      case 'manual': return '수동';
      case 'hybrid': return '혼합';
      default: return type;
    }
  };

  // 평가 항목 추가/수정
  const handleSaveItem = async (item: AssessmentItem) => {
    try {
      if (editingItem && editingItem.id) {
        // 수정
        const response = await fetch('/api/assessment-items', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...item,
            reference_links: item.references // API에서는 reference_links 사용
          })
        });

        if (response.ok) {
          const result = await response.json();
          setItems(prev => prev.map(i => i.id === item.id ? {
            ...result.item,
            references: result.item.reference_links // UI에서는 references 사용
          } : i));
          toast.success('평가 항목이 성공적으로 수정되었습니다.');
        } else {
          const error = await response.json();
          toast.error(error.error || '평가 항목 수정에 실패했습니다.');
        }
      } else {
        // 추가
        const response = await fetch('/api/assessment-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...item,
            reference_links: item.references // API에서는 reference_links 사용
          })
        });

        if (response.ok) {
          const result = await response.json();
          const newItem = {
            ...result.item,
            references: result.item.reference_links // UI에서는 references 사용
          };
          setItems(prev => [...prev, newItem]);
          toast.success('새 평가 항목이 성공적으로 추가되었습니다.');
        } else {
          const error = await response.json();
          toast.error(error.error || '평가 항목 추가에 실패했습니다.');
        }
      }
      
      // 모달 닫기
      setEditingItem(null);
      setIsNewItem(false);
      setIsEditMode(false);
    } catch (error) {
      toast.error('작업 중 오류가 발생했습니다.');
    }
  };

  // 평가 항목 삭제
  const handleDeleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/assessment-items?id=${itemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setItems(prev => prev.filter(i => i.id !== itemId));
        // 체크리스트에서도 해당 항목 제거
        setChecklists(prev => prev.map(cl => ({
          ...cl,
          item_ids: cl.item_ids?.filter(id => id !== itemId) || [],
          item_count: Math.max(0, (cl.item_count || 0) - (cl.item_ids?.includes(itemId) ? 1 : 0))
        })));
        setDeleteConfirm(null);
        toast.success('평가 항목이 성공적으로 삭제되었습니다.');
      } else {
        const error = await response.json();
        toast.error(error.error || '평가 항목 삭제에 실패했습니다.');
      }
    } catch (error) {
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  // 체크리스트 추가/수정
  const handleSaveChecklist = async (checklist: AssessmentChecklist) => {
    try {
      if (editingChecklist && editingChecklist.id) {
        // 수정
        const response = await fetch('/api/assessment-checklists', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...checklist,
            item_ids: selectedItemsForChecklist
          })
        });

        if (response.ok) {
          const result = await response.json();
          setChecklists(prev => prev.map(c => c.id === checklist.id ? {
            ...result.checklist,
            item_count: selectedItemsForChecklist.length
          } : c));
          toast.success('체크리스트가 성공적으로 수정되었습니다.');
        } else {
          const error = await response.json();
          toast.error(error.error || '체크리스트 수정에 실패했습니다.');
        }
      } else {
        // 추가
        const response = await fetch('/api/assessment-checklists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...checklist,
            item_ids: selectedItemsForChecklist
          })
        });

        if (response.ok) {
          const result = await response.json();
          const newChecklist = {
            ...result.checklist,
            item_ids: selectedItemsForChecklist,
            item_count: selectedItemsForChecklist.length
          };
          setChecklists(prev => [...prev, newChecklist]);
          setSelectedItemsForChecklist([]);
          toast.success('새 체크리스트가 성공적으로 생성되었습니다.');
        } else {
          const error = await response.json();
          toast.error(error.error || '체크리스트 생성에 실패했습니다.');
        }
      }
      
      // 모달 닫기
      setEditingChecklist(null);
      setIsNewChecklist(false);
    } catch (error) {
      toast.error('작업 중 오류가 발생했습니다.');
    }
  };

  // 체크리스트 삭제
  const handleDeleteChecklist = (checklistId: string) => {
    try {
      setChecklists(prev => prev.filter(c => c.id !== checklistId));
      setDeleteConfirm(null);
      toast.success('체크리스트가 성공적으로 삭제되었습니다.');
    } catch (error) {
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  // 카테고리별로 항목 그룹화
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, AssessmentItem[]>);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">취약점 평가 항목</h2>
          <p className="text-gray-600 mt-1">자산 점검을 위한 평가 항목을 관리하고 체크리스트를 생성합니다</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Upload className="w-4 h-4" />
            가져오기
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            내보내기
          </button>
          {viewMode === 'items' ? (
            <div className="flex items-center gap-3">
              {selectedItemsForChecklist.length > 0 && (
                <button 
                  onClick={() => setIsNewChecklist(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CheckSquare className="w-4 h-4" />
                  선택 항목으로 체크리스트 생성 ({selectedItemsForChecklist.length})
                </button>
              )}
              <button 
                onClick={() => setIsNewItem(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                새 항목 추가
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsNewChecklist(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
              새 체크리스트
            </button>
          )}
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setViewMode('items')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                viewMode === 'items'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <List className="w-4 h-4" />
                평가 항목 ({items.length})
              </div>
            </button>
            <button
              onClick={() => setViewMode('checklists')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                viewMode === 'checklists'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                체크리스트 ({checklists.length})
              </div>
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={viewMode === 'items' ? "항목명, 코드, 태그로 검색..." : "체크리스트명으로 검색..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {viewMode === 'items' && (
              <>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">모든 카테고리</option>
                  <option value="계정 및 권한 관리">계정 및 권한 관리</option>
                  <option value="네트워크 보안">네트워크 보안</option>
                  <option value="시스템 보안">시스템 보안</option>
                  <option value="애플리케이션 보안">애플리케이션 보안</option>
                </select>
                
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">모든 심각도</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="info">Info</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {viewMode === 'items' ? (
            /* 평가 항목 목록 */
            <div className="space-y-4">
              {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <div key={category} className="bg-white border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expandedCategories.includes(category) ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                      <Folder className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-gray-900">{category}</span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                        {categoryItems.length}개
                      </span>
                    </div>
                  </button>
                  
                  {expandedCategories.includes(category) && (
                    <div className="border-t border-gray-200 divide-y divide-gray-100">
                      {categoryItems.map((item) => {
                        const SeverityIcon = getSeverityIcon(item.severity);
                        return (
                          <div
                            key={item.id}
                            className="px-4 py-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start gap-4">
                              <input
                                type="checkbox"
                                checked={selectedItemsForChecklist.includes(item.id)}
                                onChange={() => handleItemSelection(item.id)}
                                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="font-mono text-sm text-gray-600">{item.code}</span>
                                  <h4 className="font-medium text-gray-900">{item.title}</h4>
                                  <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(item.severity)}`}>
                                    <SeverityIcon className="inline w-3 h-3 mr-1" />
                                    {item.severity.toUpperCase()}
                                  </span>
                                  <span className={`px-2 py-1 text-xs rounded-full ${getCheckTypeColor(item.check_type)}`}>
                                    {getCheckTypeText(item.check_type)}
                                  </span>
                                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                    v{item.version}
                                  </span>
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                                
                                <div className="flex items-center gap-6 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    <span>{item.compliance_standards.join(', ')}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Tag className="w-3 h-3" />
                                    <span>{item.tags.join(', ')}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>업데이트: {new Date(item.updated_at).toLocaleDateString('ko-KR')}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedItem(item)}
                                  className="p-2 text-gray-600 hover:text-blue-600"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingItem(item);
                                    setIsNewItem(true); // 수정도 isNewItem을 true로 설정
                                    setIsEditMode(true);
                                  }}
                                  className="p-2 text-gray-600 hover:text-blue-600"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm({type: 'item', id: item.id});
                                  }}
                                  className="p-2 text-gray-600 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* 체크리스트 목록 */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {checklists.map((checklist) => (
                <div
                  key={checklist.id}
                  className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedChecklist(checklist)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {checklist.category}
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      checklist.status === 'active' ? 'bg-green-100 text-green-700' :
                      checklist.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {checklist.status === 'active' ? '활성' :
                       checklist.status === 'draft' ? '초안' : '보관'}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2">{checklist.name}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{checklist.description}</p>
                  
                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <CheckSquare className="w-3 h-3" />
                        항목 수: {checklist.item_count}개
                      </span>
                      <span>v{checklist.version}</span>
                    </div>
                    {checklist.compliance_framework && (
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span>{checklist.compliance_framework}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        마지막 사용: {checklist.last_used ? 
                          new Date(checklist.last_used).toLocaleDateString('ko-KR') : 
                          '미사용'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {checklist.usage_count}회
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      생성: {new Date(checklist.created_at).toLocaleDateString('ko-KR')}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          setEditingChecklist(checklist);
                          
                          // 체크리스트에 포함된 항목들을 selectedItemsForChecklist에 설정
                          if (checklist.item_ids) {
                            setSelectedItemsForChecklist(checklist.item_ids);
                          } else {
                            // item_ids가 없다면 API에서 체크리스트 상세 정보를 가져와야 함
                            try {
                              const response = await fetch(`/api/assessment-checklists/${checklist.id}`);
                              if (response.ok) {
                                const data = await response.json();
                                setSelectedItemsForChecklist(data.item_ids || []);
                              }
                            } catch (error) {
                              console.error('Error loading checklist items:', error);
                              setSelectedItemsForChecklist([]);
                            }
                          }
                          
                          setIsNewChecklist(true);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({type: 'checklist', id: checklist.id});
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-700">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Items for Checklist Creation */}
      {viewMode === 'items' && selectedItemsForChecklist.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900">
                {selectedItemsForChecklist.length}개 항목이 선택됨
              </p>
              <p className="text-sm text-blue-700">
                선택한 항목으로 새로운 체크리스트를 생성할 수 있습니다
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedItemsForChecklist([])}
                className="px-3 py-1 text-blue-700 hover:text-blue-800"
              >
                선택 취소
              </button>
              <button
                onClick={() => setIsNewChecklist(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                체크리스트 생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 평가 항목 추가/수정 모달 */}
      {(isNewItem || isEditMode) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingItem ? '평가 항목 수정' : '새 평가 항목 추가'}
                </h3>
                <button
                  onClick={() => {
                    setIsNewItem(false);
                    setIsEditMode(false);
                    setEditingItem(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const newItem: AssessmentItem = {
                id: editingItem?.id || '',
                code: formData.get('code') as string,
                category: formData.get('category') as string,
                subcategory: formData.get('subcategory') as string,
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                severity: formData.get('severity') as AssessmentItem['severity'],
                version: formData.get('version') as string,
                status: formData.get('status') as AssessmentItem['status'],
                compliance_standards: (formData.get('compliance_standards') as string).split(',').map(s => s.trim()),
                check_type: formData.get('check_type') as AssessmentItem['check_type'],
                remediation: formData.get('remediation') as string,
                references: (formData.get('references') as string).split(',').map(s => s.trim()),
                tags: (formData.get('tags') as string).split(',').map(s => s.trim()),
                created_at: editingItem?.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
                created_by: editingItem?.created_by || '현재 사용자'
              };
              handleSaveItem(newItem);
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">항목 코드 *</label>
                  <input
                    name="code"
                    type="text"
                    required
                    defaultValue={editingItem?.code || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="SEC-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">버전 *</label>
                  <input
                    name="version"
                    type="text"
                    required
                    defaultValue={editingItem?.version || '1.0.0'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="1.0.0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">대분류 *</label>
                  <input
                    name="category"
                    type="text"
                    required
                    defaultValue={editingItem?.category || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="계정 및 권한 관리"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">중분류 *</label>
                  <input
                    name="subcategory"
                    type="text"
                    required
                    defaultValue={editingItem?.subcategory || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="계정 관리"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">항목명 *</label>
                <input
                  name="title"
                  type="text"
                  required
                  defaultValue={editingItem?.title || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="미사용 계정 점검"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명 *</label>
                <textarea
                  name="description"
                  required
                  defaultValue={editingItem?.description || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="90일 이상 미사용된 계정이 존재하는지 점검합니다."
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">심각도 *</label>
                  <select
                    name="severity"
                    required
                    defaultValue={editingItem?.severity || 'medium'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="info">Info</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">점검 방식 *</label>
                  <select
                    name="check_type"
                    required
                    defaultValue={editingItem?.check_type || 'automated'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="automated">자동</option>
                    <option value="manual">수동</option>
                    <option value="hybrid">혼합</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태 *</label>
                  <select
                    name="status"
                    required
                    defaultValue={editingItem?.status || 'active'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">활성</option>
                    <option value="draft">초안</option>
                    <option value="deprecated">폐기</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">준수 표준</label>
                <input
                  name="compliance_standards"
                  type="text"
                  defaultValue={editingItem?.compliance_standards?.join(', ') || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ISO27001, ISMS-P, PCI-DSS (쉼표로 구분)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">조치 방법 *</label>
                <textarea
                  name="remediation"
                  required
                  defaultValue={editingItem?.remediation || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="미사용 계정을 비활성화하거나 삭제하십시오."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">참고 자료</label>
                <input
                  name="references"
                  type="text"
                  defaultValue={editingItem?.references?.join(', ') || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ISO27001 A.9.2.5, ISMS-P 2.2.1 (쉼표로 구분)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">태그</label>
                <input
                  name="tags"
                  type="text"
                  defaultValue={editingItem?.tags?.join(', ') || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="계정, 접근통제, 필수 (쉼표로 구분)"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewItem(false);
                    setIsEditMode(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingItem ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 체크리스트 추가/수정 모달 */}
      {isNewChecklist && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingChecklist ? '체크리스트 수정' : '새 체크리스트 생성'}
                </h3>
                <button
                  onClick={() => {
                    setIsNewChecklist(false);
                    setEditingChecklist(null);
                    setSelectedItemsForChecklist([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const newChecklist: AssessmentChecklist = {
                id: editingChecklist?.id || '',
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                version: formData.get('version') as string,
                category: formData.get('category') as string,
                status: formData.get('status') as AssessmentChecklist['status'],
                compliance_framework: formData.get('compliance_framework') as string,
                item_ids: editingChecklist?.item_ids || selectedItemsForChecklist,
                item_count: editingChecklist?.item_count || selectedItemsForChecklist.length,
                created_at: editingChecklist?.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
                created_by: editingChecklist?.created_by || '현재 사용자',
                usage_count: editingChecklist?.usage_count || 0
              };
              handleSaveChecklist(newChecklist);
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">체크리스트명 *</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingChecklist?.name || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="서버 보안 점검 체크리스트"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명 *</label>
                <textarea
                  name="description"
                  required
                  defaultValue={editingChecklist?.description || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="리눅스/유닉스 서버 보안 점검을 위한 표준 체크리스트"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">버전 *</label>
                  <input
                    name="version"
                    type="text"
                    required
                    defaultValue={editingChecklist?.version || '1.0.0'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="1.0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">카테고리 *</label>
                  <input
                    name="category"
                    type="text"
                    required
                    defaultValue={editingChecklist?.category || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="서버"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태 *</label>
                  <select
                    name="status"
                    required
                    defaultValue={editingChecklist?.status || 'draft'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">활성</option>
                    <option value="draft">초안</option>
                    <option value="archived">보관</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">준수 프레임워크</label>
                  <input
                    name="compliance_framework"
                    type="text"
                    defaultValue={editingChecklist?.compliance_framework || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="ISMS-P"
                  />
                </div>
              </div>
              
              {/* 평가 항목 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  평가 항목 선택 ({selectedItemsForChecklist.length}개 선택됨)
                </label>
                <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                      <input
                        type="checkbox"
                        id="select-all-items"
                        checked={selectedItemsForChecklist.length === items.length && items.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItemsForChecklist(items.map(item => item.id));
                          } else {
                            setSelectedItemsForChecklist([]);
                          }
                        }}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <label htmlFor="select-all-items" className="text-sm font-medium text-gray-700">
                        모든 항목 선택
                      </label>
                    </div>
                    
                    {items.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4 text-center">
                        사용 가능한 평가 항목이 없습니다.
                      </p>
                    ) : (
                      (() => {
                        const groupedItems = items.reduce((acc, item) => {
                          if (!acc[item.category]) {
                            acc[item.category] = [];
                          }
                          acc[item.category].push(item);
                          return acc;
                        }, {} as Record<string, AssessmentItem[]>);

                        return Object.entries(groupedItems).map(([category, categoryItems]) => (
                          <div key={category} className="mb-4">
                            <div className="sticky top-0 bg-white border-b border-gray-200 p-2">
                              <div className="flex items-center gap-2">
                                <Folder className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-gray-900 text-sm">{category}</span>
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                  {categoryItems.length}개
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              {categoryItems.map((item) => (
                                <div key={item.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
                                  <input
                                    type="checkbox"
                                    id={`modal-item-${item.id}`}
                                    checked={selectedItemsForChecklist.includes(item.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedItemsForChecklist([...selectedItemsForChecklist, item.id]);
                                      } else {
                                        setSelectedItemsForChecklist(selectedItemsForChecklist.filter(id => id !== item.id));
                                      }
                                    }}
                                    className="mt-1 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                  />
                                  <label htmlFor={`modal-item-${item.id}`} className="flex-1 cursor-pointer">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                        {item.code}
                                      </span>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        item.severity === 'critical' ? 'text-red-600 bg-red-50' :
                                        item.severity === 'high' ? 'text-orange-600 bg-orange-50' :
                                        item.severity === 'medium' ? 'text-yellow-600 bg-yellow-50' :
                                        item.severity === 'low' ? 'text-green-600 bg-green-50' :
                                        'text-blue-600 bg-blue-50'
                                      }`}>
                                        {item.severity === 'critical' ? '심각' :
                                         item.severity === 'high' ? '높음' :
                                         item.severity === 'medium' ? '보통' :
                                         item.severity === 'low' ? '낮음' : '정보'}
                                      </span>
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 mb-1">
                                      {item.title}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {item.subcategory && `${item.subcategory}`}
                                    </div>
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()
                    )}
                  </div>
                </div>
              </div>
              
              {!editingChecklist && selectedItemsForChecklist.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    선택된 {selectedItemsForChecklist.length}개 항목이 이 체크리스트에 포함됩니다.
                  </p>
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewChecklist(false);
                    setEditingChecklist(null);
                    setSelectedItemsForChecklist([]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {editingChecklist ? '수정' : '생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">삭제 확인</h3>
                  <p className="text-sm text-gray-600">
                    {deleteConfirm.type === 'item' ? '이 평가 항목을' : '이 체크리스트를'} 삭제하시겠습니까?
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mb-6">
                이 작업은 되돌릴 수 없습니다. {deleteConfirm.type === 'item' && '체크리스트에서도 제거됩니다.'}
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    if (deleteConfirm.type === 'item') {
                      handleDeleteItem(deleteConfirm.id);
                    } else {
                      handleDeleteChecklist(deleteConfirm.id);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && !isEditMode && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedItem.code}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(selectedItem.severity)}`}>
                    {selectedItem.severity.toUpperCase()}
                  </span>
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    v{selectedItem.version}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{selectedItem.title}</h4>
                <p className="text-gray-600">{selectedItem.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">기본 정보</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">카테고리:</span>
                      <span>{selectedItem.category} &gt; {selectedItem.subcategory}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">점검 방식:</span>
                      <span className={`px-2 py-1 rounded text-xs ${getCheckTypeColor(selectedItem.check_type)}`}>
                        {getCheckTypeText(selectedItem.check_type)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">상태:</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        selectedItem.status === 'active' ? 'bg-green-100 text-green-700' :
                        selectedItem.status === 'deprecated' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {selectedItem.status === 'active' ? '활성' :
                         selectedItem.status === 'deprecated' ? '폐기' : '초안'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">준수 표준</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.compliance_standards.map((standard) => (
                      <span key={standard} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {standard}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium text-gray-900 mb-3">조치 방법</h5>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {selectedItem.remediation}
                </p>
              </div>
              
              <div>
                <h5 className="font-medium text-gray-900 mb-3">참고 자료</h5>
                <ul className="space-y-1">
                  {selectedItem.references.map((ref, index) => (
                    <li key={index} className="text-sm text-blue-600 hover:text-blue-700">
                      • {ref}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h5 className="font-medium text-gray-900 mb-3">버전 이력</h5>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm">
                      <p className="font-medium">v{selectedItem.version}</p>
                      <p className="text-gray-600">현재 버전</p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(selectedItem.updated_at).toLocaleDateString('ko-KR')} - {selectedItem.created_by}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  생성: {new Date(selectedItem.created_at).toLocaleDateString('ko-KR')} by {selectedItem.created_by}
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    편집
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    버전 생성
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}