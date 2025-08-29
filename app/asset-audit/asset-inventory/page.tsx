'use client';

import { useState, useEffect } from 'react';
import { 
  Server,
  Laptop,
  Smartphone,
  Router,
  Database,
  HardDrive,
  Cpu,
  Activity,
  RefreshCw,
  Download,
  Upload,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Shield,
  Network,
  Building2,
  Calendar,
  Clock,
  User,
  Settings,
  Eye,
  FileText,
  Link2,
  Zap
} from 'lucide-react';

interface IPAMDevice {
  id: string;
  device_name: string;
  device_type: string;
  ip_address: string;
  mac_address: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  os_version?: string;
  location?: string;
  rack_id?: string;
  office_name?: string;
  server_room_name?: string;
  contact_name?: string;
  status: 'active' | 'inactive' | 'maintenance';
  last_seen?: string;
  created_at: string;
  // 추가 자산 점검 정보
  audit_status?: 'not_scanned' | 'scanning' | 'scanned' | 'issues_found';
  last_audit_date?: string;
  compliance_status?: 'compliant' | 'non_compliant' | 'partial' | 'unknown';
  vulnerability_count?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  patches_pending?: number;
  security_score?: number;
}

export default function AssetInventoryPage() {
  const [devices, setDevices] = useState<IPAMDevice[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<IPAMDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [selectedDevice, setSelectedDevice] = useState<IPAMDevice | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    document.title = '자산 인벤토리 - GuardianX';
    fetchIPAMDevices();
  }, []);

  useEffect(() => {
    filterDevices();
  }, [devices, searchTerm, typeFilter, statusFilter, auditFilter]);

  const fetchIPAMDevices = async () => {
    setIsLoading(true);
    try {
      // IPAM API에서 디바이스 정보 가져오기
      const response = await fetch('/api/ipam/devices', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // 자산 점검 정보 추가 (시뮬레이션)
        const devicesWithAudit = data.devices.map((device: any) => ({
          ...device,
          audit_status: Math.random() > 0.3 ? 
            (Math.random() > 0.5 ? 'scanned' : 
             Math.random() > 0.5 ? 'issues_found' : 'not_scanned') 
            : 'not_scanned',
          last_audit_date: Math.random() > 0.5 ? 
            new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : 
            undefined,
          compliance_status: Math.random() > 0.7 ? 'compliant' : 
                           Math.random() > 0.4 ? 'partial' : 
                           Math.random() > 0.2 ? 'non_compliant' : 'unknown',
          vulnerability_count: {
            critical: Math.floor(Math.random() * 5),
            high: Math.floor(Math.random() * 10),
            medium: Math.floor(Math.random() * 20),
            low: Math.floor(Math.random() * 30)
          },
          patches_pending: Math.floor(Math.random() * 15),
          security_score: Math.floor(Math.random() * 40 + 60)
        }));
        
        setDevices(devicesWithAudit);
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      // 샘플 데이터 로드
      loadSampleData();
    }
    setIsLoading(false);
  };

  const loadSampleData = () => {
    const sampleDevices: IPAMDevice[] = [
      {
        id: '1',
        device_name: 'WEB-SERVER-01',
        device_type: 'server',
        ip_address: '192.168.1.10',
        mac_address: '00:1B:44:11:3A:B7',
        manufacturer: 'Dell',
        model: 'PowerEdge R740',
        serial_number: 'DL-2024-001',
        os_version: 'Ubuntu 22.04 LTS',
        location: '서버실 A',
        office_name: '본사',
        server_room_name: '메인 서버실',
        contact_name: '김철수',
        status: 'active',
        last_seen: new Date().toISOString(),
        created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        audit_status: 'issues_found',
        last_audit_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        compliance_status: 'partial',
        vulnerability_count: {
          critical: 2,
          high: 5,
          medium: 12,
          low: 23
        },
        patches_pending: 8,
        security_score: 72
      },
      {
        id: '2',
        device_name: 'DB-SERVER-01',
        device_type: 'database',
        ip_address: '192.168.1.20',
        mac_address: '00:1B:44:11:3A:B8',
        manufacturer: 'HP',
        model: 'ProLiant DL380',
        serial_number: 'HP-2024-002',
        os_version: 'CentOS 8',
        location: '서버실 B',
        office_name: '본사',
        server_room_name: '데이터베이스 서버실',
        contact_name: '박영희',
        status: 'active',
        last_seen: new Date().toISOString(),
        created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        audit_status: 'scanned',
        last_audit_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        compliance_status: 'compliant',
        vulnerability_count: {
          critical: 0,
          high: 1,
          medium: 5,
          low: 15
        },
        patches_pending: 3,
        security_score: 88
      },
      {
        id: '3',
        device_name: 'WORKSTATION-15',
        device_type: 'workstation',
        ip_address: '192.168.2.115',
        mac_address: '00:1B:44:11:3A:C5',
        manufacturer: 'Lenovo',
        model: 'ThinkPad T14',
        serial_number: 'LN-2024-115',
        os_version: 'Windows 11 Pro',
        location: '2층 개발팀',
        office_name: '본사',
        contact_name: '이민수',
        status: 'active',
        last_seen: new Date().toISOString(),
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        audit_status: 'not_scanned',
        compliance_status: 'unknown',
        vulnerability_count: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        patches_pending: 0,
        security_score: 0
      },
      {
        id: '4',
        device_name: 'ROUTER-CORE-01',
        device_type: 'network',
        ip_address: '192.168.0.1',
        mac_address: '00:1B:44:11:3A:01',
        manufacturer: 'Cisco',
        model: 'ASR 9000',
        serial_number: 'CS-2024-001',
        os_version: 'IOS XR 7.3.2',
        location: '네트워크실',
        office_name: '본사',
        server_room_name: '네트워크 센터',
        contact_name: '정대현',
        status: 'active',
        last_seen: new Date().toISOString(),
        created_at: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString(),
        audit_status: 'scanned',
        last_audit_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        compliance_status: 'compliant',
        vulnerability_count: {
          critical: 0,
          high: 0,
          medium: 2,
          low: 8
        },
        patches_pending: 1,
        security_score: 92
      }
    ];
    
    setDevices(sampleDevices);
  };

  const filterDevices = () => {
    let filtered = devices;

    if (searchTerm) {
      filtered = filtered.filter(device => 
        device.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.ip_address.includes(searchTerm) ||
        device.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.model.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(device => device.device_type === typeFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(device => device.status === statusFilter);
    }

    if (auditFilter !== 'all') {
      filtered = filtered.filter(device => device.audit_status === auditFilter);
    }

    setFilteredDevices(filtered);
  };

  const syncWithIPAM = async () => {
    setIsSyncing(true);
    await fetchIPAMDevices();
    setTimeout(() => {
      setIsSyncing(false);
    }, 2000);
  };

  const startAudit = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (device) {
      device.audit_status = 'scanning';
      setDevices([...devices]);
      
      // 스캔 시뮬레이션
      setTimeout(() => {
        device.audit_status = Math.random() > 0.3 ? 'scanned' : 'issues_found';
        device.last_audit_date = new Date().toISOString();
        device.vulnerability_count = {
          critical: Math.floor(Math.random() * 3),
          high: Math.floor(Math.random() * 8),
          medium: Math.floor(Math.random() * 15),
          low: Math.floor(Math.random() * 25)
        };
        device.security_score = Math.floor(Math.random() * 30 + 70);
        setDevices([...devices]);
      }, 3000);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'server': return Server;
      case 'database': return Database;
      case 'workstation': return Laptop;
      case 'network': return Router;
      case 'mobile': return Smartphone;
      case 'storage': return HardDrive;
      default: return Cpu;
    }
  };

  const getAuditStatusColor = (status?: string) => {
    switch (status) {
      case 'scanned': return 'text-green-600 bg-green-50';
      case 'scanning': return 'text-blue-600 bg-blue-50';
      case 'issues_found': return 'text-orange-600 bg-orange-50';
      case 'not_scanned': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getAuditStatusText = (status?: string) => {
    switch (status) {
      case 'scanned': return '스캔 완료';
      case 'scanning': return '스캔 중...';
      case 'issues_found': return '이슈 발견';
      case 'not_scanned': return '미스캔';
      default: return '알 수 없음';
    }
  };

  const getComplianceColor = (status?: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600';
      case 'partial': return 'text-yellow-600';
      case 'non_compliant': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getComplianceIcon = (status?: string) => {
    switch (status) {
      case 'compliant': return CheckCircle;
      case 'partial': return AlertTriangle;
      case 'non_compliant': return XCircle;
      default: return Info;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">자산 인벤토리</h2>
          <p className="text-gray-600 mt-1">IPAM에서 관리중인 디바이스를 가져와 자산 점검을 수행합니다</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={syncWithIPAM}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            IPAM 동기화
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            인벤토리 내보내기
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 자산</p>
              <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
            </div>
            <Database className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">스캔 완료</p>
              <p className="text-2xl font-bold text-green-600">
                {devices.filter(d => d.audit_status === 'scanned').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">이슈 발견</p>
              <p className="text-2xl font-bold text-orange-600">
                {devices.filter(d => d.audit_status === 'issues_found').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">미스캔</p>
              <p className="text-2xl font-bold text-gray-600">
                {devices.filter(d => !d.audit_status || d.audit_status === 'not_scanned').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* IPAM Connection Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Link2 className="w-5 h-5 text-blue-600" />
          <div className="flex-1">
            <p className="font-medium text-blue-900">IPAM 연동 상태</p>
            <p className="text-sm text-blue-700">
              IPAM 시스템과 연결되어 실시간으로 디바이스 정보를 가져옵니다. 
              마지막 동기화: {new Date().toLocaleTimeString('ko-KR')}
            </p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            연결됨
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="디바이스명, IP 주소, 제조사, 모델로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">모든 타입</option>
            <option value="server">서버</option>
            <option value="database">데이터베이스</option>
            <option value="workstation">워크스테이션</option>
            <option value="network">네트워크</option>
            <option value="mobile">모바일</option>
            <option value="storage">스토리지</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">모든 상태</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
            <option value="maintenance">유지보수</option>
          </select>
          
          <select
            value={auditFilter}
            onChange={(e) => setAuditFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">점검 상태</option>
            <option value="scanned">스캔 완료</option>
            <option value="scanning">스캔 중</option>
            <option value="issues_found">이슈 발견</option>
            <option value="not_scanned">미스캔</option>
          </select>
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">디바이스</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP/위치</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제조사/모델</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">점검 상태</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">컴플라이언스</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">취약점</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">보안점수</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDevices.map((device) => {
                const DeviceIcon = getDeviceIcon(device.device_type);
                const ComplianceIcon = getComplianceIcon(device.compliance_status);
                const totalVulns = device.vulnerability_count ? 
                  device.vulnerability_count.critical + device.vulnerability_count.high + 
                  device.vulnerability_count.medium + device.vulnerability_count.low : 0;
                
                return (
                  <tr key={device.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <DeviceIcon className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-medium text-gray-900">{device.device_name}</p>
                          <p className="text-xs text-gray-500">{device.device_type}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-4 py-4">
                      <p className="font-mono text-sm text-gray-900">{device.ip_address}</p>
                      <p className="text-xs text-gray-500">
                        {device.office_name} {device.location && `- ${device.location}`}
                      </p>
                    </td>
                    
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">{device.manufacturer}</p>
                      <p className="text-xs text-gray-500">{device.model}</p>
                    </td>
                    
                    <td className="px-4 py-4">
                      <div>
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getAuditStatusColor(device.audit_status)}`}>
                          {device.audit_status === 'scanning' && (
                            <Activity className="w-3 h-3 mr-1 animate-pulse" />
                          )}
                          {getAuditStatusText(device.audit_status)}
                        </span>
                        {device.last_audit_date && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(device.last_audit_date).toLocaleDateString('ko-KR')}
                          </p>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <ComplianceIcon className={`w-4 h-4 ${getComplianceColor(device.compliance_status)}`} />
                        <span className={`text-sm ${getComplianceColor(device.compliance_status)}`}>
                          {device.compliance_status === 'compliant' ? '준수' :
                           device.compliance_status === 'partial' ? '부분준수' :
                           device.compliance_status === 'non_compliant' ? '미준수' : '알 수 없음'}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-4 py-4">
                      {device.vulnerability_count ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            {device.vulnerability_count.critical > 0 && (
                              <span className="text-red-600 font-medium">
                                C:{device.vulnerability_count.critical}
                              </span>
                            )}
                            {device.vulnerability_count.high > 0 && (
                              <span className="text-orange-600 font-medium">
                                H:{device.vulnerability_count.high}
                              </span>
                            )}
                            {device.vulnerability_count.medium > 0 && (
                              <span className="text-yellow-600">
                                M:{device.vulnerability_count.medium}
                              </span>
                            )}
                            {device.vulnerability_count.low > 0 && (
                              <span className="text-blue-600">
                                L:{device.vulnerability_count.low}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">총 {totalVulns}개</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    
                    <td className="px-4 py-4">
                      {device.security_score ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                device.security_score >= 80 ? 'bg-green-500' :
                                device.security_score >= 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${device.security_score}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{device.security_score}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {device.audit_status !== 'scanning' && (
                          <button
                            onClick={() => startAudit(device.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            점검
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedDevice(device)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device Detail Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">자산 상세 정보</h3>
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* IPAM 정보 */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Network className="w-4 h-4 text-blue-600" />
                  IPAM 기본 정보
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">디바이스명:</span>
                    <p className="font-medium">{selectedDevice.device_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">IP 주소:</span>
                    <p className="font-mono">{selectedDevice.ip_address}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">MAC 주소:</span>
                    <p className="font-mono">{selectedDevice.mac_address}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">제조사/모델:</span>
                    <p>{selectedDevice.manufacturer} {selectedDevice.model}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">시리얼 번호:</span>
                    <p>{selectedDevice.serial_number}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">위치:</span>
                    <p>{selectedDevice.office_name} - {selectedDevice.location}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">담당자:</span>
                    <p>{selectedDevice.contact_name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">등록일:</span>
                    <p>{new Date(selectedDevice.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                </div>
              </div>

              {/* 자산 점검 정보 */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  자산 점검 결과
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">점검 상태:</span>
                    <p>
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getAuditStatusColor(selectedDevice.audit_status)}`}>
                        {getAuditStatusText(selectedDevice.audit_status)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">마지막 점검:</span>
                    <p>{selectedDevice.last_audit_date ? 
                      new Date(selectedDevice.last_audit_date).toLocaleDateString('ko-KR') : 
                      '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">컴플라이언스:</span>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const CompIcon = getComplianceIcon(selectedDevice.compliance_status);
                        return <CompIcon className={`w-4 h-4 ${getComplianceColor(selectedDevice.compliance_status)}`} />;
                      })()}
                      <span className={getComplianceColor(selectedDevice.compliance_status)}>
                        {selectedDevice.compliance_status === 'compliant' ? '준수' :
                         selectedDevice.compliance_status === 'partial' ? '부분준수' :
                         selectedDevice.compliance_status === 'non_compliant' ? '미준수' : '알 수 없음'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">보안 점수:</span>
                    <p className="font-medium">{selectedDevice.security_score || 0}/100</p>
                  </div>
                </div>
              </div>

              {/* 취약점 정보 */}
              {selectedDevice.vulnerability_count && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    취약점 현황
                  </h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {selectedDevice.vulnerability_count.critical}
                      </p>
                      <p className="text-xs text-red-700">Critical</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {selectedDevice.vulnerability_count.high}
                      </p>
                      <p className="text-xs text-orange-700">High</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {selectedDevice.vulnerability_count.medium}
                      </p>
                      <p className="text-xs text-yellow-700">Medium</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedDevice.vulnerability_count.low}
                      </p>
                      <p className="text-xs text-blue-700">Low</p>
                    </div>
                  </div>
                  {selectedDevice.patches_pending && selectedDevice.patches_pending > 0 && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        <Wrench className="inline w-4 h-4 mr-1" />
                        {selectedDevice.patches_pending}개의 패치가 대기 중입니다
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="flex items-center gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    startAudit(selectedDevice.id);
                    setSelectedDevice(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Zap className="w-4 h-4" />
                  즉시 점검
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                  <FileText className="w-4 h-4" />
                  보고서 생성
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Settings className="w-4 h-4" />
                  점검 설정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}