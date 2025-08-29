'use client';

import { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

interface SyncHistoryItem {
  id: string;
  connectionId: string;
  connectionName: string;
  apiUrl: string;
  syncStartedAt: string;
  syncCompletedAt: string | null;
  status: 'running' | 'completed' | 'failed';
  executionType: 'manual' | 'auto';
  recordsProcessed: number;
  recordsAdded: number;
  recordsUpdated: number;
  recordsDeactivated: number;
  errorMessage?: string;
  syncDetails: any;
  initiatedBy: {
    email: string;
    name: string;
  };
  duration: number | null;
}

interface SyncHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId?: string;
}

export default function SyncHistoryModal({ isOpen, onClose, connectionId }: SyncHistoryModalProps) {
  const [history, setHistory] = useState<SyncHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasNext: false
  });

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, connectionId]);

  const fetchHistory = async (offset = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: offset.toString()
      });
      
      if (connectionId) {
        params.append('connectionId', connectionId);
      }

      const response = await fetch(`/api/sync/history?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch sync history');
      }
    } catch (error) {
      console.error('Error fetching sync history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '실행 중';
      case 'completed':
        return '완료';
      case 'failed':
        return '실패';
      default:
        return '대기';
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}초`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}분 ${remainingSeconds}초`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">동기화 히스토리</h2>
            <p className="text-gray-600 text-sm mt-1">
              {connectionId ? '선택한 연결의 ' : '전체 '}동기화 기록을 확인할 수 있습니다
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchHistory(0)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              title="새로고침"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>로딩 중...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        연결 이름
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        시작 시간
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        소요 시간
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        처리 결과
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        실행 형태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        실행자
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          동기화 히스토리가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      history.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(item.status)}
                              <span className="text-sm font-medium">
                                {getStatusText(item.status)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.connectionName}
                              </div>
                              <div className="text-sm text-gray-500 max-w-xs truncate">
                                {item.apiUrl}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.syncStartedAt).toLocaleString('ko-KR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDuration(item.duration)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.status === 'completed' ? (
                              <div className="text-sm">
                                <div className="flex space-x-3 text-xs">
                                  {item.recordsAdded > 0 && (
                                    <span className="text-green-600">+{item.recordsAdded}</span>
                                  )}
                                  {item.recordsUpdated > 0 && (
                                    <span className="text-blue-600">✏️{item.recordsUpdated}</span>
                                  )}
                                  {item.recordsDeactivated > 0 && (
                                    <span className="text-orange-600">-{item.recordsDeactivated}</span>
                                  )}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  총 {item.recordsProcessed}개 처리
                                </div>
                              </div>
                            ) : item.status === 'failed' ? (
                              <div className="text-sm text-red-600">
                                {item.errorMessage || '오류 발생'}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">-</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.executionType === 'auto' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {item.executionType === 'auto' ? '🤖 자동' : '👤 수동'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.initiatedBy.name || item.initiatedBy.email || '시스템'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.total > pagination.limit && (
                <div className="px-6 py-3 border-t bg-gray-50 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    총 {pagination.total}개 중 {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)}개 표시
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => fetchHistory(Math.max(0, pagination.offset - pagination.limit))}
                      disabled={pagination.offset === 0}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    >
                      이전
                    </button>
                    <button
                      onClick={() => fetchHistory(pagination.offset + pagination.limit)}
                      disabled={!pagination.hasNext}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    >
                      다음
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}