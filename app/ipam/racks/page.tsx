'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Database, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Server,
  Building2,
  Calendar,
  Eye,
  Hash
} from 'lucide-react';
import RackFormModal from './components/RackFormModal';
import DeleteConfirmDialog from '../offices/components/DeleteConfirmDialog';

interface Rack {
  id: string;
  name: string;
  rack_number?: string;
  server_room_id: string;
  server_room_name: string;
  office_name: string;
  size_u: number;
  used_u: number;
  usage_percentage: number;
  description?: string;
  created_at: string;
  device_count: number;
}

export default function RacksPage() {
  const router = useRouter();
  const [racks, setRacks] = useState<Rack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // 페이지 타이틀 설정
    document.title = '랙 관리 - GuardianX';
    
    loadRacks();
  }, []);

  const loadRacks = async () => {
    try {
      const response = await fetch('/api/ipam/racks', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setRacks(data.racks || []);
      }
    } catch (error) {
      console.error('Failed to load racks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRack = () => {
    setSelectedRack(null);
    setFormMode('create');
    setShowFormModal(true);
  };

  const handleEditRack = (rack: Rack) => {
    setSelectedRack(rack);
    setFormMode('edit');
    setShowFormModal(true);
  };

  const handleDeleteRack = (rack: Rack) => {
    setSelectedRack(rack);
    setShowDeleteDialog(true);
  };

  const handleViewRack = (rack: Rack) => {
    router.push(`/ipam/racks/${rack.id}`);
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      const url = '/api/ipam/racks';
      const method = formMode === 'create' ? 'POST' : 'PUT';
      const body = formMode === 'edit' ? { ...formData, id: selectedRack?.id } : formData;

      console.log('Submitting rack data:', body); // 디버그 로그 추가

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      console.log('Response status:', response.status); // 디버그 로그 추가

      if (response.ok) {
        const result = await response.json();
        console.log('Success result:', result); // 디버그 로그 추가
        await loadRacks();
        setShowFormModal(false);
      } else {
        const data = await response.json();
        console.error('Error response:', data); // 디버그 로그 추가
        throw new Error(data.error || `작업에 실패했습니다. (${response.status})`);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      throw error;
    }
  };

  const confirmDelete = async () => {
    if (!selectedRack) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/ipam/racks', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id: selectedRack.id })
      });

      if (response.ok) {
        await loadRacks();
        setShowDeleteDialog(false);
        setSelectedRack(null);
      } else {
        const data = await response.json();
        throw new Error(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
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

  const filteredRacks = racks.filter(rack =>
    rack.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rack.server_room_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rack.office_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rack.rack_number && rack.rack_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-purple-600">
          <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
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
            <Database className="w-6 h-6 text-purple-600" />
            랙 관리
          </h1>
          <p className="text-gray-600 mt-1">서버실 내 랙을 관리합니다.</p>
        </div>
        <button
          onClick={handleCreateRack}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          랙 추가
        </button>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="랙명, 서버실명, 사무실명 또는 랙번호로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div className="text-sm text-gray-500">
            총 {filteredRacks.length}개 랙
          </div>
        </div>
      </div>

      {/* 랙 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRacks.map((rack) => (
          <div key={rack.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Database className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{rack.name}</h3>
                  {rack.rack_number && (
                    <div className="flex items-center gap-1 mt-1">
                      <Hash className="w-3 h-3 text-gray-400" />
                      <span className="text-sm text-gray-500">{rack.rack_number}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => handleViewRack(rack)}
                  className="p-1 text-gray-400 hover:text-purple-600 rounded"
                  title="상세 보기"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleEditRack(rack)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="수정"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteRack(rack)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Server className="w-4 h-4" />
                <span>{rack.server_room_name}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="w-4 h-4" />
                <span>{rack.office_name}</span>
              </div>

              {rack.description && (
                <p className="text-sm text-gray-500">{rack.description}</p>
              )}

              {/* 사용률 표시 */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">사용률</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUsageColor(rack.usage_percentage)}`}>
                    {rack.usage_percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getUsageBarColor(rack.usage_percentage)}`}
                    style={{ width: `${rack.usage_percentage}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {rack.used_u} / {rack.size_u}U 사용중
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>생성일: {new Date(rack.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">디바이스</span>
                <span className="font-medium">{rack.device_count || 0}개</span>
              </div>
            </div>

            <div className="mt-4">
              <button 
                onClick={() => handleViewRack(rack)}
                className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 px-4 rounded-lg transition-colors text-sm font-medium"
              >
                상세 보기
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredRacks.length === 0 && (
        <div className="text-center py-12">
          <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">등록된 랙이 없습니다</h3>
          <p className="text-gray-600 mb-6">첫 번째 랙을 추가해보세요.</p>
          <button
            onClick={handleCreateRack}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            랙 추가
          </button>
        </div>
      )}

      {/* 랙 폼 모달 */}
      <RackFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSubmit={handleFormSubmit}
        rack={selectedRack || undefined}
        mode={formMode}
      />

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="랙 삭제"
        message={`'${selectedRack?.name}' 랙을 정말 삭제하시겠습니까?\n\n삭제된 랙은 복구할 수 없으며, 연관된 데이터가 있는 경우 삭제가 제한될 수 있습니다.`}
        confirmText="삭제"
        isDeleting={isDeleting}
      />
    </div>
  );
}