'use client';

import { useState, useEffect } from 'react';
import { X, Network, Search, AlertCircle, Plus, Trash2 } from 'lucide-react';

interface AvailableIP {
  id: string;
  ip_address: string;
  status: string;
  description?: string;
  range_name: string;
  office_name: string;
  server_room_name?: string;
}

interface AssignedIP {
  id: string;
  device_id: string;
  ip_address_id: string;
  is_primary: boolean;
  created_at: string;
  ip_address: string;
  ip_status: string;
  range_name: string;
}

interface IPAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  deviceName: string;
  onAssignmentChange: () => void;
}

export default function IPAssignmentModal({
  isOpen,
  onClose,
  deviceId,
  deviceName,
  onAssignmentChange
}: IPAssignmentModalProps) {
  const [availableIPs, setAvailableIPs] = useState<AvailableIP[]>([]);
  const [assignedIPs, setAssignedIPs] = useState<AssignedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assign' | 'manage'>('assign');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, deviceId]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadAvailableIPs(),
        loadAssignedIPs()
      ]);
    } catch (error) {
      console.error('Failed to load IP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableIPs = async () => {
    try {
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/ipam/available-ips?${params}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableIPs(data.available_ips || []);
      }
    } catch (error) {
      console.error('Failed to load available IPs:', error);
    }
  };

  const loadAssignedIPs = async () => {
    try {
      const response = await fetch(`/api/ipam/device-ip-mappings?device_id=${deviceId}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAssignedIPs(data.mappings || []);
      }
    } catch (error) {
      console.error('Failed to load assigned IPs:', error);
    }
  };

  const handleAssignIP = async (ipAddress: AvailableIP, isPrimary: boolean = false) => {
    try {
      setIsAssigning(true);
      
      const response = await fetch('/api/ipam/device-ip-mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          device_id: deviceId,
          ip_address_id: ipAddress.id,
          is_primary: isPrimary
        })
      });

      if (response.ok) {
        await loadData(); // Refresh data
        onAssignmentChange(); // Notify parent component
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'IP 할당에 실패했습니다.');
      }
    } catch (error) {
      console.error('IP assignment error:', error);
      alert('IP 할당에 실패했습니다.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassignIP = async (mapping: AssignedIP) => {
    try {
      setIsUnassigning(mapping.id);
      
      const response = await fetch(`/api/ipam/device-ip-mappings?mapping_id=${mapping.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await loadData(); // Refresh data
        onAssignmentChange(); // Notify parent component
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'IP 해제에 실패했습니다.');
      }
    } catch (error) {
      console.error('IP unassignment error:', error);
      alert('IP 해제에 실패했습니다.');
    } finally {
      setIsUnassigning(null);
    }
  };

  const handleSetPrimary = async (mapping: AssignedIP) => {
    try {
      setIsAssigning(true);
      
      // First, set all other IPs for this device to non-primary
      const response1 = await fetch('/api/ipam/device-ip-mappings/set-primary', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          device_id: deviceId,
          mapping_id: mapping.id
        })
      });

      if (response1.ok) {
        await loadData(); // Refresh data
        onAssignmentChange(); // Notify parent component
      } else {
        const errorData = await response1.json();
        alert(errorData.error || '주 IP 설정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Set primary IP error:', error);
      alert('주 IP 설정에 실패했습니다.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'assign') {
      const debounceTimer = setTimeout(() => {
        loadAvailableIPs();
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [searchTerm, isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Network className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">IP 주소 관리</h2>
              <p className="text-gray-600 text-sm">{deviceName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('assign')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'assign'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            IP 할당
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'manage'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            할당된 IP 관리 ({assignedIPs.length})
          </button>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'assign' ? (
            <div className="p-6 space-y-4">
              {/* 검색 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="IP 주소로 검색..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 사용 가능한 IP 목록 */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>로딩 중...</span>
                  </div>
                </div>
              ) : availableIPs.length === 0 ? (
                <div className="text-center py-12">
                  <Network className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    사용 가능한 IP 주소가 없습니다
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm ? '검색 조건에 맞는 ' : ''}사용 가능한 IP 주소를 찾을 수 없습니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableIPs.map((ip) => (
                    <div
                      key={ip.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-medium text-gray-900">
                            {ip.ip_address}
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                            사용가능
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {ip.range_name} • {ip.office_name}
                          {ip.server_room_name && ` • ${ip.server_room_name}`}
                        </div>
                        {ip.description && (
                          <div className="text-sm text-gray-500 mt-1">{ip.description}</div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAssignIP(ip, false)}
                          disabled={isAssigning}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors disabled:opacity-50"
                        >
                          {assignedIPs.length === 0 ? '주 IP로 할당' : '보조 IP로 할당'}
                        </button>
                        {assignedIPs.length > 0 && (
                          <button
                            onClick={() => handleAssignIP(ip, true)}
                            disabled={isAssigning || assignedIPs.some(a => a.is_primary)}
                            className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded transition-colors disabled:opacity-50"
                          >
                            주 IP로 변경
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {/* 할당된 IP 목록 */}
              {assignedIPs.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    할당된 IP 주소가 없습니다
                  </h3>
                  <p className="text-gray-600">
                    'IP 할당' 탭에서 이 디바이스에 IP 주소를 할당해보세요.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assignedIPs.map((mapping) => (
                    <div
                      key={mapping.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-medium text-gray-900">
                            {mapping.ip_address}
                          </span>
                          {mapping.is_primary ? (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                              주 IP
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              보조 IP
                            </span>
                          )}
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                            할당됨
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {mapping.range_name} • 할당일: {new Date(mapping.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {!mapping.is_primary && (
                          <button
                            onClick={() => handleSetPrimary(mapping)}
                            disabled={isAssigning}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded transition-colors disabled:opacity-50"
                            title="주 IP로 설정"
                          >
                            <Network className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleUnassignIP(mapping)}
                          disabled={isUnassigning === mapping.id}
                          className="p-2 text-gray-400 hover:text-red-600 rounded transition-colors disabled:opacity-50"
                          title="IP 해제"
                        >
                          {isUnassigning === mapping.id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}