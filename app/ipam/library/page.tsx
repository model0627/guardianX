'use client';

import { useState, useEffect } from 'react';
import { Search, Eye, RefreshCw, Plus, Link2, Settings, RotateCw, Trash2, History, Edit } from 'lucide-react';
import DeviceLinkModal from './components/DeviceLinkModal';
import FieldMappingModal from './components/FieldMappingModal';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import AutoSyncToggle from './components/AutoSyncToggle';
import SyncHistoryModal from './components/SyncHistoryModal';
import EditLibraryModal from './components/EditLibraryModal';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';
// 서버 사이드 스케줄러 사용으로 클라이언트 사이드 스케줄러 제거

interface Library {
  id: string;
  name: string;
  version: string;
  vendor: string;
  type: string;
  product_type: string;
  device_name: string;
  process_name: string;
  install_path: string;
  install_date: string;
  license_type: string;
  license_expiry: string;
  last_update: string;
  security_patch_level: string;
  vulnerability_status: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  linkedDevices: string[];
  apiLinks: string;
  status: string;
  description: string;
  tags: string[];
}

interface ApiConnection {
  id: string;
  name: string;
  api_url: string;
  connection_type: string;
  last_sync: string;
  last_sync_status: string;
  field_mappings: Record<string, string>;
  auto_sync_enabled?: boolean;
  sync_frequency?: string;
}

export default function LibraryPage() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [apiConnections, setApiConnections] = useState<ApiConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [selectedApiConnection, setSelectedApiConnection] = useState<ApiConnection | null>(null);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingLibrary, setDeletingLibrary] = useState<Library | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedConnectionForHistory, setSelectedConnectionForHistory] = useState<string | undefined>();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<Library | null>(null);
  const { toasts, success, error, info, removeToast } = useToast();

  useEffect(() => {
    // 페이지 타이틀 설정
    document.title = '라이브러리 관리 - GuardianX';
    
    fetchLibraries();
    fetchApiConnections();
    
    // 서버 초기화 (한 번만 호출)
    initializeServerScheduler();
  }, []);

  // 서버 초기화 함수
  const initializeServerScheduler = async () => {
    try {
      const response = await fetch('/api/init');
      if (response.ok) {
        const data = await response.json();
        console.log('[Client] Server initialization completed:', data.message);
      } else {
        console.error('[Client] Server initialization failed');
      }
    } catch (error) {
      console.error('[Client] Error initializing server:', error);
    }
  };

  const fetchLibraries = async () => {
    try {
      const response = await fetch('/api/libraries', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setLibraries(data);
      }
    } catch (error) {
      console.error('Failed to fetch libraries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkDevices = async (libraryId: string, deviceIds: string[]) => {
    try {
      const response = await fetch(`/api/libraries/${libraryId}/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ deviceIds }),
      });

      if (response.ok) {
        const data = await response.json();
        await fetchLibraries(); // Refresh library list
        success(`디바이스 연결이 업데이트되었습니다. (${data.linkedDevices}개 연결됨)`);
      } else {
        const errorData = await response.json();
        error(errorData.error || '디바이스 연결에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to link devices:', error);
      error('디바이스 연결 중 오류가 발생했습니다.');
    }
  };

  const fetchApiConnections = async () => {
    try {
      const response = await fetch('/api/api-connections?sync_target=libraries', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setApiConnections(data);
      }
    } catch (error) {
      console.error('Failed to fetch API connections:', error);
    }
  };

  const handleSyncLibraries = async (apiConnectionId: string) => {
    setSyncing(prev => ({ ...prev, [apiConnectionId]: true }));
    info('동기화를 시작합니다...');
    
    try {
      const response = await fetch('/api/sync/libraries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ apiConnectionId }),
      });

      if (response.ok) {
        const data = await response.json();
        const { stats } = data;
        
        // Show success message with detailed stats
        const parts = [];
        if (stats.recordsAdded > 0) parts.push(`✅ ${stats.recordsAdded}개 추가`);
        if (stats.recordsUpdated > 0) parts.push(`✏️ ${stats.recordsUpdated}개 업데이트`);
        if (stats.recordsDeactivated > 0) parts.push(`🗑️ ${stats.recordsDeactivated}개 비활성화`);
        
        const message = parts.length > 0 
          ? `동기화 완료! ${parts.join(', ')} (총 ${stats.recordsProcessed}개 처리)`
          : `동기화 완료! 변경사항 없음 (${stats.recordsProcessed}개 확인)`;
        
        success(message);
        
        // Refresh data
        fetchLibraries();
        fetchApiConnections();
      } else {
        const errorData = await response.json();
        error(`동기화 실패: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('Failed to sync libraries:', err);
      error('동기화 중 오류가 발생했습니다.');
    } finally {
      setSyncing(prev => ({ ...prev, [apiConnectionId]: false }));
    }
  };

  const handleSaveFieldMapping = async (mappings: Record<string, string>, syncSettings?: { frequency_minutes: number; frequency_type: string }) => {
    if (!selectedApiConnection) return;

    try {
      const updateData: any = { field_mappings: mappings };
      
      if (syncSettings) {
        updateData.sync_frequency_minutes = syncSettings.frequency_minutes;
        updateData.sync_frequency_type = syncSettings.frequency_type;
      }

      const response = await fetch(`/api/api-connections/${selectedApiConnection.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        success('설정이 성공적으로 저장되었습니다.');
        fetchApiConnections();
      } else {
        const errorData = await response.json();
        error(errorData.error || '설정 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('Failed to save field mappings:', err);
      error('설정 저장 중 오류가 발생했습니다.');
    }
  };

  const openLinkModal = (library: Library) => {
    setSelectedLibrary(library);
    setLinkModalOpen(true);
  };

  const openMappingModal = (apiConnection: ApiConnection) => {
    setSelectedApiConnection(apiConnection);
    setMappingModalOpen(true);
  };

  const handleDeleteLibrary = async () => {
    if (!deletingLibrary) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/libraries/${deletingLibrary.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        success(data.message || '라이브러리가 삭제되었습니다.');
        fetchLibraries();
        setDeleteModalOpen(false);
        setDeletingLibrary(null);
      } else {
        const errorData = await response.json();
        error(errorData.error || '라이브러리 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('Failed to delete library:', err);
      error('라이브러리 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteModal = (library: Library) => {
    setDeletingLibrary(library);
    setDeleteModalOpen(true);
  };

  const openEditModal = (library: Library) => {
    setEditingLibrary(library);
    setEditModalOpen(true);
  };

  const handleEditLibrary = async (libraryId: string, updates: Partial<Library>) => {
    try {
      const response = await fetch('/api/libraries', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id: libraryId, ...updates }),
      });

      if (response.ok) {
        const data = await response.json();
        success(data.message || '라이브러리가 성공적으로 업데이트되었습니다.');
        fetchLibraries();
        setEditModalOpen(false);
        setEditingLibrary(null);
      } else {
        const errorData = await response.json();
        error(errorData.error || '라이브러리 업데이트에 실패했습니다.');
      }
    } catch (err) {
      console.error('Failed to update library:', err);
      error('라이브러리 업데이트 중 오류가 발생했습니다.');
    }
  };

  const openHistoryModal = (connectionId?: string) => {
    setSelectedConnectionForHistory(connectionId);
    setHistoryModalOpen(true);
  };

  const handleToggleAutoSync = async (connectionId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/api-connections/${connectionId}/toggle-auto-sync`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        const data = await response.json();
        success(data.message);
        fetchApiConnections();
        
        // 서버 사이드 스케줄러는 자동으로 관리됨
        console.log('[Client] Auto-sync setting changed:', { connectionId, enabled });
      } else {
        const errorData = await response.json();
        error(errorData.error || '자동 동기화 설정 변경에 실패했습니다.');
      }
    } catch (err) {
      console.error('Failed to toggle auto-sync:', err);
      error('자동 동기화 설정 중 오류가 발생했습니다.');
    }
  };

  // API 연결 수정 핸들러
  const handleEditConnection = (connection: ApiConnection) => {
    window.location.href = `/api-connections/edit/${connection.id}`;
  };

  // API 연결 삭제 핸들러
  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm('이 API 연결을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/api-connections/${connectionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        success('API 연결이 삭제되었습니다.');
        fetchApiConnections(); // 목록 새로고침
      } else {
        const errorData = await response.json();
        error(errorData.error || 'API 연결 삭제 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Failed to delete API connection:', err);
      error('API 연결 삭제 중 오류가 발생했습니다.');
    }
  };

  // Sample data matching the image
  const sampleLibraries: Library[] = [
    {
      id: 'V9QCQR73Y4Z',
      name: 'V9QCQR73Y4Z',
      version: '1.0.0',
      vendor: 'Sample Vendor',
      type: 'software',
      product_type: 'software',
      device_name: 'WorkStation-01',
      process_name: 'sample_process.exe',
      install_path: '/usr/local/bin',
      install_date: '2024-01-15',
      license_type: 'commercial',
      license_expiry: '2024-12-31',
      last_update: '2024-08-15',
      security_patch_level: 'latest',
      vulnerability_status: 'safe',
      cpu_usage: 2.5,
      memory_usage: 1024 * 1024 * 512, // 512MB
      disk_usage: 1024 * 1024 * 1024 * 2, // 2GB
      linkedDevices: [],
      apiLinks: 'API 동기화',
      status: 'active',
      description: 'Sample library for demonstration',
      tags: ['security', 'enterprise']
    },
    {
      id: 'W9QCQR73YA',
      name: 'W9QCQR73YA',
      version: '2.1.3',
      vendor: 'Open Source Community',
      type: 'software',
      product_type: 'software',
      device_name: 'Server-02',
      process_name: 'daemon_service',
      install_path: '/opt/services',
      install_date: '2024-03-20',
      license_type: 'open_source',
      license_expiry: '',
      last_update: '2024-08-10',
      security_patch_level: 'v2.1.3',
      vulnerability_status: 'warning',
      cpu_usage: 5.2,
      memory_usage: 1024 * 1024 * 256, // 256MB
      disk_usage: 1024 * 1024 * 1024 * 1.5, // 1.5GB
      linkedDevices: [],
      apiLinks: 'API 동기화',
      status: 'active',
      description: 'Open source library',
      tags: ['opensource', 'monitoring']
    },
    {
      id: 'F9QCQR73Y4',
      name: 'F9QCQR73Y4',
      version: '3.2.1',
      vendor: 'Enterprise Solutions',
      type: 'software',
      product_type: 'software',
      device_name: 'DevMachine-03',
      process_name: 'core_engine',
      install_path: '/Applications',
      install_date: '2024-05-10',
      license_type: 'commercial',
      license_expiry: '2025-05-10',
      last_update: '2024-07-25',
      security_patch_level: 'patch-2024-07',
      vulnerability_status: 'critical',
      cpu_usage: 15.8,
      memory_usage: 1024 * 1024 * 1024 * 2, // 2GB
      disk_usage: 1024 * 1024 * 1024 * 5, // 5GB
      linkedDevices: ['shawn-1', 'device_name'],
      apiLinks: 'API 동기화',
      status: 'active',
      description: 'Critical enterprise library requiring immediate attention',
      tags: ['enterprise', 'critical', 'security']
    }
  ];

  const displayLibraries = libraries.length > 0 ? libraries : sampleLibraries;

  const filteredLibraries = displayLibraries.filter(library => {
    const matchesSearch = library.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          library.vendor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || library.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6">
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center">
          <span className="mr-2">📚</span> 라이브러리 관리
        </h1>
        <p className="text-gray-600">API에서 라이브러리 데이터를 동기화하고 디바이스와 연결을 관리합니다.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">🔗 API 연결 관리</p>
              <p className="text-2xl font-bold mt-1">{filteredLibraries.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">⚙️ 라이브러리 목록</p>
              <p className="text-2xl font-bold mt-1">{filteredLibraries.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">🔄 디바이스 연결</p>
              <p className="text-2xl font-bold mt-1">
                {filteredLibraries.reduce((acc, lib) => acc + lib.linkedDevices.length, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* API Connections Section */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center">
            <span className="mr-2">🔗</span> 라이브러리 API 연결
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => openHistoryModal()}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex items-center"
            >
              <History className="w-4 h-4 mr-2" />
              전체 히스토리
            </button>
            <button
              onClick={() => window.location.href = '/api-connections/add'}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              API 연결 추가
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연결 이름</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연결 기준</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">동기화 상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">마지막 동기화</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">자동 동기화</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">동기화 주기</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apiConnections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    API 연결이 없습니다.
                  </td>
                </tr>
              ) : (
                apiConnections.map((connection) => (
                  <tr key={connection.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {connection.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                      {connection.api_url}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {connection.connection_type === 'library' ? '디바이스별' : connection.connection_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        connection.last_sync_status === 'success' 
                          ? 'bg-green-100 text-green-800' 
                          : connection.last_sync_status === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {connection.last_sync_status === 'success' ? '성공' : 
                         connection.last_sync_status === 'error' ? '실패' : '대기'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {connection.last_sync ? new Date(connection.last_sync).toLocaleString('ko-KR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <AutoSyncToggle
                        connectionId={connection.id}
                        isEnabled={connection.auto_sync_enabled || false}
                        onToggle={handleToggleAutoSync}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {connection.auto_sync_enabled ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {connection.sync_frequency_minutes || 5} {
                            connection.sync_frequency_type === 'hours' ? '시간' :
                            connection.sync_frequency_type === 'days' ? '일' : '분'
                          }
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => openMappingModal(connection)}
                          className="text-blue-500 hover:text-blue-700"
                          title="필드 매핑 설정"
                        >
                          <Settings className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleSyncLibraries(connection.id)}
                          disabled={syncing[connection.id]}
                          className="text-green-500 hover:text-green-700 disabled:opacity-50"
                          title="동기화 실행"
                        >
                          <RotateCw className={`w-5 h-5 ${syncing[connection.id] ? 'animate-spin' : ''}`} />
                        </button>
                        <button 
                          onClick={() => openHistoryModal(connection.id)}
                          className="text-gray-500 hover:text-gray-700"
                          title="동기화 히스토리"
                        >
                          <History className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleEditConnection(connection)}
                          className="text-orange-500 hover:text-orange-700"
                          title="API 연결 수정"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteConnection(connection.id)}
                          className="text-red-500 hover:text-red-700"
                          title="API 연결 삭제"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Library List Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center">
            <span className="mr-2">📋</span> 라이브러리 목록
          </h2>
          <button
            onClick={() => window.location.href = '/library/add'}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            라이브러리 추가
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  이름
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  버전
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  제조사
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  디바이스
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  라이선스
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  보안 상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  리소스 사용량
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  마지막 업데이트
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                    로딩 중...
                  </td>
                </tr>
              ) : filteredLibraries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                    라이브러리가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredLibraries.map((library) => (
                  <tr key={library.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div>
                        <div className="font-medium">{library.name}</div>
                        {library.process_name && (
                          <div className="text-xs text-gray-500">프로세스: {library.process_name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {library.version || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {library.vendor || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        {library.device_name && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            🖥️ {library.device_name}
                          </span>
                        )}
                        {library.linkedDevices && library.linkedDevices.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {library.linkedDevices.slice(0, 2).map((device, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                🔗 {typeof device === 'string' ? device : device.name || 'Unknown'}
                              </span>
                            ))}
                            {library.linkedDevices.length > 2 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                +{library.linkedDevices.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          !library.device_name && <span className="text-gray-400">미연결</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        {library.license_type && (
                          <div className="text-xs">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              library.license_type === 'commercial' ? 'bg-orange-100 text-orange-800' :
                              library.license_type === 'open_source' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {library.license_type}
                            </span>
                          </div>
                        )}
                        {library.license_expiry && (
                          <div className="text-xs text-gray-500 mt-1">
                            만료: {new Date(library.license_expiry).toLocaleDateString('ko-KR')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          library.vulnerability_status === 'safe' ? 'bg-green-100 text-green-800' :
                          library.vulnerability_status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          library.vulnerability_status === 'critical' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {library.vulnerability_status === 'safe' ? '🛡️ 안전' :
                           library.vulnerability_status === 'warning' ? '⚠️ 주의' :
                           library.vulnerability_status === 'critical' ? '🚨 위험' :
                           '❓ 미확인'}
                        </span>
                        {library.security_patch_level && (
                          <div className="text-xs text-gray-500">
                            패치: {library.security_patch_level}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        {library.cpu_usage && (
                          <div className="flex items-center text-xs">
                            <span className="w-8">CPU:</span>
                            <span className="font-mono">{library.cpu_usage}%</span>
                          </div>
                        )}
                        {library.memory_usage && (
                          <div className="flex items-center text-xs">
                            <span className="w-8">RAM:</span>
                            <span className="font-mono">{(library.memory_usage / 1024 / 1024).toFixed(1)}MB</span>
                          </div>
                        )}
                        {library.disk_usage && (
                          <div className="flex items-center text-xs">
                            <span className="w-8">DISK:</span>
                            <span className="font-mono">{(library.disk_usage / 1024 / 1024).toFixed(1)}MB</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {library.last_update ? new Date(library.last_update).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        library.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {library.status === 'active' ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => openLinkModal(library)}
                          className="text-blue-500 hover:text-blue-700"
                          title="디바이스 연결"
                        >
                          <Link2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => openEditModal(library)}
                          className="text-green-500 hover:text-green-700"
                          title="편집"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(library)}
                          className="text-red-500 hover:text-red-700"
                          title="삭제"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device Link Modal */}
      {selectedLibrary && (
        <DeviceLinkModal
          isOpen={linkModalOpen}
          onClose={() => {
            setLinkModalOpen(false);
            setSelectedLibrary(null);
          }}
          library={selectedLibrary}
          onLink={handleLinkDevices}
        />
      )}

      {/* Field Mapping Modal */}
      {selectedApiConnection && (
        <FieldMappingModal
          isOpen={mappingModalOpen}
          onClose={() => {
            setMappingModalOpen(false);
            setSelectedApiConnection(null);
          }}
          apiConnection={selectedApiConnection}
          onSave={handleSaveFieldMapping}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingLibrary(null);
        }}
        onConfirm={handleDeleteLibrary}
        title="라이브러리 삭제"
        message={`정말로 "${deletingLibrary?.name}" 라이브러리를 삭제하시겠습니까? 연결된 디바이스 정보도 함께 삭제됩니다.`}
        loading={deleting}
      />

      {/* Sync History Modal */}
      <SyncHistoryModal
        isOpen={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setSelectedConnectionForHistory(undefined);
        }}
        connectionId={selectedConnectionForHistory}
      />

      {/* Edit Library Modal */}
      <EditLibraryModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingLibrary(null);
        }}
        library={editingLibrary}
        onSave={handleEditLibrary}
      />
    </div>
  );
}