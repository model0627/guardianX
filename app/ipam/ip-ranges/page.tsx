'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Network, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Globe,
  Calendar,
  Eye,
  Wifi,
  Shield
} from 'lucide-react';
import IPRangeFormModal from './components/IPRangeFormModal';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';

interface IPRange {
  id: string;
  name: string;
  description?: string;
  network_address: string;
  subnet_mask: number;
  gateway?: string;
  dns_servers?: string[];
  vlan_id?: number;
  ip_version: number;
  created_at: string;
  total_ips: number;
  used_ips: number;
  available_ips: number;
  usage_percentage: number;
}

export default function IPRangesPage() {
  const router = useRouter();
  const [ipRanges, setIPRanges] = useState<IPRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedIPRange, setSelectedIPRange] = useState<IPRange | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ipRangeToDelete, setIPRangeToDelete] = useState<IPRange | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toasts, success, error, removeToast } = useToast();

  useEffect(() => {
    // 페이지 타이틀 설정
    document.title = 'IP 대역 관리 - GuardianX';
    
    loadIPRanges();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage > 80) return 'text-red-600 bg-red-100';
    if (percentage > 60) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  const getUsageBarColor = (percentage: number) => {
    if (percentage > 80) return 'bg-red-500';
    if (percentage > 60) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getIPv4CIDR = (networkAddress: string, subnetMask: number) => {
    return `${networkAddress}/${subnetMask}`;
  };

  const handleCreateIPRange = () => {
    setSelectedIPRange(null);
    setFormMode('create');
    setShowFormModal(true);
  };

  const handleEditIPRange = (ipRange: IPRange) => {
    setSelectedIPRange(ipRange);
    setFormMode('edit');
    setShowFormModal(true);
  };

  const handleDeleteIPRange = (ipRange: IPRange) => {
    setIPRangeToDelete(ipRange);
    setShowDeleteDialog(true);
  };

  const confirmDeleteIPRange = async () => {
    if (!ipRangeToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/ipam/ip-ranges?id=${ipRangeToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        success(data.message || 'IP 대역이 성공적으로 삭제되었습니다.');
        await loadIPRanges();
        setShowDeleteDialog(false);
      } else {
        throw new Error(data.error || 'IP 대역 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      error(err instanceof Error ? err.message : 'IP 대역 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      const url = '/api/ipam/ip-ranges';
      const method = formMode === 'create' ? 'POST' : 'PUT';
      const body = formMode === 'edit' ? { ...formData, id: selectedIPRange?.id } : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await loadIPRanges();
        setShowFormModal(false);
      } else {
        const data = await response.json();
        throw new Error(data.error || '작업에 실패했습니다.');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      throw error;
    }
  };

  const filteredIPRanges = ipRanges.filter(ipRange =>
    ipRange.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ipRange.network_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ipRange.description && ipRange.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            <Network className="w-6 h-6 text-blue-600" />
            IP 대역 관리
          </h1>
          <p className="text-gray-600 mt-1">네트워크 IP 대역을 관리합니다.</p>
        </div>
        <button 
          onClick={handleCreateIPRange}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          IP 대역 추가
        </button>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="IP 대역명, 네트워크 주소 또는 설명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="text-sm text-gray-500">
            총 {filteredIPRanges.length}개 IP 대역
          </div>
        </div>
      </div>

      {/* IP 대역 목록 - 테이블 형태 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-4 font-medium text-gray-900">네트워크</th>
                <th className="text-left p-4 font-medium text-gray-900">대역명</th>
                <th className="text-left p-4 font-medium text-gray-900">게이트웨이</th>
                <th className="text-left p-4 font-medium text-gray-900">VLAN</th>
                <th className="text-left p-4 font-medium text-gray-900">사용률</th>
                <th className="text-left p-4 font-medium text-gray-900">IP 현황</th>
                <th className="text-left p-4 font-medium text-gray-900">작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredIPRanges.map((ipRange) => (
                <tr key={ipRange.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-100 p-1 rounded">
                        <Network className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {getIPv4CIDR(ipRange.network_address, ipRange.subnet_mask)}
                        </div>
                        <div className="text-sm text-gray-500">
                          IPv{ipRange.ip_version}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="font-medium text-gray-900">{ipRange.name}</div>
                      {ipRange.description && (
                        <div className="text-sm text-gray-500">{ipRange.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{ipRange.gateway || '-'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {ipRange.vlan_id ? (
                      <div className="flex items-center gap-1">
                        <Wifi className="w-4 h-4 text-purple-500" />
                        <span className="text-gray-700">VLAN {ipRange.vlan_id}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUsageColor(ipRange.usage_percentage)}`}>
                          {ipRange.usage_percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${getUsageBarColor(ipRange.usage_percentage)}`}
                          style={{ width: `${ipRange.usage_percentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-600">
                      <div>사용: {ipRange.used_ips.toLocaleString()}</div>
                      <div>사용가능: {ipRange.available_ips.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">총 {ipRange.total_ips.toLocaleString()}개</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <button className="p-1 text-gray-400 hover:text-blue-600 rounded" title="상세 보기">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEditIPRange(ipRange)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded" 
                        title="수정"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteIPRange(ipRange)}
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

        {filteredIPRanges.length === 0 && (
          <div className="text-center py-12">
            <Network className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">등록된 IP 대역이 없습니다</h3>
            <p className="text-gray-600 mb-6">첫 번째 IP 대역을 추가해보세요.</p>
            <button 
              onClick={handleCreateIPRange}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              IP 대역 추가
            </button>
          </div>
        )}
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">총 IP 대역</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{ipRanges.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Network className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">총 IP 주소</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {ipRanges.reduce((sum, range) => sum + range.total_ips, 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Globe className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">사용중인 IP</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {ipRanges.reduce((sum, range) => sum + range.used_ips, 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <Shield className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">사용가능한 IP</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {ipRanges.reduce((sum, range) => sum + range.available_ips, 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Wifi className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* IP 대역 폼 모달 */}
      <IPRangeFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSubmit={handleFormSubmit}
        ipRange={selectedIPRange || undefined}
        mode={formMode}
      />

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteIPRange}
        title="IP 대역 삭제"
        message={ipRangeToDelete ? `'${ipRangeToDelete.name}' IP 대역을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.` : ''}
        confirmText="삭제"
        isDeleting={isDeleting}
      />

      {/* Toast 메시지 */}
      <ToastContainer
        toasts={toasts}
        onRemoveToast={removeToast}
      />
    </div>
  );
}