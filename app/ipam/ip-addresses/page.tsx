'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Globe, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Network,
  Calendar,
  Eye,
  Wifi,
  Monitor,
  AlertCircle,
  Layers,
  Unlink
} from 'lucide-react';
import BulkIPModal from './components/BulkIPModal';
import DeleteConfirmDialog from '../ip-ranges/components/DeleteConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';

interface IPRange {
  id: string;
  name: string;
  network_address: string;
  subnet_mask: number;
}

interface IPAddress {
  id: string;
  ip_address: string;
  status: 'available' | 'allocated' | 'reserved' | 'disabled';
  hostname?: string;
  description?: string;
  mac_address?: string;
  ip_range_id: string;
  ip_range_name: string;
  lease_start?: string;
  lease_end?: string;
  created_at: string;
  assigned_device?: string;
  assigned_device_id?: string;
  device_is_active?: boolean;
  mapping_id?: string;
  is_primary_ip?: boolean;
}

export default function IPAddressesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ipAddresses, setIPAddresses] = useState<IPAddress[]>([]);
  const [deletedIPAddresses, setDeletedIPAddresses] = useState<IPAddress[]>([]);
  const [ipRanges, setIPRanges] = useState<IPRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRange, setSelectedRange] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedIPAddresses, setSelectedIPAddresses] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showHardDeleteModal, setShowHardDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'soft' | 'hard'>('soft');
  const { toasts, success, error, removeToast } = useToast();

  useEffect(() => {
    // 페이지 타이틀 설정
    document.title = 'IP 주소 관리 - GuardianX';
    
    loadIPRanges();
    loadIPAddresses();
    loadDeletedIPAddresses();
  }, []);

  // 다중선택 관련 함수들
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIPAddresses(filteredIPAddresses.map(ip => ip.id));
    } else {
      setSelectedIPAddresses([]);
    }
  };

  const handleSelectIP = (ipId: string, checked: boolean) => {
    if (checked) {
      setSelectedIPAddresses(prev => [...prev, ipId]);
    } else {
      setSelectedIPAddresses(prev => prev.filter(id => id !== ipId));
    }
  };

  const handleBulkDelete = (mode: 'soft' | 'hard') => {
    if (selectedIPAddresses.length === 0) {
      error('삭제할 IP 주소를 선택해주세요.');
      return;
    }
    setDeleteMode(mode);
    if (mode === 'soft') {
      setShowBulkDeleteModal(true);
    } else {
      setShowHardDeleteModal(true);
    }
  };

  const confirmBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/ipam/ip-addresses/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ip_address_ids: selectedIPAddresses
        })
      });

      const data = await response.json();

      if (response.ok) {
        success(data.message);
        await loadIPAddresses();
        await loadDeletedIPAddresses();
        setSelectedIPAddresses([]);
        setShowBulkDeleteModal(false);
      } else {
        throw new Error(data.error || 'IP 주소 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('Bulk delete error:', err);
      error(err instanceof Error ? err.message : 'IP 주소 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmHardDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/ipam/ip-addresses/hard-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ip_address_ids: selectedIPAddresses
        })
      });

      const data = await response.json();

      if (response.ok) {
        success(data.message);
        await loadIPAddresses();
        await loadDeletedIPAddresses();
        setSelectedIPAddresses([]);
        setShowHardDeleteModal(false);
      } else {
        throw new Error(data.error || 'IP 주소 완전 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('Hard delete error:', err);
      error(err instanceof Error ? err.message : 'IP 주소 완전 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestore = (mode: 'soft' | 'hard') => {
    if (selectedIPAddresses.length === 0) {
      error('복구할 IP 주소를 선택해주세요.');
      return;
    }
    setDeleteMode(mode);
    if (mode === 'soft') {
      confirmRestore();
    } else {
      setShowHardDeleteModal(true); // 복구 후 영구삭제
    }
  };

  const confirmRestore = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/ipam/ip-addresses/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ip_address_ids: selectedIPAddresses
        })
      });

      const data = await response.json();

      if (response.ok) {
        success(data.message);
        await loadIPAddresses();
        await loadDeletedIPAddresses();
        setSelectedIPAddresses([]);
      } else {
        throw new Error(data.error || 'IP 주소 복구에 실패했습니다.');
      }
    } catch (err) {
      console.error('Restore error:', err);
      error(err instanceof Error ? err.message : 'IP 주소 복구에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUnassignIP = async (mappingId: string, ipAddress: string, deviceName: string) => {
    if (!confirm(`IP 주소 '${ipAddress}'를 디바이스 '${deviceName}'에서 할당 해제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch('/api/ipam/ip-addresses/unassign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          mapping_id: mappingId
        })
      });

      const data = await response.json();

      if (response.ok) {
        success(data.message);
        await loadIPAddresses(); // Reload the list to reflect changes
      } else {
        throw new Error(data.error || 'IP 할당 해제에 실패했습니다.');
      }
    } catch (err) {
      console.error('Unassign error:', err);
      error(err instanceof Error ? err.message : 'IP 할당 해제에 실패했습니다.');
    }
  };

  useEffect(() => {
    // URL에서 IP 대역 필터링
    const rangeId = searchParams?.get('range');
    if (rangeId) {
      setSelectedRange(rangeId);
    }
  }, [searchParams]);

  const loadIPRanges = async () => {
    try {
      const response = await fetch('/api/ipam/ip-ranges', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setIPRanges(data.ipRanges || []);
      }
    } catch (error) {
      console.error('Failed to load IP ranges:', error);
    }
  };

  const loadIPAddresses = async () => {
    try {
      const response = await fetch('/api/ipam/ip-addresses', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setIPAddresses(data.ipAddresses || []);
      }
    } catch (error) {
      console.error('Failed to load IP addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeletedIPAddresses = async () => {
    try {
      const response = await fetch('/api/ipam/ip-addresses/deleted', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setDeletedIPAddresses(data.deletedIPAddresses || []);
      }
    } catch (error) {
      console.error('Failed to load deleted IP addresses:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'allocated':
        return 'bg-blue-100 text-blue-700';
      case 'available':
        return 'bg-green-100 text-green-700';
      case 'reserved':
        return 'bg-orange-100 text-orange-700';
      case 'disabled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'allocated':
        return '할당됨';
      case 'available':
        return '사용가능';
      case 'reserved':
        return '예약됨';
      case 'disabled':
        return '비활성';
      default:
        return status;
    }
  };

  const currentIPAddresses = activeTab === 'active' ? ipAddresses : deletedIPAddresses;
  
  const filteredIPAddresses = currentIPAddresses.filter(ip => {
    const matchesSearch = 
      ip.ip_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ip.hostname && ip.hostname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ip.mac_address && ip.mac_address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ip.description && ip.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRange = !selectedRange || ip.ip_range_id === selectedRange;
    const matchesStatus = !statusFilter || ip.status === statusFilter;
    
    return matchesSearch && matchesRange && matchesStatus;
  });

  // 통계 계산
  const stats = {
    total: filteredIPAddresses.length,
    allocated: filteredIPAddresses.filter(ip => ip.status === 'allocated').length,
    available: filteredIPAddresses.filter(ip => ip.status === 'available').length,
    reserved: filteredIPAddresses.filter(ip => ip.status === 'reserved').length,
    disabled: filteredIPAddresses.filter(ip => ip.status === 'disabled').length
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
            <Globe className="w-6 h-6 text-blue-600" />
            IP 주소 관리
          </h1>
          <p className="text-gray-600 mt-1">개별 IP 주소를 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          {selectedIPAddresses.length > 0 && (
            <div className="flex gap-2">
              {activeTab === 'active' ? (
                <>
                  <button
                    onClick={() => handleBulkDelete('soft')}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    일시 삭제 ({selectedIPAddresses.length})
                  </button>
                  <button
                    onClick={() => handleBulkDelete('hard')}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <AlertCircle className="w-4 h-4" />
                    영구 삭제 ({selectedIPAddresses.length})
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleRestore('soft')}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    복구 ({selectedIPAddresses.length})
                  </button>
                  <button
                    onClick={() => handleBulkDelete('hard')}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <AlertCircle className="w-4 h-4" />
                    영구 삭제 ({selectedIPAddresses.length})
                  </button>
                </>
              )}
            </div>
          )}
          {activeTab === 'active' && (
            <>
              <button
                onClick={() => setShowBulkModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Layers className="w-4 h-4" />
                범위로 추가
              </button>
              <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                <Plus className="w-4 h-4" />
                개별 추가
              </button>
            </>
          )}
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => {
              setActiveTab('active');
              setSelectedIPAddresses([]);
            }}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            활성 IP 주소 ({ipAddresses.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('deleted');
              setSelectedIPAddresses([]);
            }}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'deleted'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            삭제된 IP 주소 ({deletedIPAddresses.length})
          </button>
        </nav>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="IP 주소, MAC 주소, 호스트명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">모든 IP 대역</option>
            {ipRanges.map((range) => (
              <option key={range.id} value={range.id}>
                {range.name} ({range.network_address}/{range.subnet_mask})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">모든 상태</option>
            <option value="available">사용가능</option>
            <option value="allocated">할당됨</option>
            <option value="reserved">예약됨</option>
            <option value="disabled">비활성</option>
          </select>
        </div>

        {/* 통계 요약 */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">총</span>
            <span className="font-medium">{stats.total}개</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            <span className="text-gray-600">할당됨</span>
            <span className="font-medium">{stats.allocated}개</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-gray-600">사용가능</span>
            <span className="font-medium">{stats.available}개</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
            <span className="text-gray-600">예약됨</span>
            <span className="font-medium">{stats.reserved}개</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
            <span className="text-gray-600">비활성</span>
            <span className="font-medium">{stats.disabled}개</span>
          </div>
        </div>
      </div>

      {/* IP 주소 목록 - 테이블 형태 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filteredIPAddresses.length > 0 && selectedIPAddresses.length === filteredIPAddresses.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span>IP 주소</span>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  {activeTab === 'active' ? '상태' : '삭제 정보'}
                </th>
                <th className="text-left p-4 font-medium text-gray-900">MAC 주소</th>
                <th className="text-left p-4 font-medium text-gray-900">IP 대역</th>
                <th className="text-left p-4 font-medium text-gray-900">설명</th>
                <th className="text-left p-4 font-medium text-gray-900">작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredIPAddresses.map((ipAddress) => (
                <tr key={ipAddress.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selectedIPAddresses.includes(ipAddress.id) ? 'bg-blue-50' : ''}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIPAddresses.includes(ipAddress.id)}
                        onChange={(e) => handleSelectIP(ipAddress.id, e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <Globe className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="font-medium text-gray-900 font-mono">
                          {ipAddress.ip_address}
                        </div>
                        {ipAddress.hostname && (
                          <div className="text-sm text-gray-500">
                            {ipAddress.hostname}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {activeTab === 'active' ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ipAddress.status)}`}>
                        {getStatusText(ipAddress.status)}
                      </span>
                    ) : (
                      <div className="text-sm">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          삭제됨
                        </span>
                        {(ipAddress as any).updated_at && (
                          <div className="text-gray-500 mt-1">
                            {new Date((ipAddress as any).updated_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {ipAddress.mac_address ? (
                      <span className="text-gray-700 font-mono text-sm">
                        {ipAddress.mac_address}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Network className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 text-sm">
                        {ipAddress.ip_range_name}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="max-w-xs">
                      {ipAddress.assigned_device ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Monitor className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">
                              {ipAddress.assigned_device}
                            </span>
                            {ipAddress.is_primary_ip && (
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                Primary
                              </span>
                            )}
                            {ipAddress.device_is_active === false && (
                              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                                Device Deleted
                              </span>
                            )}
                          </div>
                          {ipAddress.mapping_id && (
                            <button
                              onClick={() => handleUnassignIP(
                                ipAddress.mapping_id!, 
                                ipAddress.ip_address, 
                                ipAddress.assigned_device
                              )}
                              className="text-xs text-orange-600 hover:text-orange-800 flex items-center gap-1"
                              title="할당 해제"
                            >
                              <Unlink className="w-3 h-3" />
                              할당 해제
                            </button>
                          )}
                        </div>
                      ) : ipAddress.description ? (
                        <div className="text-sm text-gray-600">
                          {ipAddress.description}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <button className="p-1 text-gray-400 hover:text-blue-600 rounded" title="상세 보기">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600 rounded" title="수정">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-red-600 rounded" title="삭제">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredIPAddresses.length === 0 && (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {searchTerm || selectedRange || statusFilter 
                ? '검색 조건에 맞는 IP 주소가 없습니다' 
                : activeTab === 'active' 
                  ? '등록된 IP 주소가 없습니다'
                  : '삭제된 IP 주소가 없습니다'
              }
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedRange || statusFilter 
                ? '다른 검색 조건을 시도해보세요.' 
                : activeTab === 'active'
                  ? '첫 번째 IP 주소를 추가해보세요.'
                  : '삭제된 IP 주소가 없습니다.'
              }
            </p>
            {!searchTerm && !selectedRange && !statusFilter && activeTab === 'active' && (
              <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors">
                IP 주소 추가
              </button>
            )}
          </div>
        )}
      </div>

      {/* 페이지네이션 (추후 구현) */}
      {filteredIPAddresses.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            총 {filteredIPAddresses.length}개의 IP 주소
          </div>
          {/* 페이지네이션 버튼들 */}
        </div>
      )}
      {/* Bulk IP Modal */}
      <BulkIPModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={() => {
          loadIPAddresses();
          setShowBulkModal(false);
        }}
      />

      {/* Bulk Delete Confirmation Modal - Soft Delete */}
      <DeleteConfirmDialog
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={confirmBulkDelete}
        title="IP 주소 일시 삭제"
        message={`선택된 ${selectedIPAddresses.length}개의 IP 주소를 일시 삭제하시겠습니까? 나중에 복구할 수 있습니다.`}
        confirmText="일시 삭제"
        isDeleting={isDeleting}
      />

      {/* Hard Delete Confirmation Modal */}
      <DeleteConfirmDialog
        isOpen={showHardDeleteModal}
        onClose={() => setShowHardDeleteModal(false)}
        onConfirm={confirmHardDelete}
        title="⚠️ IP 주소 영구 삭제"
        message={`선택된 ${selectedIPAddresses.length}개의 IP 주소를 영구적으로 삭제하시겠습니까? 이 작업은 절대 되돌릴 수 없으며, 데이터베이스에서 완전히 제거됩니다.`}
        confirmText="영구 삭제"
        isDeleting={isDeleting}
      />

      {/* Toast Messages */}
      <ToastContainer
        toasts={toasts}
        onRemoveToast={removeToast}
      />
    </div>
  );
}