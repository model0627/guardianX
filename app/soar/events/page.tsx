'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock,
  AlertTriangle,
  Shield,
  Activity,
  Eye,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Download,
  Share2,
  Settings,
  Maximize2,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Zap,
  Target,
  Database,
  Network,
  Server,
  User
} from 'lucide-react';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source_ip: string;
  target_ip: string;
  timestamp: string;
  description: string;
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  artifacts?: {
    type: string;
    value: string;
    label: string;
  }[];
  timeline_position?: number;
}

interface TimelineGroup {
  timestamp: string;
  events: SecurityEvent[];
}

export default function EventsPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<SecurityEvent[]>([]);
  const [timelineGroups, setTimelineGroups] = useState<TimelineGroup[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    document.title = '위협 이벤트 - GuardianX';
    loadEvents();
  }, []);

  useEffect(() => {
    filterAndGroupEvents();
  }, [events, searchTerm, statusFilter, severityFilter, timeRange]);

  const loadEvents = async () => {
    // 샘플 보안 이벤트 데이터
    const sampleEvents: SecurityEvent[] = [
      {
        id: '1',
        event_type: 'Phishing Email',
        severity: 'high',
        source_ip: '192.168.1.100',
        target_ip: '10.0.0.50',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        description: 'Suspicious email with malicious attachment detected',
        status: 'investigating',
        artifacts: [
          { type: 'email', value: 'phishing@malicious.com', label: 'Sender Email' },
          { type: 'domain', value: 'malicious.com', label: 'Malicious Domain' },
          { type: 'hash', value: 'a1b2c3d4e5f6', label: 'File Hash' }
        ]
      },
      {
        id: '2',
        event_type: 'Brute Force Attack',
        severity: 'critical',
        source_ip: '203.0.113.15',
        target_ip: '192.168.1.10',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        description: 'Multiple failed login attempts detected from external IP',
        status: 'new',
        artifacts: [
          { type: 'ip', value: '203.0.113.15', label: 'Attacker IP' },
          { type: 'user', value: 'admin', label: 'Target User' },
          { type: 'count', value: '127', label: 'Failed Attempts' }
        ]
      },
      {
        id: '3',
        event_type: 'Malware Detection',
        severity: 'critical',
        source_ip: '192.168.1.45',
        target_ip: '0.0.0.0',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        description: 'Trojan detected on workstation via antivirus scan',
        status: 'resolved',
        artifacts: [
          { type: 'file', value: 'trojan.exe', label: 'Malicious File' },
          { type: 'hash', value: 'b2c3d4e5f6a7', label: 'File Hash' },
          { type: 'host', value: 'WS-001', label: 'Infected Host' }
        ]
      },
      {
        id: '4',
        event_type: 'Suspicious Network Activity',
        severity: 'medium',
        source_ip: '192.168.1.80',
        target_ip: '198.51.100.25',
        timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        description: 'Unusual outbound traffic pattern detected',
        status: 'investigating',
        artifacts: [
          { type: 'ip', value: '198.51.100.25', label: 'External IP' },
          { type: 'port', value: '443', label: 'Port' },
          { type: 'bytes', value: '50MB', label: 'Data Volume' }
        ]
      },
      {
        id: '5',
        event_type: 'SQL Injection Attempt',
        severity: 'high',
        source_ip: '203.0.113.45',
        target_ip: '192.168.1.200',
        timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        description: 'SQL injection attack detected on web application',
        status: 'resolved',
        artifacts: [
          { type: 'url', value: '/login.php', label: 'Target URL' },
          { type: 'payload', value: "'; DROP TABLE users; --", label: 'Injection Payload' },
          { type: 'ip', value: '203.0.113.45', label: 'Attacker IP' }
        ]
      },
      {
        id: '6',
        event_type: 'Privilege Escalation',
        severity: 'high',
        source_ip: '192.168.1.25',
        target_ip: '192.168.1.25',
        timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
        description: 'Unauthorized privilege escalation attempt detected',
        status: 'false_positive',
        artifacts: [
          { type: 'user', value: 'jdoe', label: 'User Account' },
          { type: 'process', value: 'sudo', label: 'Process' },
          { type: 'host', value: 'SRV-001', label: 'Server' }
        ]
      }
    ];

    setEvents(sampleEvents);
  };

  const filterAndGroupEvents = () => {
    let filtered = events.filter(event => {
      const matchesSearch = event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          event.event_type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      const matchesSeverity = severityFilter === 'all' || event.severity === severityFilter;
      
      return matchesSearch && matchesStatus && matchesSeverity;
    });

    // 타임라인을 위한 그룹화
    const grouped = filtered.reduce((acc, event) => {
      const timeKey = new Date(event.timestamp).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const existingGroup = acc.find(group => group.timestamp === timeKey);
      if (existingGroup) {
        existingGroup.events.push(event);
      } else {
        acc.push({
          timestamp: timeKey,
          events: [event]
        });
      }
      
      return acc;
    }, [] as TimelineGroup[]);

    // 시간순 정렬 (최신순)
    grouped.sort((a, b) => new Date(b.events[0].timestamp).getTime() - new Date(a.events[0].timestamp).getTime());

    setFilteredEvents(filtered);
    setTimelineGroups(grouped);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return AlertTriangle;
      case 'high': return AlertCircle;
      case 'medium': return Info;
      case 'low': return CheckCircle;
      default: return Info;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'text-red-600 bg-red-50';
      case 'investigating': return 'text-yellow-600 bg-yellow-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      case 'false_positive': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case 'ip': return Network;
      case 'email': return '@';
      case 'domain': return Network;
      case 'file': return Database;
      case 'hash': return Target;
      case 'user': return User;
      case 'host': return Server;
      default: return Database;
    }
  };

  return (
    <div className="flex h-full bg-white">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                <span className="text-gray-900 font-semibold">SOAR</span>
              </div>
              <h1 className="text-gray-900 text-lg font-medium">Security Events Timeline</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === 'timeline' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  List
                </button>
              </div>
              <button className="p-2 text-gray-600 hover:text-gray-900">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>
            
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last 1 Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 flex">
          {/* Timeline View */}
          <div className="flex-1 overflow-auto p-6">
            {viewMode === 'timeline' ? (
              <div className="relative min-h-full">
                {/* Horizontal Timeline Container */}
                <div className="flex flex-col h-full">
                  {/* Timeline Header with Time Labels */}
                  <div className="relative mb-8">
                    {/* Horizontal Timeline Line */}
                    <div className="absolute top-8 left-20 right-20 h-0.5 bg-gray-300"></div>
                    
                    {/* Time Markers */}
                    <div className="flex justify-between px-20">
                      {timelineGroups.slice(0, 6).map((group, index) => {
                        return (
                          <div key={index} className="flex flex-col items-center relative">
                            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg mb-2"></div>
                            <div className="text-xs font-medium text-gray-900 bg-white px-2 py-1 rounded border border-gray-200 whitespace-nowrap">
                              {group.timestamp.split(' ')[1]} {/* 시간만 표시 */}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {group.timestamp.split(' ')[0]} {/* 날짜만 표시 */}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Events Grid - Horizontal Layout */}
                  <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredEvents.slice(0, 12).map((event) => {
                        const SeverityIcon = getSeverityIcon(event.severity);
                        const timeAgo = Math.floor((Date.now() - new Date(event.timestamp).getTime()) / (1000 * 60));
                        return (
                          <div
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer hover:border-blue-300"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <SeverityIcon className={`w-4 h-4 ${
                                    event.severity === 'critical' ? 'text-red-500' :
                                    event.severity === 'high' ? 'text-orange-500' :
                                    event.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                                  }`} />
                                  <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(event.severity)}`}>
                                    {event.severity.toUpperCase()}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500">{timeAgo}분 전</span>
                              </div>
                              
                              <div>
                                <h4 className="font-medium text-gray-900 text-sm mb-1 truncate">
                                  {event.event_type}
                                </h4>
                                <p className="text-gray-600 text-xs line-clamp-2 mb-2">
                                  {event.description}
                                </p>
                              </div>
                              
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <Network className="w-3 h-3" />
                                  <span className="font-mono">{event.source_ip}</span>
                                  <span>→</span>
                                  <span className="font-mono">{event.target_ip}</span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(event.status)}`}>
                                    {event.status.replace('_', ' ')}
                                  </span>
                                  <span className="text-xs text-gray-400">ID: {event.id}</span>
                                </div>
                              </div>
                              
                              {/* Artifacts Preview */}
                              {event.artifacts && event.artifacts.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Database className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">
                                    {event.artifacts.length} artifacts
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Load More */}
                    {filteredEvents.length > 12 && (
                      <div className="text-center mt-6">
                        <button className="px-4 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                          Load More Events ({filteredEvents.length - 12} remaining)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* List View - Table Format */
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredEvents.map((event) => {
                        const SeverityIcon = getSeverityIcon(event.severity);
                        return (
                          <tr
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <SeverityIcon className={`w-4 h-4 ${
                                  event.severity === 'critical' ? 'text-red-500' :
                                  event.severity === 'high' ? 'text-orange-500' :
                                  event.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                                }`} />
                                <div>
                                  <div className="font-medium text-gray-900 text-sm">{event.event_type}</div>
                                  <div className="text-gray-600 text-xs truncate max-w-xs">{event.description}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(event.severity)}`}>
                                {event.severity.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(event.status)}`}>
                                {event.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-4 font-mono text-sm text-gray-600">{event.source_ip}</td>
                            <td className="px-4 py-4 font-mono text-sm text-gray-600">{event.target_ip}</td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {new Date(event.timestamp).toLocaleString('ko-KR', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="px-4 py-4">
                              <button className="text-blue-600 hover:text-blue-800 text-sm">
                                Analyze
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Event Details Panel */}
          {selectedEvent && (
            <div className="w-96 bg-white border-l border-gray-200 overflow-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Event Details</h3>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-4 space-y-6">
                {/* Basic Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">기본 정보</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Event Type:</span>
                      <span className="text-sm font-medium">{selectedEvent.event_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Severity:</span>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(selectedEvent.severity)}`}>
                        {selectedEvent.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedEvent.status)}`}>
                        {selectedEvent.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Timestamp:</span>
                      <span className="text-sm">{new Date(selectedEvent.timestamp).toLocaleString('ko-KR')}</span>
                    </div>
                  </div>
                </div>

                {/* Network Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">네트워크 정보</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Source IP:</span>
                      <span className="text-sm font-mono">{selectedEvent.source_ip}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Target IP:</span>
                      <span className="text-sm font-mono">{selectedEvent.target_ip}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">설명</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedEvent.description}
                  </p>
                </div>

                {/* Artifacts */}
                {selectedEvent.artifacts && selectedEvent.artifacts.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">관련 아티팩트</h4>
                    <div className="space-y-3">
                      {selectedEvent.artifacts.map((artifact, index) => {
                        const IconComponent = getArtifactIcon(artifact.type);
                        return (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                              {typeof IconComponent === 'string' ? (
                                <span className="text-blue-600 font-semibold">{IconComponent}</span>
                              ) : (
                                <IconComponent className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{artifact.label}</div>
                              <div className="text-sm text-gray-600 font-mono">{artifact.value}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">액션</h4>
                  <div className="space-y-2">
                    <button className="w-full px-3 py-2 text-left text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Run Playbook
                    </button>
                    <button className="w-full px-3 py-2 text-left text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Mark as Resolved
                    </button>
                    <button className="w-full px-3 py-2 text-left text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Export Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="bg-white border-t border-gray-200 px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="text-gray-600 text-sm">
                Showing {filteredEvents.length} of {events.length} events
              </span>
              <span className="text-gray-600 text-sm">
                Last updated: {currentTime.toLocaleTimeString('ko-KR')}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-green-500 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Live Monitoring Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}