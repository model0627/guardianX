'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MapPin,
  Calendar,
  Users,
  Eye
} from 'lucide-react';
import OfficeFormModal from './components/OfficeFormModal';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';

interface Office {
  id: string;
  name: string;
  description?: string;
  address: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  created_at: string;
  server_rooms_count?: number;
  devices_count?: number;
}

export default function OfficesPage() {
  const router = useRouter();
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // 페이지 타이틀 설정
    document.title = '사무실 관리 - GuardianX';
    
    loadOffices();
  }, []);

  const loadOffices = async () => {
    try {
      const response = await fetch('/api/ipam/offices', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setOffices(data.offices || []);
      }
    } catch (error) {
      console.error('Failed to load offices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOffice = () => {
    setSelectedOffice(null);
    setFormMode('create');
    setShowFormModal(true);
  };

  const handleEditOffice = (office: Office) => {
    setSelectedOffice(office);
    setFormMode('edit');
    setShowFormModal(true);
  };

  const handleDeleteOffice = (office: Office) => {
    setSelectedOffice(office);
    setShowDeleteDialog(true);
  };

  const handleViewOffice = (office: Office) => {
    router.push(`/ipam/offices/${office.id}`);
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      const url = formMode === 'create' ? '/api/ipam/offices' : '/api/ipam/offices';
      const method = formMode === 'create' ? 'POST' : 'PUT';
      const body = formMode === 'edit' ? { ...formData, id: selectedOffice?.id } : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await loadOffices();
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
    if (!selectedOffice) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/ipam/offices', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id: selectedOffice.id })
      });

      if (response.ok) {
        await loadOffices();
        setShowDeleteDialog(false);
        setSelectedOffice(null);
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

  const filteredOffices = offices.filter(office =>
    office.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    office.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-orange-600">
          <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
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
            <Building2 className="w-6 h-6 text-orange-600" />
            사무실 관리
          </h1>
          <p className="text-gray-600 mt-1">조직의 사무실을 관리합니다.</p>
        </div>
        <button
          onClick={handleCreateOffice}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          사무실 추가
        </button>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="사무실명 또는 주소로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="text-sm text-gray-500">
            총 {filteredOffices.length}개 사무실
          </div>
        </div>
      </div>

      {/* 사무실 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOffices.map((office) => (
          <div key={office.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Building2 className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{office.name}</h3>
                  {office.description && (
                    <p className="text-sm text-gray-500 mt-1">{office.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => handleViewOffice(office)}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded"
                  title="상세 보기"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleEditOffice(office)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="수정"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteOffice(office)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{office.address}</span>
              </div>

              {office.contact_person && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{office.contact_person}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>생성일: {new Date(office.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">서버실</span>
                <span className="font-medium">{office.server_rooms_count || 0}개</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">디바이스</span>
                <span className="font-medium">{office.devices_count || 0}개</span>
              </div>
            </div>

            <div className="mt-4">
              <button 
                onClick={() => handleViewOffice(office)}
                className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 px-4 rounded-lg transition-colors text-sm font-medium"
              >
                상세 보기
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredOffices.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">등록된 사무실이 없습니다</h3>
          <p className="text-gray-600 mb-6">첫 번째 사무실을 추가해보세요.</p>
          <button
            onClick={handleCreateOffice}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            사무실 추가
          </button>
        </div>
      )}

      {/* 사무실 폼 모달 */}
      <OfficeFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSubmit={handleFormSubmit}
        office={selectedOffice || undefined}
        mode={formMode}
      />

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="사무실 삭제"
        message={`'${selectedOffice?.name}' 사무실을 정말 삭제하시겠습니까?\n\n삭제된 사무실은 복구할 수 없으며, 연관된 데이터가 있는 경우 삭제가 제한될 수 있습니다.`}
        confirmText="삭제"
        isDeleting={isDeleting}
      />
    </div>
  );
}