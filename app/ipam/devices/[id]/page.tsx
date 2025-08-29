'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Monitor, 
  ArrowLeft,
  Edit,
  Trash2,
  Server,
  Database,
  Wifi,
  Network,
  AlertCircle,
  MapPin,
  Calendar,
  Zap,
  Shield,
  Settings,
  Building2
} from 'lucide-react';
import DeviceFormModal from '../components/DeviceFormModal';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import IPAssignmentModal from '../components/IPAssignmentModal';

interface Device {
  id: string;
  name: string;
  description?: string;
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
  updated_at: string;
  primary_ip?: string;
  assigned_ips?: string[];
  server_room_name?: string;
  office_name?: string;
}

export default function DeviceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const deviceId = params.id as string;
  
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showIPModal, setShowIPModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (deviceId) {
      loadDevice();
    }
  }, [deviceId]);

  const loadDevice = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/ipam/devices?id=${deviceId}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setDevice(data.device);
      } else if (response.status === 404) {
        setError('디바이스를 찾을 수 없습니다.');
      } else {
        const errorData = await response.json();
        setError(errorData.error || '디바이스 정보를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to load device:', error);
      setError('디바이스 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'server':
      case '서버':
        return <Server className="w-6 h-6 text-blue-600" />;
      case 'switch':
      case '스위치':
        return <Network className="w-6 h-6 text-green-600" />;
      case 'router':
      case '라우터':
        return <Wifi className="w-6 h-6 text-purple-600" />;
      case 'storage':
      case '스토리지':
        return <Database className="w-6 h-6 text-orange-600" />;
      default:
        return <Monitor className="w-6 h-6 text-gray-600" />;
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
      case 'load_balancer':
        return '로드밸런서';
      case 'ups':
        return 'UPS';
      case 'other':
        return '기타';
      default:
        return deviceType;
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('ko-KR');
    } catch {
      return dateString;
    }
  };

  const handleFormSubmit = async (deviceData: any) => {
    try {
      const response = await fetch(`/api/ipam/devices?id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(deviceData)
      });

      if (response.ok) {
        await loadDevice(); // Refresh device data
        setShowFormModal(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '디바이스 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Device update error:', error);
      throw error;
    }
  };

  const confirmDelete = async () => {
    if (!device) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/ipam/devices?id=${deviceId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        router.push('/ipam/devices'); // Redirect back to devices list
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

  if (error || !device) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          {error || '디바이스를 찾을 수 없습니다'}
        </h3>
        <button
          onClick={() => router.push('/ipam/devices')}
          className="text-blue-600 hover:text-blue-800"
        >
          디바이스 목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/ipam/devices')}
            className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-3 rounded-lg">
              {getDeviceIcon(device.device_type)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{device.name}</h1>
              <p className="text-gray-600">{getDeviceTypeText(device.device_type)}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFormModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Edit className="w-4 h-4" />
            수정
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
        </div>
      </div>

      {/* 상태 및 기본 정보 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 기본 정보 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-600" />
              기본 정보
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">디바이스명</label>
                <p className="text-gray-900">{device.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">상태</label>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(device.status)}`}>
                  {getStatusText(device.status)}
                </span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">제조사</label>
                <p className="text-gray-900">{device.manufacturer || '-'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">모델</label>
                <p className="text-gray-900">{device.model || '-'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">시리얼 번호</label>
                <p className="text-gray-900 font-mono">{device.serial_number || '-'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">전력 소비량</label>
                <p className="text-gray-900">
                  {device.power_consumption ? `${device.power_consumption}W` : '-'}
                </p>
              </div>
            </div>
            
            {device.description && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-500 mb-1">설명</label>
                <p className="text-gray-900">{device.description}</p>
              </div>
            )}
          </div>

          {/* 위치 정보 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-600" />
              위치 정보
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">사무실</label>
                <p className="text-gray-900">{device.office_name || '-'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">서버실</label>
                <p className="text-gray-900">{device.server_room_name || '-'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">랙</label>
                <p className="text-gray-900">{device.rack_name || '-'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">랙 위치</label>
                <p className="text-gray-900">
                  {device.rack_position ? (
                    <>
                      {device.rack_position}U
                      {device.rack_size > 1 && ` - ${device.rack_position + device.rack_size - 1}U`}
                      <span className="text-gray-500 ml-2">({device.rack_size}U 사용)</span>
                    </>
                  ) : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* 구매 및 보증 정보 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              구매 및 보증 정보
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">구매일</label>
                <p className="text-gray-900">{formatDate(device.purchase_date)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">보증 종료일</label>
                <p className="text-gray-900">{formatDate(device.warranty_end)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">등록일</label>
                <p className="text-gray-900">{formatDate(device.created_at)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">수정일</label>
                <p className="text-gray-900">{formatDate(device.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 사이드바 - IP 정보 */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Network className="w-5 h-5 text-blue-600" />
              IP 주소 정보
            </h3>
            
            {device.primary_ip ? (
              <div className="space-y-3">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">Primary IP</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">주</span>
                  </div>
                  <div className="text-lg font-mono text-blue-800 mt-1">
                    {device.primary_ip}
                  </div>
                </div>
                
                {device.assigned_ips && device.assigned_ips.length > 1 && (
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">추가 IP 주소</div>
                    <div className="space-y-2">
                      {device.assigned_ips
                        .filter(ip => ip !== device.primary_ip)
                        .map((ip, index) => (
                          <div key={index} className="bg-gray-50 p-2 rounded text-sm font-mono text-gray-700">
                            {ip}
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-200">
                  <button 
                    onClick={() => setShowIPModal(true)}
                    className="w-full py-2 text-blue-600 hover:text-blue-800 text-sm font-medium hover:bg-blue-50 rounded transition-colors"
                  >
                    IP 관리
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">할당된 IP 주소가 없습니다</p>
                <button 
                  onClick={() => setShowIPModal(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm mt-2"
                >
                  IP 주소 할당하기
                </button>
              </div>
            )}
          </div>

          {/* API 연결 상태 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-600" />
              API 연결 상태
            </h3>
            
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium">
                API 등록됨
              </span>
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </div>
            
            <p className="text-sm text-gray-600 mt-2">
              이 디바이스는 IPAM 시스템에 등록되어 관리되고 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 모달들 */}
      <DeviceFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSubmit={handleFormSubmit}
        device={device}
        mode="edit"
      />

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        deviceName={device.name}
        isDeleting={isDeleting}
      />

      <IPAssignmentModal
        isOpen={showIPModal}
        onClose={() => setShowIPModal(false)}
        deviceId={device.id}
        deviceName={device.name}
        onAssignmentChange={loadDevice}
      />
    </div>
  );
}