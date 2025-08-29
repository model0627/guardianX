'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Building2, 
  ArrowLeft,
  MapPin,
  Users,
  Phone,
  Mail,
  Calendar,
  Edit,
  Trash2,
  Server,
  Settings
} from 'lucide-react';

interface Office {
  id: string;
  name: string;
  description?: string;
  address: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at?: string;
  server_rooms_count?: number;
  devices_count?: number;
}

export default function OfficeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [office, setOffice] = useState<Office | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadOfficeDetail(params.id as string);
    }
  }, [params.id]);

  const loadOfficeDetail = async (officeId: string) => {
    try {
      console.log('[DEBUG] Loading office detail for ID:', officeId);
      const response = await fetch(`/api/ipam/offices?id=${officeId}`, {
        method: 'GET',
        credentials: 'include'
      });

      console.log('[DEBUG] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG] Office data received:', data);
        setOffice(data.office);
      } else {
        const errorData = await response.text();
        console.error('[DEBUG] API Error:', response.status, errorData);
        if (response.status === 404) {
          router.push('/ipam/offices');
        }
      }
    } catch (error) {
      console.error('Failed to load office detail:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (!office) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">사무실을 찾을 수 없습니다</h3>
        <button
          onClick={() => router.push('/ipam/offices')}
          className="text-orange-600 hover:text-orange-700 font-medium"
        >
          목록으로 돌아가기
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
            onClick={() => router.push('/ipam/offices')}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-orange-600" />
              {office.name}
            </h1>
            <p className="text-gray-600 mt-1">사무실 상세 정보</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <Edit className="w-4 h-4" />
            수정
          </button>
          <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">기본 정보</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">사무실명</label>
              <p className="text-gray-800 mt-1">{office.name}</p>
            </div>
            
            {office.description && (
              <div>
                <label className="text-sm font-medium text-gray-500">설명</label>
                <p className="text-gray-800 mt-1">{office.description}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-gray-500">주소</label>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4 text-gray-400" />
                <p className="text-gray-800">{office.address}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {office.contact_person && (
              <div>
                <label className="text-sm font-medium text-gray-500">담당자</label>
                <div className="flex items-center gap-2 mt-1">
                  <Users className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-800">{office.contact_person}</p>
                </div>
              </div>
            )}
            
            {office.phone && (
              <div>
                <label className="text-sm font-medium text-gray-500">전화번호</label>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-800">{office.phone}</p>
                </div>
              </div>
            )}
            
            {office.email && (
              <div>
                <label className="text-sm font-medium text-gray-500">이메일</label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-800">{office.email}</p>
                </div>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-gray-500">생성일</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                <p className="text-gray-800">{new Date(office.created_at).toLocaleDateString('ko-KR')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 통계 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">서버실</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{office.server_rooms_count || 0}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Server className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">디바이스</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{office.devices_count || 0}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Settings className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 관련 항목들 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">관련 항목</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Server className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">서버실</h3>
                <p className="text-sm text-gray-500">{office.server_rooms_count || 0}개의 서버실</p>
              </div>
            </div>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              관리하기 →
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Settings className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">디바이스</h3>
                <p className="text-sm text-gray-500">{office.devices_count || 0}개의 디바이스</p>
              </div>
            </div>
            <button className="text-green-600 hover:text-green-700 text-sm font-medium">
              관리하기 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}