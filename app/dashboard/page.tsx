'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Server, 
  Database,
  Globe,
  Users,
  Settings,
  Package,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Network,
  Monitor,
  Eye,
  Search,
  Filter
} from 'lucide-react';

interface DashboardStats {
  totalEntities: number;
  activeConnections: number;
  totalConnections: number;
  missingConnections: number;
  connectionRate: number;
}

interface EntityData {
  id: string;
  name: string;
  type: string;
  status: string;
  connections: number;
  lastUpdated: string;
  details?: any;
}

interface ConnectionData {
  from: EntityData;
  to: EntityData;
  relationship: string;
  status: 'active' | 'inactive' | 'missing';
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalEntities: 0,
    activeConnections: 0,
    totalConnections: 0,
    missingConnections: 0,
    connectionRate: 0
  });
  
  const [entities, setEntities] = useState<EntityData[]>([]);
  const [connections, setConnections] = useState<ConnectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    document.title = '메인 대시보드 - GuardianX';
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // 병렬로 데이터 로드
      const [
        officesResponse,
        serverRoomsResponse,
        racksResponse,
        devicesResponse,
        ipRangesResponse,
        ipAddressesResponse,
        contactsResponse,
        librariesResponse
      ] = await Promise.all([
        fetch('/api/ipam/offices', { credentials: 'include' }),
        fetch('/api/ipam/server-rooms', { credentials: 'include' }),
        fetch('/api/ipam/racks', { credentials: 'include' }),
        fetch('/api/ipam/devices', { credentials: 'include' }),
        fetch('/api/ipam/ip-ranges', { credentials: 'include' }),
        fetch('/api/ipam/ip-addresses', { credentials: 'include' }),
        fetch('/api/ipam/contacts', { credentials: 'include' }),
        fetch('/api/ipam/libraries', { credentials: 'include' })
      ]);

      const allEntities: EntityData[] = [];

      // 오피스 데이터 처리
      if (officesResponse.ok) {
        const data = await officesResponse.json();
        data.offices?.forEach((office: any) => {
          allEntities.push({
            id: `office-${office.id}`,
            name: office.name,
            type: 'office',
            status: 'active',
            connections: office.server_rooms_count || 0,
            lastUpdated: office.created_at,
            details: office
          });
        });
      }

      // 서버실 데이터 처리
      if (serverRoomsResponse.ok) {
        const data = await serverRoomsResponse.json();
        data.serverRooms?.forEach((room: any) => {
          allEntities.push({
            id: `serverroom-${room.id}`,
            name: room.name,
            type: 'serverroom',
            status: 'active',
            connections: (room.racks_count || 0) + (room.devices_count || 0),
            lastUpdated: room.created_at,
            details: room
          });
        });
      }

      // 랙 데이터 처리
      if (racksResponse.ok) {
        const data = await racksResponse.json();
        data.racks?.forEach((rack: any) => {
          allEntities.push({
            id: `rack-${rack.id}`,
            name: rack.name,
            type: 'rack',
            status: 'active',
            connections: rack.devices_count || 0,
            lastUpdated: rack.created_at,
            details: rack
          });
        });
      }

      // 디바이스 데이터 처리
      if (devicesResponse.ok) {
        const data = await devicesResponse.json();
        data.devices?.forEach((device: any) => {
          allEntities.push({
            id: `device-${device.id}`,
            name: device.display_name || device.name,
            type: 'device',
            status: device.status,
            connections: (device.ip_count || 0) + (device.libraries_count || 0),
            lastUpdated: device.last_seen || device.created_at,
            details: device
          });
        });
      }

      // IP 주소 데이터 처리
      if (ipAddressesResponse.ok) {
        const data = await ipAddressesResponse.json();
        data.ipAddresses?.forEach((ip: any) => {
          if (!ip.is_deleted) {
            allEntities.push({
              id: `ip-${ip.id}`,
              name: ip.ip_address,
              type: 'ip',
              status: ip.status,
              connections: ip.device_id ? 1 : 0,
              lastUpdated: ip.updated_at || ip.created_at,
              details: ip
            });
          }
        });
      }

      // 담당자 데이터 처리
      if (contactsResponse.ok) {
        const data = await contactsResponse.json();
        data.contacts?.forEach((contact: any) => {
          allEntities.push({
            id: `contact-${contact.id}`,
            name: contact.name,
            type: 'contact',
            status: contact.is_active ? 'active' : 'inactive',
            connections: contact.devices_count || 0,
            lastUpdated: contact.created_at,
            details: contact
          });
        });
      }

      // 라이브러리 데이터 처리
      if (librariesResponse.ok) {
        const data = await librariesResponse.json();
        data.libraries?.forEach((library: any) => {
          allEntities.push({
            id: `library-${library.id}`,
            name: library.name,
            type: 'library',
            status: library.status,
            connections: library.connected_devices || 0,
            lastUpdated: library.updated_at || library.created_at,
            details: library
          });
        });
      }

      setEntities(allEntities);

      // 통계 계산
      const totalEntities = allEntities.length;
      const totalConnections = allEntities.reduce((sum, entity) => sum + entity.connections, 0);
      const activeConnections = allEntities.filter(e => e.status === 'active').reduce((sum, entity) => sum + entity.connections, 0);
      const missingConnections = totalEntities - allEntities.filter(e => e.connections > 0).length;
      const connectionRate = totalEntities > 0 ? Math.round((activeConnections / totalConnections) * 100) : 0;

      setStats({
        totalEntities,
        activeConnections,
        totalConnections,
        missingConnections,
        connectionRate
      });

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'office': return <Building2 className="w-4 h-4" />;
      case 'serverroom': return <Server className="w-4 h-4" />;
      case 'rack': return <Database className="w-4 h-4" />;
      case 'device': return <Monitor className="w-4 h-4" />;
      case 'ip': return <Globe className="w-4 h-4" />;
      case 'contact': return <Users className="w-4 h-4" />;
      case 'library': return <Package className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'office': return 'bg-blue-100 text-blue-700';
      case 'serverroom': return 'bg-purple-100 text-purple-700';
      case 'rack': return 'bg-gray-100 text-gray-700';
      case 'device': return 'bg-orange-100 text-orange-700';
      case 'ip': return 'bg-green-100 text-green-700';
      case 'contact': return 'bg-pink-100 text-pink-700';
      case 'library': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'office': return '오피스';
      case 'serverroom': return '서버실';
      case 'rack': return '랙';
      case 'device': return '디바이스';
      case 'ip': return 'IP 주소';
      case 'contact': return '담당자';
      case 'library': return '라이브러리';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'inactive': return 'text-red-600';
      case 'maintenance': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '활성';
      case 'inactive': return '비활성';
      case 'maintenance': return '유지보수';
      default: return status;
    }
  };

  const filteredEntities = entities.filter(entity => {
    const matchesSearch = entity.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || entity.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || entity.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-orange-600">
          <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          <span>데이터 로딩 중...</span>
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
            <Network className="w-6 h-6 text-orange-600" />
            연결 관계 대시보드
          </h1>
          <p className="text-gray-600 mt-1">IPAM 인프라의 모든 구성 요소간 연결 관계를 한눈에 확인합니다.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => router.push('/ipam/offices')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Eye className="w-4 h-4" />
            상세 관리
          </button>
        </div>
      </div>

      {/* 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">전체 엔티티</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalEntities}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">활성 상태</p>
              <p className="text-2xl font-bold text-gray-800">{stats.activeConnections}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Network className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">총 연결</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalConnections}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">미연결</p>
              <p className="text-2xl font-bold text-gray-800">{stats.missingConnections}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">연결률</p>
              <p className="text-2xl font-bold text-gray-800">{stats.connectionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* 고급 검색 및 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5" />
          고급 검색 및 필터
        </h3>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="이름으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">모든 타입</option>
            <option value="office">오피스</option>
            <option value="serverroom">서버실</option>
            <option value="rack">랙</option>
            <option value="device">디바이스</option>
            <option value="ip">IP 주소</option>
            <option value="contact">담당자</option>
            <option value="library">라이브러리</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">모든 상태</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
            <option value="maintenance">유지보수</option>
          </select>
        </div>
      </div>

      {/* 엔티티 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            {stats.totalEntities}개의 연결 관계 • 미연결 {stats.missingConnections}개
          </h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEntities.map((entity) => (
              <div key={entity.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getTypeColor(entity.type)}`}>
                      {getTypeIcon(entity.type)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">{entity.name}</h4>
                      <p className="text-xs text-gray-500">
                        {getTypeText(entity.type)} • {new Date(entity.lastUpdated).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      entity.status === 'active' ? 'bg-green-100 text-green-700' : 
                      entity.status === 'inactive' ? 'bg-red-100 text-red-700' : 
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {entity.status === 'active' ? <CheckCircle className="w-3 h-3 mr-1" /> : 
                       entity.status === 'inactive' ? <AlertTriangle className="w-3 h-3 mr-1" /> : 
                       <Clock className="w-3 h-3 mr-1" />}
                      {getStatusText(entity.status)}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">위치</p>
                      <p className="text-sm text-gray-600">
                        {entity.details?.office_name || entity.details?.server_room_name || 
                         entity.details?.rack_name || entity.details?.location || '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">연결 정보</p>
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-gray-600">{entity.connections}</span>
                        <span className="text-gray-400">개</span>
                      </div>
                    </div>
                  </div>
                </div>

                {entity.type === 'device' && entity.details && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <p className="font-medium text-gray-700">{entity.details.ip_count || 0}</p>
                        <p className="text-gray-500">IP 주소</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">{entity.details.libraries_count || 0}</p>
                        <p className="text-gray-500">라이브러리</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">{entity.connections}</p>
                        <p className="text-gray-500">연결</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredEntities.length === 0 && (
            <div className="text-center py-12">
              <Network className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' 
                  ? '검색 조건에 맞는 엔티티가 없습니다' 
                  : '등록된 엔티티가 없습니다'
                }
              </h3>
              <p className="text-gray-600">
                {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' 
                  ? '다른 검색 조건을 시도해보세요.' 
                  : 'IPAM 관리 페이지에서 데이터를 추가해보세요.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}