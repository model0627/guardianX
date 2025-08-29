'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Monitor, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Network,
  Calendar,
  Eye,
  Server,
  Database,
  Wifi,
  AlertCircle,
  Users,
  Settings,
  Building2,
  RotateCw,
  History,
  RefreshCw
} from 'lucide-react';
import DeviceFormModal from './components/DeviceFormModal';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import IPAssignmentModal from './components/IPAssignmentModal';
import ContactAssignmentModal from './components/ContactAssignmentModal';
import DeviceFieldMappingModal from './components/DeviceFieldMappingModal';
import AutoSyncToggle from './components/AutoSyncToggle';
import SyncHistoryModal from './components/SyncHistoryModal';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';

interface Device {
  id: string;
  name: string;
  device_type: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  rack_id?: string;
  rack_name?: string;
  rack_position?: number;
  rack_size: number;
  power_consumption?: number;
  status: 'active' | 'inactive' | 'maintenance' | 'decommissioned';
  purchase_date?: string;
  warranty_end?: string;
  created_at: string;
  primary_ip?: string;
  assigned_ips?: string[];
  description?: string;
  server_room_name?: string;
  office_name?: string;
  contact_count?: number;
  assigned_contacts?: DeviceContact[];
}

interface DeviceContact {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'primary' | 'backup' | 'viewer';
  created_at: string;
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
  sync_frequency_minutes?: number;
  sync_frequency_type?: string;
  sync_target: string;
}

export default function DevicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toasts, removeToast, success, error, warning } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showAssignedUsers, setShowAssignedUsers] = useState<string | null>(null);
  const [deviceContacts, setDeviceContacts] = useState<Record<string, DeviceContact[]>>({});
  const [loadingContacts, setLoadingContacts] = useState<Record<string, boolean>>({});
  
  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | undefined>(undefined);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  
  // Delete dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingDevice, setDeletingDevice] = useState<Device | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // IP assignment modal states
  const [showIPModal, setShowIPModal] = useState(false);
  const [ipAssignmentDevice, setIPAssignmentDevice] = useState<Device | null>(null);
  
  // Contact assignment modal states
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactAssignmentDevice, setContactAssignmentDevice] = useState<Device | null>(null);

  // API sync related states
  const [apiConnections, setApiConnections] = useState<ApiConnection[]>([]);
  const [selectedApiConnection, setSelectedApiConnection] = useState<ApiConnection | null>(null);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedConnectionForHistory, setSelectedConnectionForHistory] = useState<string | undefined>();

  useEffect(() => {
    // 페이지 타이틀 설정
    document.title = '디바이스 관리 - GuardianX';
    
    loadDevices();
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

  const loadDevices = async () => {
    try {
      const response = await fetch('/api/ipam/devices', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const devices = data.devices || [];
        setDevices(devices);
        
        // Load contact data from devices
        const contactsData: Record<string, DeviceContact[]> = {};
        devices.forEach((device: Device) => {
          if (device.assigned_contacts && device.assigned_contacts.length > 0) {
            contactsData[device.id] = device.assigned_contacts.map((c: any) => ({
              id: c.id,
              user_id: c.contact_id,
              name: c.name,
              email: c.email,
              role: c.role,
              created_at: ''
            }));
          }
        });
        setDeviceContacts(contactsData);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDevice = () => {
    setEditingDevice(undefined);
    setFormMode('create');
    setShowFormModal(true);
  };

  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
    setFormMode('edit');
    setShowFormModal(true);
  };

  const handleViewDevice = (device: Device) => {
    router.push(`/ipam/devices/${device.id}`);
  };

  const handleDeleteDevice = (device: Device) => {
    setDeletingDevice(device);
    setShowDeleteDialog(true);
  };

  const handleAssignIP = (device: Device) => {
    setIPAssignmentDevice(device);
    setShowIPModal(true);
  };

  const handleAssignContact = (device: Device) => {
    setContactAssignmentDevice(device);
    setShowContactModal(true);
  };

  // API 연결 관련 함수들
  const fetchApiConnections = async () => {
    try {
      const response = await fetch('/api/api-connections?sync_target=devices', {
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

  const handleSyncDevices = async (apiConnectionId: string) => {
    setSyncing(prev => ({ ...prev, [apiConnectionId]: true }));
    
    try {
      const response = await fetch('/api/sync/devices', {
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
          ? `디바이스 동기화 완료! ${parts.join(', ')} (총 ${stats.recordsProcessed}개 처리)`
          : `디바이스 동기화 완료! 변경사항 없음 (${stats.recordsProcessed}개 확인)`;
        
        // Show warnings if there are skipped records
        if (data.warnings && data.warnings.length > 0) {
          warning(`${message} ⚠️ 일부 레코드 건너뜀: ${data.warnings.join(', ')}`);
        } else {
          success(message);
        }
        
        // Refresh data
        loadDevices();
        fetchApiConnections();
      } else {
        const errorData = await response.json();
        error(`디바이스 동기화 실패: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error('Failed to sync devices:', err);
      error('디바이스 동기화 중 오류가 발생했습니다.');
    } finally {
      setSyncing(prev => ({ ...prev, [apiConnectionId]: false }));
    }
  };

  const openMappingModal = (apiConnection: ApiConnection) => {
    setSelectedApiConnection(apiConnection);
    setMappingModalOpen(true);
  };

  const handleSaveFieldMapping = async (mappings: Record<string, string>, syncSettings?: { frequency_minutes: number; frequency_type: string }) => {
    if (!selectedApiConnection) return;

    try {
      const updateData: any = { 
        field_mappings: mappings,
        sync_target: 'devices'  // 디바이스 동기화로 설정
      };
      
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
        success('디바이스 동기화 설정이 성공적으로 저장되었습니다.');
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
        
        console.log('[Client] Device auto-sync setting changed:', { connectionId, enabled });
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

  const loadDeviceContacts = async (deviceId: string) => {
    if (loadingContacts[deviceId]) {
      return; // Already loading
    }

    setLoadingContacts(prev => ({ ...prev, [deviceId]: true }));
    
    try {
      const response = await fetch(`/api/ipam/device-assignments?device_id=${deviceId}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const contacts = data.assignments.map((assignment: any) => ({
            id: assignment.id,
            user_id: assignment.contact_id,
            name: assignment.name,
            email: assignment.email,
            role: assignment.role,
            created_at: assignment.created_at
          }));
          
          setDeviceContacts(prev => ({ ...prev, [deviceId]: contacts }));
        }
      }
    } catch (error) {
      console.error('Failed to load device contacts:', error);
    } finally {
      setLoadingContacts(prev => ({ ...prev, [deviceId]: false }));
    }
  };

  const handleShowContacts = (deviceId: string) => {
    const isOpening = showAssignedUsers !== deviceId;
    setShowAssignedUsers(isOpening ? deviceId : null);
    
    if (isOpening) {
      // 항상 최신 데이터를 로드
      loadDeviceContacts(deviceId);
    }
  };

  const handleFormSubmit = async (deviceData: any) => {
    try {
      const url = formMode === 'create' 
        ? '/api/ipam/devices'
        : `/api/ipam/devices?id=${editingDevice?.id}`;
      
      const method = formMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(deviceData)
      });

      if (response.ok) {
        await loadDevices(); // Refresh the list
        setShowFormModal(false);
        success(editingDevice ? '디바이스가 성공적으로 수정되었습니다.' : '디바이스가 성공적으로 생성되었습니다.');
      } else {
        const errorData = await response.json();
        error(errorData.error || '디바이스 처리에 실패했습니다.');
      }
    } catch (err) {
      console.error('Device form submission error:', err);
      error('디바이스 처리 중 오류가 발생했습니다.');
    }
  };

  const confirmDelete = async () => {
    if (!deletingDevice) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/ipam/devices?id=${deletingDevice.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await loadDevices(); // Refresh the list
        setShowDeleteDialog(false);
        setDeletingDevice(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '디바이스 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Device deletion error:', error);
      alert(error instanceof Error ? error.message : '디바이스 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'server':
      case '서버':
        return <Server className="w-4 h-4 text-blue-600" />;
      case 'switch':
      case '스위치':
        return <Network className="w-4 h-4 text-green-600" />;
      case 'router':
      case '라우터':
        return <Wifi className="w-4 h-4 text-purple-600" />;
      case 'storage':
      case '스토리지':
        return <Database className="w-4 h-4 text-orange-600" />;
      default:
        return <Monitor className="w-4 h-4 text-gray-600" />;
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
      case 'decommissioned':
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
        return '점검';
      case 'decommissioned':
        return '폐기';
      default:
        return status;
    }
  };

  const getDeviceTypeText = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'server':
        return '서버';
      case 'switch':
        return '스위치';
      case 'router':
        return '라우터';
      case 'storage':
        return '스토리지';
      case 'firewall':
        return '방화벽';
      default:
        return deviceType;
    }
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = 
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.model && device.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (device.serial_number && device.serial_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (device.primary_ip && device.primary_ip.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = !deviceTypeFilter || device.device_type === deviceTypeFilter;
    const matchesStatus = !statusFilter || device.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // 통계 계산
  const deviceTypes = [...new Set(devices.map(d => d.device_type))];
  const stats = {
    total: filteredDevices.length,
    active: filteredDevices.filter(d => d.status === 'active').length,
    inactive: filteredDevices.filter(d => d.status === 'inactive').length,
    maintenance: filteredDevices.filter(d => d.status === 'maintenance').length,
    decommissioned: filteredDevices.filter(d => d.status === 'decommissioned').length
  };

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
            <Monitor className="w-6 h-6 text-orange-600" />
            디바이스 관리
          </h1>
          <p className="text-gray-600 mt-1">네트워크 디바이스를 관리하고 IPAM 시스템과 연결합니다.</p>
        </div>
        <button 
          onClick={handleCreateDevice}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          디바이스 추가
        </button>
      </div>


      {/* 필터 및 검색 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="디바이스명, 모델, 시리얼 번호, IP로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          
          <select
            value={deviceTypeFilter}
            onChange={(e) => setDeviceTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">모든 타입</option>
            {deviceTypes.map((type) => (
              <option key={type} value={type}>
                {getDeviceTypeText(type)}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">모든 상태</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
            <option value="maintenance">점검</option>
            <option value="decommissioned">폐기</option>
          </select>
        </div>

        {/* 통계 요약 */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">총</span>
            <span className="font-medium">{stats.total}개</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-gray-600">활성</span>
            <span className="font-medium">{stats.active}개</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
            <span className="text-gray-600">비활성</span>
            <span className="font-medium">{stats.inactive}개</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
            <span className="text-gray-600">점검</span>
            <span className="font-medium">{stats.maintenance}개</span>
          </div>
        </div>
      </div>

      {/* API Connections Section */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center">
            <span className="mr-2">🔗</span> 디바이스 API 연결
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
                    디바이스 API 연결이 없습니다.
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
                      디바이스별
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
                          onClick={() => handleSyncDevices(connection.id)}
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

      {/* 디바이스 목록 - 테이블 형태 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-4 font-medium text-gray-900">디바이스명</th>
                <th className="text-left p-4 font-medium text-gray-900">타입</th>
                <th className="text-left p-4 font-medium text-gray-900">모델</th>
                <th className="text-left p-4 font-medium text-gray-900">시리얼 번호</th>
                <th className="text-left p-4 font-medium text-gray-900">상태</th>
                <th className="text-left p-4 font-medium text-gray-900">할당된 IP</th>
                <th className="text-left p-4 font-medium text-gray-900">담당자</th>
                <th className="text-left p-4 font-medium text-gray-900">랙 위치</th>
                <th className="text-left p-4 font-medium text-gray-900">API 연결</th>
                <th className="text-left p-4 font-medium text-gray-900">작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((device) => (
                <tr key={device.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(device.device_type)}
                      <div>
                        <div className="font-medium text-gray-900">
                          {device.name}
                        </div>
                        {device.description && (
                          <div className="text-sm text-gray-500">
                            {device.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      {getDeviceIcon(device.device_type)}
                      <span className="text-gray-700 text-sm">
                        {getDeviceTypeText(device.device_type)}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-gray-700 text-sm">
                      {device.model || '-'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-gray-700 text-sm font-mono">
                      {device.serial_number || '-'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(device.status)}`}>
                      {getStatusText(device.status)}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      {device.primary_ip ? (
                        <div>
                          <button
                            onClick={() => handleAssignIP(device)}
                            className="flex items-center gap-1 hover:bg-blue-50 rounded p-1 -m-1 transition-colors"
                            title="IP 관리"
                          >
                            <Network className="w-3 h-3 text-blue-500" />
                            <span className="text-sm font-mono text-blue-600">
                              {device.primary_ip}
                            </span>
                            <span className="text-xs text-gray-500">(primary)</span>
                          </button>
                          {device.assigned_ips && device.assigned_ips.length > 1 && (
                            <div className="text-xs text-gray-500 mt-1">
                              +{device.assigned_ips.length - 1}개 추가 IP
                            </div>
                          )}
                        </div>
                      ) : device.status === 'active' ? (
                        <button 
                          onClick={() => handleAssignIP(device)}
                          className="text-red-500 text-sm flex items-center gap-1 hover:text-red-600"
                        >
                          <AlertCircle className="w-3 h-3" />
                          할당된 IP 없음
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="relative">
                      <button 
                        onClick={() => handleShowContacts(device.id)}
                        onDoubleClick={() => handleAssignContact(device)}
                        className="text-gray-700 text-sm flex items-center gap-1 hover:text-gray-900"
                        title="클릭: 담당자 보기, 더블클릭: 담당자 관리"
                      >
                        {device.contact_count && device.contact_count > 0 ? (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{device.contact_count}명</span>
                          </div>
                        ) : (
                          '담당자 없음'
                        )}
                      </button>
                      
                      {/* 담당자 목록 팝오버 */}
                      {showAssignedUsers === device.id && (
                        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-3">
                          {loadingContacts[device.id] ? (
                            <div className="flex items-center justify-center py-4">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <span className="ml-2 text-sm text-gray-500">로딩 중...</span>
                            </div>
                          ) : deviceContacts[device.id]?.length > 0 ? (
                            <div>
                              <div className="space-y-2 mb-3">
                              {deviceContacts[device.id].map((contact) => (
                                <div key={contact.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                                    contact.role === 'primary' ? 'bg-orange-500' :
                                    contact.role === 'backup' ? 'bg-blue-500' :
                                    'bg-gray-500'
                                  }`}>
                                    {contact.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">{contact.name}</div>
                                    <div className="text-xs text-gray-500">{contact.email}</div>
                                  </div>
                                  <span className={`ml-auto px-2 py-1 text-xs rounded ${
                                    contact.role === 'primary' ? 'bg-orange-100 text-orange-700' :
                                    contact.role === 'backup' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {contact.role === 'primary' ? '주 담당' : 
                                     contact.role === 'backup' ? '백업' : '조회'}
                                  </span>
                                </div>
                              ))}
                              </div>
                              <button
                                onClick={() => {
                                  setShowAssignedUsers(null);
                                  handleAssignContact(device);
                                }}
                                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 py-2 border-t"
                              >
                                담당자 관리
                              </button>
                            </div>
                          ) : (
                            <div>
                              <div className="text-center py-4">
                                <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">할당된 담당자가 없습니다</p>
                              </div>
                              <button
                                onClick={() => {
                                  setShowAssignedUsers(null);
                                  handleAssignContact(device);
                                }}
                                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 py-2 border-t"
                              >
                                담당자 할당
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {device.rack_name ? (
                      <div className="text-sm">
                        <div className="text-gray-900">{device.rack_name}</div>
                        {device.rack_position && (
                          <div className="text-gray-500">
                            {device.rack_position}U
                            {device.rack_size > 1 && ` - ${device.rack_position + device.rack_size - 1}U`}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">
                        API 등록됨
                      </span>
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleViewDevice(device)}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded" 
                        title="상세 보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEditDevice(device)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded" 
                        title="수정"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteDevice(device)}
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

        {filteredDevices.length === 0 && (
          <div className="text-center py-12">
            <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {searchTerm || deviceTypeFilter || statusFilter 
                ? '검색 조건에 맞는 디바이스가 없습니다' 
                : '등록된 디바이스가 없습니다'
              }
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || deviceTypeFilter || statusFilter 
                ? '다른 검색 조건을 시도해보세요.' 
                : '첫 번째 디바이스를 추가해보세요.'
              }
            </p>
            {!searchTerm && !deviceTypeFilter && !statusFilter && (
              <button 
                onClick={handleCreateDevice}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                디바이스 추가
              </button>
            )}
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {filteredDevices.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            총 {filteredDevices.length}개의 디바이스
          </div>
        </div>
      )}

      {/* 모달들 */}
      <DeviceFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSubmit={handleFormSubmit}
        device={editingDevice}
        mode={formMode}
      />

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeletingDevice(null);
        }}
        onConfirm={confirmDelete}
        deviceName={deletingDevice?.name || ''}
        isDeleting={isDeleting}
      />

      {ipAssignmentDevice && (
        <IPAssignmentModal
          isOpen={showIPModal}
          onClose={() => {
            setShowIPModal(false);
            setIPAssignmentDevice(null);
          }}
          deviceId={ipAssignmentDevice.id}
          deviceName={ipAssignmentDevice.name}
          onAssignmentChange={loadDevices}
        />
      )}

      {contactAssignmentDevice && (
        <ContactAssignmentModal
          isOpen={showContactModal}
          onClose={() => {
            setShowContactModal(false);
            setContactAssignmentDevice(null);
            // Clear cached contacts to force refresh
            setDeviceContacts({});
          }}
          deviceId={contactAssignmentDevice.id}
          deviceName={contactAssignmentDevice.name}
        />
      )}

      {/* Device Field Mapping Modal */}
      {selectedApiConnection && (
        <DeviceFieldMappingModal
          isOpen={mappingModalOpen}
          onClose={() => {
            setMappingModalOpen(false);
            setSelectedApiConnection(null);
          }}
          apiConnection={selectedApiConnection}
          onSave={handleSaveFieldMapping}
        />
      )}

      {/* Sync History Modal */}
      <SyncHistoryModal
        isOpen={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setSelectedConnectionForHistory(undefined);
        }}
        connectionId={selectedConnectionForHistory}
      />

      {/* 클릭 외부 영역 시 팝오버 닫기 */}
      {showAssignedUsers && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setShowAssignedUsers(null)}
        />
      )}

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}