'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Server, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building2,
  Calendar,
  Thermometer,
  Droplets,
  Eye,
  MapPin
} from 'lucide-react';
import ServerRoomFormModal from './components/ServerRoomFormModal';
import DeleteConfirmDialog from '../offices/components/DeleteConfirmDialog';

interface ServerRoom {
  id: string;
  name: string;
  description?: string;
  office_id: string;
  office_name: string;
  floor?: string;
  room_number?: string;
  temperature_monitoring?: boolean;
  humidity_monitoring?: boolean;
  access_control?: boolean;
  created_at: string;
  racks_count?: number;
  devices_count?: number;
}

export default function ServerRoomsPage() {
  const router = useRouter();
  const [serverRooms, setServerRooms] = useState<ServerRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedServerRoom, setSelectedServerRoom] = useState<ServerRoom | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // 페이지 타이틀 설정
    document.title = '서버실 관리 - GuardianX';
    
    loadServerRooms();
  }, []);

  const loadServerRooms = async () => {
    try {
      const response = await fetch('/api/ipam/server-rooms', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setServerRooms(data.serverRooms || []);
      }
    } catch (error) {
      console.error('Failed to load server rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateServerRoom = () => {
    setSelectedServerRoom(null);
    setFormMode('create');
    setShowFormModal(true);
  };

  const handleEditServerRoom = (serverRoom: ServerRoom) => {
    setSelectedServerRoom(serverRoom);
    setFormMode('edit');
    setShowFormModal(true);
  };

  const handleDeleteServerRoom = (serverRoom: ServerRoom) => {
    setSelectedServerRoom(serverRoom);
    setShowDeleteDialog(true);
  };

  const handleViewServerRoom = (serverRoom: ServerRoom) => {
    router.push(`/ipam/server-rooms/${serverRoom.id}`);
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      const url = '/api/ipam/server-rooms';
      const method = formMode === 'create' ? 'POST' : 'PUT';
      const body = formMode === 'edit' ? { ...formData, id: selectedServerRoom?.id } : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await loadServerRooms();
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

  const confirmDelete = async () => {
    if (!selectedServerRoom) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/ipam/server-rooms', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id: selectedServerRoom.id })
      });

      if (response.ok) {
        await loadServerRooms();
        setShowDeleteDialog(false);
        setSelectedServerRoom(null);
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

  const filteredServerRooms = serverRooms.filter(serverRoom =>
    serverRoom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    serverRoom.office_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (serverRoom.floor && serverRoom.floor.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (serverRoom.room_number && serverRoom.room_number.toLowerCase().includes(searchTerm.toLowerCase()))
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
            <Server className="w-6 h-6 text-blue-600" />
            서버실 관리
          </h1>
          <p className="text-gray-600 mt-1">사무실 내 서버실을 관리합니다.</p>
        </div>
        <button
          onClick={handleCreateServerRoom}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          서버실 추가
        </button>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="서버실명, 사무실명 또는 층수로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="text-sm text-gray-500">
            총 {filteredServerRooms.length}개 서버실
          </div>
        </div>
      </div>

      {/* 서버실 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServerRooms.map((serverRoom) => (
          <div key={serverRoom.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Server className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{serverRoom.name}</h3>
                  {serverRoom.description && (
                    <p className="text-sm text-gray-500 mt-1">{serverRoom.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => handleViewServerRoom(serverRoom)}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded"
                  title="상세 보기"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleEditServerRoom(serverRoom)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="수정"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteServerRoom(serverRoom)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="w-4 h-4" />
                <span>{serverRoom.office_name}</span>
              </div>

              {serverRoom.floor && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{serverRoom.floor}층</span>
                </div>
              )}

              {serverRoom.room_number && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                    {serverRoom.room_number}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm text-gray-600">
                {serverRoom.temperature_monitoring && (
                  <div className="flex items-center gap-1">
                    <Thermometer className="w-4 h-4 text-orange-500" />
                    <span className="text-xs">온도</span>
                  </div>
                )}
                {serverRoom.humidity_monitoring && (
                  <div className="flex items-center gap-1">
                    <Droplets className="w-4 h-4 text-blue-500" />
                    <span className="text-xs">습도</span>
                  </div>
                )}
                {serverRoom.access_control && (
                  <div className="flex items-center gap-1">
                    <span className="w-4 h-4 text-green-500 text-xs">🔒</span>
                    <span className="text-xs">보안</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>생성일: {new Date(serverRoom.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">랙</span>
                <span className="font-medium">{serverRoom.racks_count || 0}개</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">디바이스</span>
                <span className="font-medium">{serverRoom.devices_count || 0}개</span>
              </div>
            </div>

            <div className="mt-4">
              <button 
                onClick={() => handleViewServerRoom(serverRoom)}
                className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 px-4 rounded-lg transition-colors text-sm font-medium"
              >
                상세 보기
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredServerRooms.length === 0 && (
        <div className="text-center py-12">
          <Server className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">등록된 서버실이 없습니다</h3>
          <p className="text-gray-600 mb-6">첫 번째 서버실을 추가해보세요.</p>
          <button
            onClick={handleCreateServerRoom}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            서버실 추가
          </button>
        </div>
      )}

      {/* 서버실 폼 모달 */}
      <ServerRoomFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSubmit={handleFormSubmit}
        serverRoom={selectedServerRoom || undefined}
        mode={formMode}
      />

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="서버실 삭제"
        message={`'${selectedServerRoom?.name}' 서버실을 정말 삭제하시겠습니까?\n\n삭제된 서버실은 복구할 수 없으며, 연관된 데이터가 있는 경우 삭제가 제한될 수 있습니다.`}
        confirmText="삭제"
        isDeleting={isDeleting}
      />
    </div>
  );
}