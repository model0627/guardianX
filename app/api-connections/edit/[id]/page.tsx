'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';

interface ApiConnectionForm {
  name: string;
  api_url: string;
  connection_type: string;
  sync_target: 'libraries' | 'devices' | 'contacts';
  auto_sync_enabled: boolean;
  sync_frequency_minutes: number;
  sync_frequency_type: 'minutes' | 'hours' | 'days';
}

export default function EditApiConnectionPage() {
  const router = useRouter();
  const params = useParams();
  const { toasts, addToast, removeToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [form, setForm] = useState<ApiConnectionForm>({
    name: '',
    api_url: '',
    connection_type: 'REST API',
    sync_target: 'libraries',
    auto_sync_enabled: false,
    sync_frequency_minutes: 5,
    sync_frequency_type: 'minutes'
  });


  useEffect(() => {
    if (params.id) {
      fetchApiConnection();
    }
  }, [params.id]);

  const fetchApiConnection = async () => {
    try {
      const response = await fetch(`/api/api-connections/${params.id}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const connection = await response.json();
        setForm({
          name: connection.name || '',
          api_url: connection.api_url || '',
          connection_type: connection.connection_type || 'REST API',
          sync_target: connection.sync_target || 'libraries',
          auto_sync_enabled: connection.auto_sync_enabled || false,
          sync_frequency_minutes: connection.sync_frequency_minutes || 5,
          sync_frequency_type: connection.sync_frequency_type || 'minutes'
        });
      } else {
        addToast('error', 'API 연결을 찾을 수 없습니다.');
        router.push('/ipam/devices');
      }
    } catch (error) {
      console.error('Error fetching API connection:', error);
      addToast('error', 'API 연결 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setInitialLoading(false);
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
      const response = await fetch(`/api/api-connections/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      if (response.ok) {
        addToast('success', 'API 연결이 성공적으로 수정되었습니다.');
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
        addToast(error.error || 'API 연결 수정 중 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error('Error updating API connection:', error);
      addToast('error', 'API 연결 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };


  const testConnection = async () => {
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
          url: form.api_url
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
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">API 연결 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

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
              <h1 className="text-xl font-semibold text-gray-900">API 연결 수정</h1>
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
                {loading ? '저장 중...' : 'API 연결 수정'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}