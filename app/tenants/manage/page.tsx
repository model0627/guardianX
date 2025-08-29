'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Users, 
  Settings, 
  Shield, 
  CreditCard,
  Activity,
  Calendar,
  Edit,
  UserPlus,
  LogOut,
  Bell,
  Key,
  Database,
  Globe,
  Lock,
  Mail,
  Phone,
  MapPin,
  Package,
  ChevronDown
} from 'lucide-react';

interface TenantInfo {
  id: string;
  name: string;
  domain?: string;
  created_at: string;
  owner_email?: string;
  subscription_plan?: string;
  member_count?: number;
  storage_used?: string;
  api_calls?: number;
  last_activity?: string;
}

interface Member {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  joined_at: string;
  last_login?: string;
}

export default function TenantManagePage() {
  const router = useRouter();
  const [currentTenant, setCurrentTenant] = useState<TenantInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'settings'>('overview');
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    document.title = '테넌트 관리 - GuardianX';
    loadTenantInfo();
    loadMembers();
  }, []);

  const loadTenantInfo = async () => {
    try {
      const response = await fetch('/api/user/current-tenant', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentTenant(data.tenant);
      }
    } catch (error) {
      console.error('Failed to load tenant info:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const response = await fetch('/api/tenants/members', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/tenants/members/${memberId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        loadMembers();
      }
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('정말로 이 멤버를 제거하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tenants/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        loadMembers();
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Building2 className="w-8 h-8 text-orange-500" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{currentTenant?.name || '테넌트 관리'}</h1>
                <p className="text-sm text-gray-500">CloudGuard IPAM 테넌트 관리</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                멤버 초대
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              개요
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              팀 멤버 ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              테넌트 설정
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">팀원</p>
                    <p className="text-2xl font-semibold text-gray-900">{members.length}명</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">플랜</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {currentTenant?.subscription_plan || 'Basic'}
                    </p>
                  </div>
                  <CreditCard className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">저장소</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {currentTenant?.storage_used || '2.4GB'}
                    </p>
                  </div>
                  <Database className="w-8 h-8 text-purple-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">API 호출</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {currentTenant?.api_calls || '12.5k'}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Tenant Info */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">테넌트 정보</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">테넌트 이름</label>
                    <p className="mt-1 text-gray-900">{currentTenant?.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">도메인</label>
                    <p className="mt-1 text-gray-900">{currentTenant?.domain || '설정되지 않음'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">생성일</label>
                    <p className="mt-1 text-gray-900">
                      {currentTenant?.created_at && new Date(currentTenant.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">관리자</label>
                    <p className="mt-1 text-gray-900">{currentTenant?.owner_email || 'admin@guardianx.com'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">최근 활동</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">새 멤버 추가됨 - user@example.com</span>
                    <span className="text-xs text-gray-400 ml-auto">2시간 전</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">IP 범위 업데이트</span>
                    <span className="text-xs text-gray-400 ml-auto">5시간 전</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">설정 변경 - 자동 동기화 활성화</span>
                    <span className="text-xs text-gray-400 ml-auto">1일 전</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">팀 멤버</h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="멤버 검색..."
                  className="px-3 py-1 border rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 font-medium text-gray-900">이름</th>
                    <th className="text-left p-4 font-medium text-gray-900">이메일</th>
                    <th className="text-left p-4 font-medium text-gray-900">역할</th>
                    <th className="text-left p-4 font-medium text-gray-900">상태</th>
                    <th className="text-left p-4 font-medium text-gray-900">가입일</th>
                    <th className="text-left p-4 font-medium text-gray-900">마지막 로그인</th>
                    <th className="text-right p-4 font-medium text-gray-900">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">{member.name}</td>
                      <td className="p-4">{member.email}</td>
                      <td className="p-4">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="px-2 py-1 border rounded text-sm"
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          member.status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {member.status === 'active' ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {member.last_login ? new Date(member.last_login).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          제거
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* General Settings */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">일반 설정</h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    테넌트 이름
                  </label>
                  <input
                    type="text"
                    value={currentTenant?.name || ''}
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    도메인
                  </label>
                  <input
                    type="text"
                    value={currentTenant?.domain || ''}
                    placeholder="example.com"
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                    readOnly
                  />
                </div>
                <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                  변경 사항 저장
                </button>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">보안 설정</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">2단계 인증</h3>
                    <p className="text-sm text-gray-500">모든 멤버에게 2단계 인증 요구</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">IP 제한</h3>
                    <p className="text-sm text-gray-500">특정 IP 주소에서만 접근 허용</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">세션 타임아웃</h3>
                    <p className="text-sm text-gray-500">30분 동안 활동이 없으면 자동 로그아웃</p>
                  </div>
                  <select className="px-3 py-1 border rounded-lg text-sm">
                    <option>15분</option>
                    <option>30분</option>
                    <option>1시간</option>
                    <option>2시간</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 border border-red-200 rounded-lg">
              <div className="px-6 py-4 border-b border-red-200">
                <h2 className="text-lg font-semibold text-red-900">위험 구역</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-red-900">테넌트 삭제</h3>
                    <p className="text-sm text-red-600">모든 데이터가 영구적으로 삭제됩니다.</p>
                  </div>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    테넌트 삭제
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">팀 멤버 초대</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이메일 주소
                  </label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    역할
                  </label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    메시지 (선택사항)
                  </label>
                  <textarea
                    placeholder="초대 메시지를 입력하세요..."
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                취소
              </button>
              <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                초대 전송
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}