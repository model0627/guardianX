'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Users,
  Server,
  Database,
  Eye,
  Play,
  Pause,
  RefreshCw,
  Filter
} from 'lucide-react';

interface ThreatEvent {
  id: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  source_ip: string;
  target_ip: string;
  target_device?: string;
  library_affected?: string;
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  description: string;
  automated_response?: string;
}

interface SecurityMetrics {
  total_events: number;
  critical_events: number;
  resolved_events: number;
  automated_responses: number;
  mean_response_time: number;
}

export default function SOARPage() {
  const [threatEvents, setThreatEvents] = useState<ThreatEvent[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    total_events: 0,
    critical_events: 0,
    resolved_events: 0,
    automated_responses: 0,
    mean_response_time: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    document.title = '보안 대시보드 - GuardianX';
    fetchThreatEvents();
    fetchSecurityMetrics();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchThreatEvents();
        fetchSecurityMetrics();
      }, 30000); // 30초마다 새로고침
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchThreatEvents = async () => {
    try {
      const response = await fetch('/api/soar/events', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setThreatEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch threat events:', error);
      // 샘플 데이터로 대체
      setThreatEvents(generateSampleData());
    } finally {
      setLoading(false);
    }
  };

  const fetchSecurityMetrics = async () => {
    try {
      const response = await fetch('/api/soar/metrics', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics || metrics);
      }
    } catch (error) {
      console.error('Failed to fetch security metrics:', error);
      // 샘플 메트릭스로 대체
      setMetrics({
        total_events: 247,
        critical_events: 12,
        resolved_events: 198,
        automated_responses: 156,
        mean_response_time: 4.2
      });
    }
  };

  const generateSampleData = (): ThreatEvent[] => [
    {
      id: '1',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      severity: 'critical',
      type: 'Suspicious Library Process',
      source_ip: '192.168.1.100',
      target_ip: '192.168.1.10',
      target_device: 'web-server-01',
      library_affected: 'Apache HTTP Server',
      status: 'new',
      description: 'Apache 프로세스에서 비정상적인 네트워크 연결 패턴 탐지',
      automated_response: 'Process isolated and traffic blocked'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      severity: 'high',
      type: 'Vulnerability Exploit Attempt',
      source_ip: '203.0.113.45',
      target_ip: '10.0.1.11',
      target_device: 'db-server-01',
      library_affected: 'MySQL Server',
      status: 'investigating',
      description: 'MySQL 서버 대상 SQL 인젝션 공격 시도 탐지',
      automated_response: 'Firewall rule updated, IP blocked'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      severity: 'medium',
      type: 'Unusual Network Traffic',
      source_ip: '192.168.1.5',
      target_ip: '192.168.2.10',
      target_device: 'backup-server',
      library_affected: undefined,
      status: 'resolved',
      description: '정상 업무 시간 외 대용량 데이터 전송 탐지',
      automated_response: 'Scheduled backup confirmed, event closed'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'text-red-600 bg-red-100';
      case 'investigating': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'false_positive': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredEvents = threatEvents.filter(event => {
    const severityMatch = selectedSeverity === 'all' || event.severity === selectedSeverity;
    const statusMatch = selectedStatus === 'all' || event.status === selectedStatus;
    return severityMatch && statusMatch;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Shield className="w-8 h-8 mr-3 text-orange-600" />
              SOAR Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Security Orchestration, Automation & Response - IPAM 연동 위협 탐지
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center px-4 py-2 rounded-lg ${
                autoRefresh 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {autoRefresh ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {autoRefresh ? '자동 새로고침 중' : '자동 새로고침 중지'}
            </button>
            <button
              onClick={() => {
                fetchThreatEvents();
                fetchSecurityMetrics();
              }}
              className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              새로고침
            </button>
          </div>
        </div>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 이벤트</p>
              <p className="text-2xl font-bold mt-1">{metrics.total_events}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">심각한 위협</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{metrics.critical_events}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">해결된 이벤트</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{metrics.resolved_events}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">자동 대응</p>
              <p className="text-2xl font-bold mt-1 text-orange-600">{metrics.automated_responses}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">평균 대응 시간</p>
              <p className="text-2xl font-bold mt-1">{metrics.mean_response_time}분</p>
            </div>
            <Clock className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">필터:</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">심각도:</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3 py-1 border rounded-lg text-sm"
            >
              <option value="all">전체</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">상태:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1 border rounded-lg text-sm"
            >
              <option value="all">전체</option>
              <option value="new">새 이벤트</option>
              <option value="investigating">조사 중</option>
              <option value="resolved">해결됨</option>
              <option value="false_positive">오탐</option>
            </select>
          </div>
          
          <div className="text-sm text-gray-600">
            {filteredEvents.length}개 이벤트 표시 중
          </div>
        </div>
      </div>

      {/* Threat Events Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
            위협 이벤트 목록
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  심각도
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  유형
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  대상 자산
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  설명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  자동 대응
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    로딩 중...
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    필터 조건에 맞는 이벤트가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(event.timestamp).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(event.severity)}`}>
                        {event.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {event.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        {event.target_device && (
                          <div className="flex items-center">
                            <Server className="w-3 h-3 mr-1" />
                            {event.target_device}
                          </div>
                        )}
                        {event.library_affected && (
                          <div className="flex items-center">
                            <Database className="w-3 h-3 mr-1" />
                            {event.library_affected}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          {event.source_ip} → {event.target_ip}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="truncate" title={event.description}>
                        {event.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(event.status)}`}>
                        {event.status === 'new' ? '새 이벤트' :
                         event.status === 'investigating' ? '조사 중' :
                         event.status === 'resolved' ? '해결됨' : '오탐'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                      {event.automated_response ? (
                        <div className="text-green-600 text-xs">
                          ✓ {event.automated_response}
                        </div>
                      ) : (
                        <span className="text-gray-400">수동 대응 필요</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <Eye className="w-4 h-4" />
                        </button>
                        {event.status === 'new' && (
                          <button className="text-orange-600 hover:text-orange-900">
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}