'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Database, 
  ArrowLeft,
  Building2,
  Server,
  Calendar,
  Edit,
  Trash2,
  Settings,
  Hash,
  MapPin
} from 'lucide-react';

interface Device {
  id: string;
  name: string;
  description?: string;
  device_type: string;
  manufacturer?: string;
  model?: string;
  rack_position?: number;
  rack_size: number;
  status: string;
}

interface Rack {
  id: string;
  name: string;
  rack_number?: string;
  server_room_id: string;
  server_room_name: string;
  office_name: string;
  size_u: number;
  used_u: number;
  actual_used_u: number;
  usage_percentage: number;
  description?: string;
  created_at: string;
  updated_at?: string;
  device_count: number;
  devices: Device[];
}

export default function RackDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [rack, setRack] = useState<Rack | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadRackDetail(params.id as string);
    }
  }, [params.id]);

  const loadRackDetail = async (rackId: string) => {
    try {
      const response = await fetch(`/api/ipam/racks?id=${rackId}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setRack(data.rack);
      } else if (response.status === 404) {
        router.push('/ipam/racks');
      }
    } catch (error) {
      console.error('Failed to load rack detail:', error);
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

  if (!rack) {
    return (
      <div className="text-center py-12">
        <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">랙을 찾을 수 없습니다</h3>
        <button
          onClick={() => router.push('/ipam/racks')}
          className="text-purple-600 hover:text-purple-700 font-medium"
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
            onClick={() => router.push('/ipam/racks')}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Database className="w-6 h-6 text-purple-600" />
              {rack.name}
              {rack.rack_number && (
                <span className="text-lg text-gray-500">#{rack.rack_number}</span>
              )}
            </h1>
            <p className="text-gray-600 mt-1">랙 상세 정보</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
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
              <label className="text-sm font-medium text-gray-500">랙명</label>
              <p className="text-gray-800 mt-1">{rack.name}</p>
            </div>

            {rack.rack_number && (
              <div>
                <label className="text-sm font-medium text-gray-500">랙 번호</label>
                <div className="flex items-center gap-2 mt-1">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-800">{rack.rack_number}</p>
                </div>
              </div>
            )}
            
            {rack.description && (
              <div>
                <label className="text-sm font-medium text-gray-500">설명</label>
                <p className="text-gray-800 mt-1">{rack.description}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-gray-500">소속 서버실</label>
              <div className="flex items-center gap-2 mt-1">
                <Server className="w-4 h-4 text-gray-400" />
                <p className="text-gray-800">{rack.server_room_name}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">소속 사무실</label>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="w-4 h-4 text-gray-400" />
                <p className="text-gray-800">{rack.office_name}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">랙 크기</label>
              <p className="text-gray-800 mt-1">{rack.size_u}U</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">사용중인 U</label>
              <p className="text-gray-800 mt-1">{rack.used_u}U</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">사용률</label>
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{rack.used_u} / {rack.size_u}U</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUsageColor(rack.usage_percentage)}`}>
                    {rack.usage_percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${getUsageBarColor(rack.usage_percentage)}`}
                    style={{ width: `${rack.usage_percentage}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">생성일</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                <p className="text-gray-800">{new Date(rack.created_at).toLocaleDateString('ko-KR')}</p>
              </div>
            </div>

            {rack.updated_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">수정일</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-800">{new Date(rack.updated_at).toLocaleDateString('ko-KR')}</p>
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
              <p className="text-sm font-medium text-gray-500">디바이스</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{rack.device_count || 0}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Settings className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">사용 가능한 U</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{rack.size_u - (rack.actual_used_u || rack.used_u)}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">전체 U</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{rack.size_u}</p>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <MapPin className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">사용률</p>
              <p className={`text-2xl font-bold mt-1 ${rack.usage_percentage > 80 ? 'text-red-600' : rack.usage_percentage > 60 ? 'text-orange-600' : 'text-green-600'}`}>
                {rack.usage_percentage}%
              </p>
            </div>
            <div className={`p-3 rounded-lg ${rack.usage_percentage > 80 ? 'bg-red-100' : rack.usage_percentage > 60 ? 'bg-orange-100' : 'bg-green-100'}`}>
              <div className={`w-6 h-6 rounded-full ${getUsageBarColor(rack.usage_percentage)}`}></div>
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
              <div className="bg-green-100 p-2 rounded-lg">
                <Settings className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">디바이스</h3>
                <p className="text-sm text-gray-500">{rack.device_count || 0}개의 디바이스</p>
              </div>
            </div>
            <button className="text-green-600 hover:text-green-700 text-sm font-medium">
              관리하기 →
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Server className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">서버실</h3>
                <p className="text-sm text-gray-500">{rack.server_room_name}</p>
              </div>
            </div>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              보기 →
            </button>
          </div>
        </div>
      </div>

      {/* 랙 시각화 - 이미지와 유사한 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 랙 상세 정보 */}
        <div className="lg:col-span-1 space-y-4">
          {/* 랙 정보 카드 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">랙 정보</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">랙 크기</span>
                <span className="font-medium">{rack.size_u}U</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">사용중인 U</span>
                <span className="font-medium text-blue-600">{rack.actual_used_u || rack.used_u}U</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">사용 가능한 U</span>
                <span className="font-medium text-green-600">{rack.size_u - (rack.actual_used_u || rack.used_u)}U</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">사용률</span>
                <span className={`font-medium ${rack.usage_percentage > 80 ? 'text-red-600' : rack.usage_percentage > 60 ? 'text-orange-600' : 'text-green-600'}`}>
                  {rack.usage_percentage}%
                </span>
              </div>
            </div>

            {/* 사용률 바 */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>사용률</span>
                <span>{rack.usage_percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageBarColor(rack.usage_percentage)}`}
                  style={{ width: `${rack.usage_percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* 장착된 장비 목록 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">장착된 장비</h3>
            
            {rack.devices && rack.devices.length > 0 ? (
              <div className="space-y-3">
                {rack.devices.map((device, index) => (
                  <div key={device.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Settings className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{device.name}</div>
                      <div className="text-sm text-gray-500">
                        {device.rack_position ? `${device.rack_position}U` : '위치 미지정'} 
                        {device.rack_size > 1 && ` - ${(device.rack_position || 0) + device.rack_size - 1}U`}
                        {device.device_type && ` • ${device.device_type}`}
                      </div>
                      {device.manufacturer && device.model && (
                        <div className="text-xs text-gray-400">
                          {device.manufacturer} {device.model}
                        </div>
                      )}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      device.status === 'active' ? 'bg-green-100 text-green-700' :
                      device.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                      device.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {device.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                장착된 장비가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 랙 시각적 표현 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">랙 시각화 (42U)</h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-gray-600">사용중</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <span className="text-gray-600">사용가능</span>
                </div>
              </div>
            </div>
            
            {/* 랙 시각화 */}
            <div className="flex">
              {/* U 번호 표시 (왼쪽) */}
              <div className="flex flex-col-reverse w-12 text-right pr-2">
                {Array.from({ length: rack.size_u }, (_, index) => {
                  const uNumber = index + 1;
                  return (
                    <div key={uNumber} className="h-4 flex items-center justify-end text-xs text-gray-500 border-r border-gray-200">
                      {uNumber}
                    </div>
                  );
                })}
              </div>
              
              {/* 랙 본체 */}
              <div className="flex-1 border-l-2 border-r-2 border-gray-800 relative bg-gray-50">
                <div className="flex flex-col-reverse">
                  {Array.from({ length: rack.size_u }, (_, index) => {
                    const uNumber = index + 1;
                    
                    // Find device that occupies this U position
                    const deviceAtPosition = rack.devices?.find(device => {
                      if (!device.rack_position) return false;
                      const deviceStart = device.rack_position;
                      const deviceEnd = device.rack_position + (device.rack_size || 1) - 1;
                      return uNumber >= deviceStart && uNumber <= deviceEnd;
                    });
                    
                    const isUsed = !!deviceAtPosition;
                    
                    return (
                      <div
                        key={uNumber}
                        className={`h-4 border-b border-gray-300 relative ${
                          isUsed 
                            ? 'bg-blue-500 hover:bg-blue-600' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        } transition-colors cursor-pointer`}
                        title={`${uNumber}U ${isUsed ? `사용중 - ${deviceAtPosition?.name}` : '사용가능'}`}
                      >
                        {/* 실제 장비 표시 */}
                        {deviceAtPosition && (
                          <div className="absolute inset-0 bg-blue-600 flex items-center px-2">
                            <span className="text-white text-xs font-medium truncate">
                              {deviceAtPosition.name}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* 랙 상단 */}
                <div className="absolute -top-2 left-0 right-0 h-2 bg-gray-800 rounded-t-sm"></div>
                
                {/* 랙 하단 */}
                <div className="absolute -bottom-2 left-0 right-0 h-2 bg-gray-800 rounded-b-sm"></div>
              </div>
              
              {/* U 번호 표시 (오른쪽) */}
              <div className="flex flex-col-reverse w-12 text-left pl-2">
                {Array.from({ length: rack.size_u }, (_, index) => {
                  const uNumber = index + 1;
                  return (
                    <div key={uNumber} className="h-4 flex items-center text-xs text-gray-500 border-l border-gray-200">
                      {uNumber}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* 랙 설명 */}
            <div className="mt-4 text-center text-sm text-gray-600">
              <p>1U = 44.45mm (1.75인치) 표준 랙 단위</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}