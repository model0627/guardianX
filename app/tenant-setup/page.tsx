'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Users, Settings, ArrowRight, Search } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';

interface Tenant {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  role: 'owner' | 'admin' | 'member';
  createdAt: string;
}

export default function TenantSetupPage() {
  const router = useRouter();
  const { toasts, removeToast, success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'select' | 'create'>('select');
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newTenant, setNewTenant] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    // 페이지 타이틀 설정
    document.title = '테넌트 설정 - GuardianX IPAM';
  }, []);

  // 가입 가능한 테넌트 목록 로드
  useEffect(() => {
    loadAvailableTenants();
  }, []);

  const loadAvailableTenants = async () => {
    try {
      const response = await fetch('/api/tenants', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTenants(data.tenants);
        } else {
          error('테넌트 목록을 불러오는데 실패했습니다.');
        }
      } else {
        // 사용자가 아직 어떤 테넌트에도 속하지 않은 경우 빈 목록
        setTenants([]);
      }
    } catch (err) {
      error('테넌트 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleSelectTenant = async (tenantId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/join`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        success(data.message || '테넌트에 성공적으로 가입되었습니다!');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        error(data.error || '테넌트 가입에 실패했습니다.');
      }
    } catch (err) {
      error('테넌트 가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenant.name.trim()) {
      error('테넌트 이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newTenant.name.trim(),
          description: newTenant.description.trim() || null
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        success('새 테넌트가 성공적으로 생성되었습니다!');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        error(data.error || '테넌트 생성에 실패했습니다.');
      }
    } catch (err) {
      error('테넌트 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 p-4">
        <div className="max-w-4xl mx-auto">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="flex justify-center items-center mb-4">
              <div className="bg-orange-100 p-3 rounded-xl">
                <Building2 className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">테넌트 설정</h1>
            <p className="text-gray-600">기존 테넌트에 가입하거나 새로운 테넌트를 생성하세요.</p>
          </div>

          {/* 메인 카드 */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            {/* 탭 버튼 */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
              <button
                onClick={() => setActiveTab('select')}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'select'
                    ? 'bg-orange-400 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Users className="w-4 h-4" />
                기존 테넌트 가입
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'create'
                    ? 'bg-orange-400 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Plus className="w-4 h-4" />
                새 테넌트 생성
              </button>
            </div>

            {/* 기존 테넌트 선택 */}
            {activeTab === 'select' && (
              <div>
                {/* 검색 */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="테넌트 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                {/* 테넌트 목록 */}
                <div className="space-y-4">
                  {filteredTenants.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm ? '검색 결과가 없습니다.' : '가입 가능한 테넌트가 없습니다.'}
                    </div>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <div
                        key={tenant.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors cursor-pointer"
                        onClick={() => !loading && handleSelectTenant(tenant.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="bg-orange-100 p-2 rounded-lg">
                                <Building2 className="w-5 h-5 text-orange-500" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-800">{tenant.name}</h3>
                                <p className="text-sm text-gray-500">{tenant.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {tenant.memberCount}명
                              </span>
                              <span>생성일: {tenant.createdAt}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {tenant.role === 'owner' ? '소유자' : tenant.role === 'admin' ? '관리자' : '멤버'}
                            </span>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 새 테넌트 생성 */}
            {activeTab === 'create' && (
              <form onSubmit={handleCreateTenant} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    테넌트 이름 *
                  </label>
                  <input
                    type="text"
                    value={newTenant.name}
                    onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="예: GuardianX Solutions"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    설명
                  </label>
                  <textarea
                    value={newTenant.description}
                    onChange={(e) => setNewTenant({ ...newTenant, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="테넌트에 대한 간단한 설명을 입력하세요..."
                  />
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Settings className="w-5 h-5 text-orange-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-orange-800 mb-1">테넌트 생성 안내</h4>
                      <ul className="text-sm text-orange-700 space-y-1">
                        <li>• 새 테넌트를 생성하면 자동으로 소유자 권한을 갖게 됩니다.</li>
                        <li>• 다른 사용자를 초대하여 팀을 구성할 수 있습니다.</li>
                        <li>• 테넌트 설정은 나중에 변경할 수 있습니다.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-400 hover:bg-orange-500 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>생성 중...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>테넌트 생성</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* 하단 정보 */}
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>테넌트는 팀, 조직 또는 프로젝트 단위로 리소스를 관리하는 공간입니다.</p>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </>
  );
}