'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  Crown,
  Mail,
  Calendar,
  ChevronLeft,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface TenantMember {
  id: string;
  user_id: string;
  email: string;
  role: string;
  status: string;
  joined_at: string;
  last_active?: string;
  is_active: boolean;
}

export default function TenantMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  useEffect(() => {
    document.title = '멤버 관리 - GuardianX';
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const response = await fetch('/api/tenants/members', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = () => {
    // TODO: Open invite modal
    console.log('Invite member');
  };

  const handleEditRole = (member: TenantMember) => {
    // TODO: Open role edit modal
    console.log('Edit role for:', member.email);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('이 멤버를 제거하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tenants/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await loadMembers();
      } else {
        alert('멤버 제거에 실패했습니다.');
      }
    } catch (error) {
      console.error('Remove member error:', error);
      alert('멤버 제거에 실패했습니다.');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700';
      case 'admin':
        return 'bg-blue-100 text-blue-700';
      case 'member':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'owner':
        return '소유자';
      case 'admin':
        return '관리자';
      case 'member':
        return '멤버';
      default:
        return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4" />;
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'member':
        return <UserCheck className="w-4 h-4" />;
      default:
        return <UserCheck className="w-4 h-4" />;
    }
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || member.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-blue-600">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                멤버 관리
              </h1>
              <p className="text-gray-600 mt-1">테넌트 멤버를 관리하고 권한을 설정합니다.</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            {/* 검색 및 필터 */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="이메일로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
                />
              </div>
              
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">모든 역할</option>
                <option value="owner">소유자</option>
                <option value="admin">관리자</option>
                <option value="member">멤버</option>
              </select>
            </div>
            
            <button
              onClick={handleInviteMember}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              멤버 초대
            </button>
          </div>
        </div>

        {/* 멤버 목록 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 font-medium text-gray-900">멤버</th>
                  <th className="text-left p-4 font-medium text-gray-900">역할</th>
                  <th className="text-left p-4 font-medium text-gray-900">상태</th>
                  <th className="text-left p-4 font-medium text-gray-900">가입일</th>
                  <th className="text-left p-4 font-medium text-gray-900">마지막 활동</th>
                  <th className="text-left p-4 font-medium text-gray-900">작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {member.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{member.email}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getRoleColor(member.role)}`}>
                          {getRoleIcon(member.role)}
                          {getRoleText(member.role)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {member.is_active ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-700 text-sm">활성</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-red-700 text-sm">비활성</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-gray-600 text-sm">
                        <Calendar className="w-4 h-4" />
                        {new Date(member.joined_at).toLocaleDateString('ko-KR')}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600 text-sm">
                        {member.last_active 
                          ? new Date(member.last_active).toLocaleDateString('ko-KR')
                          : '없음'
                        }
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {member.role !== 'owner' && (
                          <>
                            <button
                              onClick={() => handleEditRole(member)}
                              className="p-1 text-gray-400 hover:text-blue-600 rounded"
                              title="역할 수정"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                              title="멤버 제거"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {searchTerm || roleFilter 
                  ? '검색 조건에 맞는 멤버가 없습니다' 
                  : '등록된 멤버가 없습니다'
                }
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || roleFilter 
                  ? '다른 검색 조건을 시도해보세요.' 
                  : '첫 번째 멤버를 초대해보세요.'
                }
              </p>
              {!searchTerm && !roleFilter && (
                <button
                  onClick={handleInviteMember}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  멤버 초대
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}