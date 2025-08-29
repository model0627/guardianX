'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Monitor,
  Eye,
  Link,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Calendar,
  Key,
  Server
} from 'lucide-react';

interface Library {
  id: string;
  name: string;
  version?: string;
  vendor?: string;
  product_type: string;
  device_id?: string;
  device_name?: string;
  device_display_name?: string;
  device_type?: string;
  device_status?: string;
  process_name?: string;
  install_path?: string;
  install_date?: string;
  license_type?: string;
  license_key?: string;
  license_expiry?: string;
  api_endpoint?: string;
  api_key?: string;
  api_status?: string;
  status: string;
  vulnerability_status?: string;
  description?: string;
  notes?: string;
  tags?: string[];
  connected_devices?: number;
  created_at: string;
  updated_at?: string;
  created_by_email?: string;
  api_connection_id?: string;
  api_connection_name?: string;
}

export default function LibrariesPage() {
  const router = useRouter();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<Library | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    // 페이지 타이틀 설정
    document.title = '라이브러리 관리 - GuardianX IPAM';
    
    loadLibraries();
  }, []);

  const loadLibraries = async () => {
    try {
      const response = await fetch('/api/ipam/libraries', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setLibraries(data.libraries || []);
      }
    } catch (error) {
      console.error('Failed to load libraries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLibrary = () => {
    setEditingLibrary(null);
    setFormMode('create');
    setShowFormModal(true);
  };

  const handleEditLibrary = (library: Library) => {
    setEditingLibrary(library);
    setFormMode('edit');
    setShowFormModal(true);
  };

  const handleDeleteLibrary = async (libraryId: string) => {
    if (!confirm('이 라이브러리를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/libraries/${libraryId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await loadLibraries();
      } else {
        alert('라이브러리 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Delete library error:', error);
      alert('라이브러리 삭제에 실패했습니다.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '활성';
      case 'inactive':
        return '비활성';
      case 'maintenance':
        return '유지보수';
      case 'error':
        return '오류';
      default:
        return status;
    }
  };

  const getVulnerabilityIcon = (status?: string) => {
    switch (status) {
      case 'secure':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'vulnerable':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'checking':
        return <Info className="w-4 h-4 text-blue-600" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getProductTypeIcon = (type: string) => {
    switch (type) {
      case 'software':
        return <Package className="w-4 h-4 text-blue-600" />;
      case 'firmware':
        return <Server className="w-4 h-4 text-purple-600" />;
      case 'driver':
        return <Monitor className="w-4 h-4 text-orange-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const filteredLibraries = libraries.filter(library => {
    const matchesSearch = 
      library.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (library.vendor && library.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (library.version && library.version.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (library.device_display_name && library.device_display_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = !statusFilter || library.status === statusFilter;
    const matchesType = !productTypeFilter || library.product_type === productTypeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-blue-600">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            라이브러리 관리
          </h1>
          <p className="text-gray-600 mt-1">API에서 라이브러리 데이터를 동기화하고 디바이스와 연결을 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => router.push('/api-connections/edit')}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Shield className="w-4 h-4" />
            OAuth 설정
          </button>
          <button 
            onClick={() => router.push('/api-connections/add')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Link className="w-4 h-4" />
            API 연결 관리
          </button>
          <button 
            onClick={handleCreateLibrary}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            라이브러리 추가
          </button>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="이름, 버전, 제조사로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={productTypeFilter}
            onChange={(e) => setProductTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">모든 타입</option>
            <option value="software">소프트웨어</option>
            <option value="firmware">펌웨어</option>
            <option value="driver">드라이버</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">모든 상태</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
            <option value="maintenance">유지보수</option>
            <option value="error">오류</option>
          </select>
        </div>
      </div>

      {/* 라이브러리 목록 - 테이블 형태 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-4 font-medium text-gray-900">이름</th>
                <th className="text-left p-4 font-medium text-gray-900">버전</th>
                <th className="text-left p-4 font-medium text-gray-900">제조사</th>
                <th className="text-left p-4 font-medium text-gray-900">타입</th>
                <th className="text-left p-4 font-medium text-gray-900">출처</th>
                <th className="text-left p-4 font-medium text-gray-900">연결된 디바이스</th>
                <th className="text-left p-4 font-medium text-gray-900">보안</th>
                <th className="text-left p-4 font-medium text-gray-900">상태</th>
                <th className="text-left p-4 font-medium text-gray-900">작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredLibraries.map((library) => (
                <tr key={library.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getProductTypeIcon(library.product_type)}
                      <div>
                        <div className="font-medium text-gray-900">
                          {library.name}
                        </div>
                        {library.process_name && (
                          <div className="text-sm text-gray-500">
                            {library.process_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-gray-700">
                      {library.version || '-'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-gray-700">
                      {library.vendor || '-'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-gray-600 text-sm">
                      {library.product_type}
                    </span>
                  </td>
                  <td className="p-4">
                    {library.api_connection_name ? (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {library.api_connection_name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">수동 추가</span>
                    )}
                  </td>
                  <td className="p-4">
                    {library.device_display_name ? (
                      <div className="flex items-center gap-1">
                        <Monitor className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">
                          {library.device_display_name}
                        </span>
                        {library.connected_devices && library.connected_devices > 1 && (
                          <span className="ml-1 text-xs text-gray-500">
                            (+{library.connected_devices - 1})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">연결 안됨</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      {getVulnerabilityIcon(library.vulnerability_status)}
                      <span className="text-sm text-gray-600">
                        {library.vulnerability_status === 'secure' && '안전'}
                        {library.vulnerability_status === 'vulnerable' && '취약'}
                        {library.vulnerability_status === 'checking' && '확인중'}
                        {(!library.vulnerability_status || library.vulnerability_status === 'unknown') && '알 수 없음'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(library.status)}`}>
                        {getStatusText(library.status)}
                      </span>
                      {library.api_endpoint && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          library.api_status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
                        }`}>
                          <Key className="w-3 h-3" />
                          API
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => router.push(`/ipam/libraries/${library.id}`)}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded" 
                        title="상세 보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEditLibrary(library)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded" 
                        title="수정"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteLibrary(library.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded" 
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLibraries.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {searchTerm || statusFilter || productTypeFilter 
                ? '검색 조건에 맞는 라이브러리가 없습니다' 
                : '등록된 라이브러리가 없습니다'
              }
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter || productTypeFilter 
                ? '다른 검색 조건을 시도해보세요.' 
                : '첫 번째 라이브러리를 추가해보세요.'
              }
            </p>
            {!searchTerm && !statusFilter && !productTypeFilter && (
              <button 
                onClick={handleCreateLibrary}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                라이브러리 추가
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}