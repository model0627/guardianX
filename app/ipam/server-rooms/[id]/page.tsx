'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Server, 
  ArrowLeft,
  Building2,
  Calendar,
  Edit,
  Trash2,
  Database,
  Settings,
  Thermometer,
  Droplets,
  MapPin
} from 'lucide-react';

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
  updated_at?: string;
  racks_count?: number;
  devices_count?: number;
}

export default function ServerRoomDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [serverRoom, setServerRoom] = useState<ServerRoom | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadServerRoomDetail(params.id as string);
    }
  }, [params.id]);

  const loadServerRoomDetail = async (serverRoomId: string) => {
    try {
      const response = await fetch(`/api/ipam/server-rooms?id=${serverRoomId}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setServerRoom(data.serverRoom);
      } else if (response.status === 404) {
        router.push('/ipam/server-rooms');
      }
    } catch (error) {
      console.error('Failed to load server room detail:', error);
    } finally {
      setLoading(false);
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

  if (!serverRoom) {
    return (
      <div className="text-center py-12">
        <Server className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">서버실을 찾을 수 없습니다</h3>
        <button
          onClick={() => router.push('/ipam/server-rooms')}
          className="text-blue-600 hover:text-blue-700 font-medium"
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
            onClick={() => router.push('/ipam/server-rooms')}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Server className="w-6 h-6 text-blue-600" />
              {serverRoom.name}
            </h1>
            <p className="text-gray-600 mt-1">서버실 상세 정보</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
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
              <label className="text-sm font-medium text-gray-500">서버실명</label>
              <p className="text-gray-800 mt-1">{serverRoom.name}</p>
            </div>
            
            {serverRoom.description && (
              <div>
                <label className="text-sm font-medium text-gray-500">설명</label>
                <p className="text-gray-800 mt-1">{serverRoom.description}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-gray-500">소속 사무실</label>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="w-4 h-4 text-gray-400" />
                <p className="text-gray-800">{serverRoom.office_name}</p>
              </div>
            </div>

            {serverRoom.floor && (
              <div>
                <label className="text-sm font-medium text-gray-500">층수</label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-800">{serverRoom.floor}층</p>
                </div>
              </div>
            )}

            {serverRoom.room_number && (
              <div>
                <label className="text-sm font-medium text-gray-500">호실 번호</label>
                <p className="text-gray-800 mt-1">{serverRoom.room_number}</p>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">모니터링 설정</label>
              <div className="flex items-center gap-4 mt-2">
                {serverRoom.temperature_monitoring && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                    <Thermometer className="w-3 h-3" />
                    온도
                  </span>
                )}
                {serverRoom.humidity_monitoring && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                    <Droplets className="w-3 h-3" />
                    습도
                  </span>
                )}
                {serverRoom.access_control && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                    🔒 출입통제
                  </span>
                )}
                {!serverRoom.temperature_monitoring && !serverRoom.humidity_monitoring && !serverRoom.access_control && (
                  <span className="text-gray-400 text-sm">설정된 모니터링 없음</span>
                )}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">생성일</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                <p className="text-gray-800">{new Date(serverRoom.created_at).toLocaleDateString('ko-KR')}</p>
              </div>
            </div>

            {serverRoom.updated_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">수정일</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-800">{new Date(serverRoom.updated_at).toLocaleDateString('ko-KR')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 통계 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">랙</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{serverRoom.racks_count || 0}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Database className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">디바이스</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{serverRoom.devices_count || 0}</p>
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
              <div className="bg-purple-100 p-2 rounded-lg">
                <Database className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">랙</h3>
                <p className="text-sm text-gray-500">{serverRoom.racks_count || 0}개의 랙</p>
              </div>
            </div>
            <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
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
                <p className="text-sm text-gray-500">{serverRoom.devices_count || 0}개의 디바이스</p>
              </div>
            </div>
            <button className="text-green-600 hover:text-green-700 text-sm font-medium">
              관리하기 →
            </button>
          </div>
        </div>
      </div>

      {/* 모니터링 시스템 상태 */}
      {(serverRoom.temperature_monitoring || serverRoom.humidity_monitoring || serverRoom.access_control) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">모니터링 시스템</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {serverRoom.temperature_monitoring && (
              <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-lg">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Thermometer className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">온도 모니터링</p>
                  <p className="text-sm text-green-600 font-medium">활성</p>
                </div>
              </div>
            )}
            
            {serverRoom.humidity_monitoring && (
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Droplets className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">습도 모니터링</p>
                  <p className="text-sm text-green-600 font-medium">활성</p>
                </div>
              </div>
            )}

            {serverRoom.access_control && (
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                <div className="bg-green-100 p-3 rounded-lg text-lg">
                  🔒
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">출입 통제</p>
                  <p className="text-sm text-green-600 font-medium">활성</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}