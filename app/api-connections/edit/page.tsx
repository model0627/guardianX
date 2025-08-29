'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, LogOut, ExternalLink, Settings } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';

export default function EditApiConnectionPage() {
  const router = useRouter();
  const { toasts, addToast, removeToast } = useToast();
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [googleAccountConnected, setGoogleAccountConnected] = useState(false);
  const [googleAccount, setGoogleAccount] = useState<any>(null);
  const [loadingGoogleAuth, setLoadingGoogleAuth] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConnections();
    checkGoogleAccountStatus();
  }, []);

  const loadConnections = async () => {
    try {
      const response = await fetch('/api/api-connections', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setConnections(data.filter((c: any) => c.connection_type === 'google_sheets'));
      }
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  };

  const checkGoogleAccountStatus = async () => {
    try {
      const response = await fetch('/api/auth/google/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setGoogleAccountConnected(data.connected);
        setGoogleAccount(data.googleAccount);
      }
    } catch (error) {
      console.error('Error checking Google account status:', error);
    }
  };

  const connectGoogleAccount = async () => {
    setLoadingGoogleAuth(true);
    try {
      const response = await fetch('/api/auth/google/url', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const popup = window.open(data.authUrl, 'google-auth', 'width=500,height=600');
        
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            checkGoogleAccountStatus();
            setLoadingGoogleAuth(false);
          }
        }, 1000);
      } else {
        addToast('error', 'Google 인증 URL 생성에 실패했습니다.');
        setLoadingGoogleAuth(false);
      }
    } catch (error) {
      console.error('Error connecting Google account:', error);
      addToast('error', 'Google 계정 연결 중 오류가 발생했습니다.');
      setLoadingGoogleAuth(false);
    }
  };

  const disconnectGoogleAccount = async () => {
    try {
      const response = await fetch('/api/auth/google/status', {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setGoogleAccountConnected(false);
        setGoogleAccount(null);
        addToast('success', 'Google 계정 연결이 해제되었습니다.');
      } else {
        const error = await response.json();
        addToast('error', error.error || 'Google 계정 연결 해제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error disconnecting Google account:', error);
      addToast('error', 'Google 계정 연결 해제 중 오류가 발생했습니다.');
    }
  };

  const updateToOAuth = async () => {
    if (!selectedConnection || !googleAccountConnected) {
      addToast('error', 'Google 계정을 먼저 연결해주세요.');
      return;
    }

    setLoading(true);
    try {
      // Extract spreadsheet ID from URL
      const match = selectedConnection.api_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      const spreadsheetId = match ? match[1] : null;

      if (!spreadsheetId) {
        addToast('error', '스프레드시트 ID를 추출할 수 없습니다.');
        setLoading(false);
        return;
      }

      // Get user's Google account ID
      const googleAccountResult = await fetch('/api/auth/google/status', {
        credentials: 'include'
      });
      
      if (!googleAccountResult.ok) {
        addToast('error', 'Google 계정 정보를 가져올 수 없습니다.');
        setLoading(false);
        return;
      }

      // Update google_sheets_connections table
      const response = await fetch(`/api/api-connections/${selectedConnection.id}/update-oauth`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          spreadsheetId,
          authType: 'oauth'
        }),
      });

      if (response.ok) {
        addToast('success', 'OAuth 인증으로 변경되었습니다!');
        loadConnections();
      } else {
        const error = await response.json();
        addToast('error', error.error || 'OAuth 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error updating to OAuth:', error);
      addToast('error', 'OAuth 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Google Sheets OAuth 설정</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          
          {/* Google 계정 연동 상태 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-blue-900">Google 계정 연동</h4>
                {googleAccountConnected && googleAccount ? (
                  <div className="mt-1 flex items-center space-x-2">
                    <User className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">
                      {googleAccount.name} ({googleAccount.email})
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-blue-700">
                    비공개 스프레드시트에 접근하려면 Google 계정을 연결해주세요.
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                {googleAccountConnected ? (
                  <button
                    type="button"
                    onClick={disconnectGoogleAccount}
                    className="flex items-center space-x-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>연결 해제</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={connectGoogleAccount}
                    disabled={loadingGoogleAuth}
                    className="flex items-center space-x-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{loadingGoogleAuth ? '연결 중...' : 'Google 연결'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* API 연결 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Google Sheets API 연결 선택
            </label>
            <select
              value={selectedConnection?.id || ''}
              onChange={(e) => {
                const conn = connections.find(c => c.id === e.target.value);
                setSelectedConnection(conn);
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">연결을 선택하세요</option>
              {connections.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {conn.name} - {conn.api_url}
                </option>
              ))}
            </select>
          </div>

          {selectedConnection && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">현재 설정</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>이름:</strong> {selectedConnection.name}</p>
                <p><strong>URL:</strong> {selectedConnection.api_url}</p>
                <p><strong>타입:</strong> {selectedConnection.connection_type}</p>
                <p><strong>동기화 대상:</strong> {selectedConnection.sync_target}</p>
              </div>
            </div>
          )}

          {/* OAuth 변경 버튼 */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={updateToOAuth}
              disabled={!selectedConnection || !googleAccountConnected || loading}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              {loading ? 'OAuth 설정 중...' : 'OAuth로 변경'}
            </button>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}