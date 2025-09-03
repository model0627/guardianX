'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, User, LogOut, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';

interface ApiConnectionForm {
  name: string;
  api_url: string;
  connection_type: string;
  sync_target: 'libraries' | 'devices' | 'contacts';
  description: string;
  headers: Record<string, string>;
  auto_sync_enabled: boolean;
  sync_frequency_minutes: number;
  sync_frequency_type: 'minutes' | 'hours' | 'days';
  // Google Sheets specific fields
  spreadsheet_url?: string;
  sheet_name?: string;
  range_notation?: string;
  google_auth_type?: 'public' | 'oauth';
  spreadsheet_id?: string;
}

export default function AddApiConnectionPage() {
  const router = useRouter();
  const { toasts, addToast, removeToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ApiConnectionForm>({
    name: '',
    api_url: '',
    connection_type: 'rest',
    sync_target: 'libraries',
    description: '',
    headers: {},
    auto_sync_enabled: false,
    sync_frequency_minutes: 5,
    sync_frequency_type: 'minutes',
    spreadsheet_url: '',
    sheet_name: '',
    range_notation: 'A:Z',
    google_auth_type: 'public',
    spreadsheet_id: ''
  });

  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const [googleAccountConnected, setGoogleAccountConnected] = useState(false);
  const [googleAccount, setGoogleAccount] = useState<any>(null);
  const [loadingGoogleAuth, setLoadingGoogleAuth] = useState(false);

  // Google 계정 상태 확인
  useEffect(() => {
    checkGoogleAccountStatus();
  }, []);

  const checkGoogleAccountStatus = async () => {
    try {
      const response = await fetch('/api/auth/google/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setGoogleAccountConnected(data.connected);
        setGoogleAccount(data.googleAccount);
        
        // 토큰이 만료된 경우 자동으로 재인증 유도
        if (data.connected && data.googleAccount?.token_expired) {
          addToast('warning', 'Google 인증이 만료되었습니다. 다시 연결해주세요.');
          setGoogleAccountConnected(false); // 연결되지 않은 상태로 처리
        }
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
        // 새 창에서 Google OAuth 진행
        const popup = window.open(data.authUrl, 'google-auth', 'width=500,height=600');
        
        // 팝업 종료 감지
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            checkGoogleAccountStatus(); // 상태 다시 확인
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
        
        // OAuth 타입이었다면 public으로 변경
        if (form.google_auth_type === 'oauth') {
          setForm(prev => ({ ...prev, google_auth_type: 'public' }));
        }
      } else {
        const error = await response.json();
        addToast('error', error.error || 'Google 계정 연결 해제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error disconnecting Google account:', error);
      addToast('error', 'Google 계정 연결 해제 중 오류가 발생했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.api_url) {
      addToast('error', '이름과 API URL은 필수 항목입니다.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/api-connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      if (response.ok) {
        addToast('success', 'API 연결이 성공적으로 추가되었습니다.');
        // 연결 대상에 따라 적절한 페이지로 이동
        if (form.sync_target === 'devices') {
          router.push('/ipam/devices');
        } else if (form.sync_target === 'contacts') {
          router.push('/ipam/contacts');
        } else {
          router.push('/ipam/library');
        }
      } else {
        const error = await response.json();
        addToast('error', error.error || 'API 연결 추가 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error adding API connection:', error);
      addToast('error', 'API 연결 추가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const addHeader = () => {
    if (headerKey && headerValue) {
      setForm(prev => ({
        ...prev,
        headers: {
          ...prev.headers,
          [headerKey]: headerValue
        }
      }));
      setHeaderKey('');
      setHeaderValue('');
    }
  };

  const removeHeader = (key: string) => {
    setForm(prev => ({
      ...prev,
      headers: Object.fromEntries(
        Object.entries(prev.headers).filter(([k]) => k !== key)
      )
    }));
  };

  const testConnection = async () => {
    if (form.connection_type === 'google_sheets') {
      if (form.google_auth_type === 'oauth') {
        if (!googleAccountConnected) {
          addToast('error', 'Google 계정을 먼저 연결해주세요.');
          return;
        }
        if (!form.spreadsheet_id) {
          addToast('error', 'Google Sheets ID를 입력해주세요.');
          return;
        }

        setLoading(true);
        try {
          const response = await fetch('/api/google-sheets/private', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ 
              spreadsheetId: form.spreadsheet_id,
              sheetName: form.sheet_name || '',
              range: form.range_notation || 'A:Z'
            }),
          });

          if (response.ok) {
            const data = await response.json();
            addToast('success', `비공개 Google Sheets 연결 성공! "${data.spreadsheetInfo?.title}" - ${data.data?.length || 0}개의 행을 발견했습니다.`);
          } else {
            const error = await response.json();
            
            // Google 인증 만료 감지
            if (error.code === 'GOOGLE_AUTH_EXPIRED' || error.requireReauth) {
              addToast('warning', '⚠️ Google 인증이 만료되었습니다. 다시 로그인해주세요.');
              setGoogleAccountConnected(false);
              setGoogleAccount(null);
              // 만료된 토큰 삭제
              await fetch('/api/auth/google/status', { method: 'DELETE', credentials: 'include' });
            } else {
              addToast('error', error.details || error.error || 'Google Sheets 연결 테스트에 실패했습니다.');
            }
          }
        } catch (error) {
          console.error('Error testing private Google Sheets connection:', error);
          addToast('error', 'Google Sheets 연결 테스트 중 오류가 발생했습니다.');
        } finally {
          setLoading(false);
        }
      } else {
        // 공개 스프레드시트 테스트
        if (!form.spreadsheet_url) {
          addToast('error', 'Google Sheets URL을 입력해주세요.');
          return;
        }

        setLoading(true);
        try {
          const response = await fetch('/api/google-sheets/fetch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ 
              spreadsheetUrl: form.spreadsheet_url,
              sheetName: form.sheet_name || '',
              range: form.range_notation || 'A:Z'
            }),
          });

          if (response.ok) {
            const data = await response.json();
            addToast('success', `공개 Google Sheets 연결 성공! ${data.data?.length || 0}개의 행을 발견했습니다.`);
          } else {
            const error = await response.json();
            addToast('error', error.details || 'Google Sheets 연결 테스트에 실패했습니다.');
          }
        } catch (error) {
          console.error('Error testing Google Sheets connection:', error);
          addToast('error', 'Google Sheets 연결 테스트 중 오류가 발생했습니다.');
        } finally {
          setLoading(false);
        }
      }
    } else {
      if (!form.api_url) {
        addToast('error', 'API URL을 입력해주세요.');
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('/api/proxy/fetch-api', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ 
            url: form.api_url,
            headers: form.headers 
          }),
        });

        if (response.ok) {
          addToast('success', 'API 연결 테스트가 성공했습니다.');
        } else {
          addToast('error', 'API 연결 테스트에 실패했습니다.');
        }
      } catch (error) {
        console.error('Error testing API connection:', error);
        addToast('error', 'API 연결 테스트 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
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
              <h1 className="text-xl font-semibold text-gray-900">API 연결 추가</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  연결 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="예: Kandji MDM API"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  연결 타입 <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.connection_type}
                  onChange={(e) => setForm(prev => ({ ...prev, connection_type: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="rest">REST API</option>
                  <option value="google_sheets">Google Sheets</option>
                  <option value="graphql">GraphQL</option>
                  <option value="webhook">Webhook</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  연결 대상 <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.sync_target}
                  onChange={(e) => setForm(prev => ({ ...prev, sync_target: e.target.value as 'libraries' | 'devices' | 'contacts' }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="libraries">라이브러리 동기화</option>
                  <option value="devices">디바이스 동기화</option>
                  <option value="contacts">담당자 동기화</option>
                </select>
              </div>
            </div>

            {/* Google Sheets 필드 */}
            {form.connection_type === 'google_sheets' ? (
              <>
                {/* Google 인증 타입 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Sheets 접근 방식
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="google_auth_type"
                        value="public"
                        checked={form.google_auth_type === 'public'}
                        onChange={(e) => setForm(prev => ({ ...prev, google_auth_type: e.target.value as 'public' | 'oauth' }))}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                      />
                      <span className="ml-2 block text-sm text-gray-900">
                        공개 스프레드시트 (공유 링크 필요)
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="google_auth_type"
                        value="oauth"
                        checked={form.google_auth_type === 'oauth'}
                        onChange={(e) => setForm(prev => ({ ...prev, google_auth_type: e.target.value as 'public' | 'oauth' }))}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                      />
                      <span className="ml-2 block text-sm text-gray-900">
                        비공개 스프레드시트 (Google 계정 연동)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Google 계정 연동 상태 (OAuth 선택시만 표시) */}
                {form.google_auth_type === 'oauth' && (
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
                )}

                {/* 공개 스프레드시트 URL 입력 */}
                {form.google_auth_type === 'public' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Google Sheets URL <span className="text-red-500">*</span>
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="url"
                        value={form.spreadsheet_url || ''}
                        onChange={(e) => {
                          setForm(prev => ({ 
                            ...prev, 
                            spreadsheet_url: e.target.value,
                            api_url: e.target.value // API URL도 동일하게 설정
                          }));
                        }}
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                        required
                      />
                      <button
                        type="button"
                        onClick={testConnection}
                        disabled={loading}
                        className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                      >
                        테스트
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      스프레드시트를 "링크가 있는 모든 사용자" 또는 "웹에 공개"로 공유 설정하세요.
                    </p>
                  </div>
                )}

                {/* 비공개 스프레드시트 ID 입력 */}
                {form.google_auth_type === 'oauth' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Google Sheets ID <span className="text-red-500">*</span>
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={form.spreadsheet_id || ''}
                        onChange={(e) => {
                          setForm(prev => ({ 
                            ...prev, 
                            spreadsheet_id: e.target.value,
                            api_url: `https://docs.google.com/spreadsheets/d/${e.target.value}/edit` // URL 자동 생성
                          }));
                        }}
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                        required
                        disabled={!googleAccountConnected}
                      />
                      <button
                        type="button"
                        onClick={testConnection}
                        disabled={loading || !googleAccountConnected}
                        className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                      >
                        테스트
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Google Sheets URL에서 "/d/" 다음에 나오는 스프레드시트 ID를 입력하세요.
                      <br />
                      예: https://docs.google.com/spreadsheets/d/<span className="font-mono text-orange-600">1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</span>/edit
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      시트 이름
                    </label>
                    <input
                      type="text"
                      value={form.sheet_name || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, sheet_name: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="시트1 또는 Sheet1 (비워두면 첫 번째 시트 사용)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      데이터 범위
                    </label>
                    <input
                      type="text"
                      value={form.range_notation || 'A:Z'}
                      onChange={(e) => setForm(prev => ({ ...prev, range_notation: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="A:Z 또는 A1:Z100"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* REST API 필드 */
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API URL <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={form.api_url}
                    onChange={(e) => setForm(prev => ({ ...prev, api_url: e.target.value }))}
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="https://api.example.com/devices"
                    required
                  />
                  <button
                    type="button"
                    onClick={testConnection}
                    disabled={loading}
                    className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    테스트
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설명
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
                placeholder="API 연결에 대한 설명을 입력하세요."
              />
            </div>

            {/* Headers - Google Sheets는 필요 없음 */}
            {form.connection_type !== 'google_sheets' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                HTTP 헤더
              </label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={headerKey}
                    onChange={(e) => setHeaderKey(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                    placeholder="헤더 이름 (예: Authorization)"
                  />
                  <input
                    type="text"
                    value={headerValue}
                    onChange={(e) => setHeaderValue(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                    placeholder="헤더 값 (예: Bearer token123)"
                  />
                  <button
                    type="button"
                    onClick={addHeader}
                    className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                {Object.entries(form.headers).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">
                      <strong>{key}:</strong> {value}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeHeader(key)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      제거
                    </button>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Auto Sync Settings */}
            <div className="border-t pt-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="auto_sync"
                  checked={form.auto_sync_enabled}
                  onChange={(e) => setForm(prev => ({ ...prev, auto_sync_enabled: e.target.checked }))}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label htmlFor="auto_sync" className="ml-2 block text-sm text-gray-900">
                  자동 동기화 활성화
                </label>
              </div>

              {form.auto_sync_enabled && (
                <div className="grid grid-cols-2 gap-4 ml-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      동기화 주기
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.sync_frequency_minutes}
                      onChange={(e) => setForm(prev => ({ ...prev, sync_frequency_minutes: parseInt(e.target.value) || 1 }))}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      단위
                    </label>
                    <select
                      value={form.sync_frequency_type}
                      onChange={(e) => setForm(prev => ({ ...prev, sync_frequency_type: e.target.value as 'minutes' | 'hours' | 'days' }))}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      <option value="minutes">분</option>
                      <option value="hours">시간</option>
                      <option value="days">일</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? '저장 중...' : 'API 연결 추가'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}