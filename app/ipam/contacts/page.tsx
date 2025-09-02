'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  User, 
  Phone, 
  Mail, 
  Settings,
  Shield,
  Eye,
  Edit2,
  Trash2,
  Users,
  Network,
  Activity,
  RefreshCw,
  History,
  RotateCw,
  Link
} from 'lucide-react';
import ContactFieldMappingModal from './components/ContactFieldMappingModal';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import AutoSyncToggle from '@/app/ipam/devices/components/AutoSyncToggle';
import SyncHistoryModal from '@/app/ipam/devices/components/SyncHistoryModal';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  mobile?: string;
  title?: string;
  department?: string;
  office_location?: string;
  responsibilities?: string[];
  is_active: boolean;
  device_count?: number;
  devices?: string[];
  created_at: string;
  updated_at: string;
}

interface ApiConnection {
  id: string;
  name: string;
  api_url: string;
  connection_type: string;
  sync_target: string;
  auto_sync_enabled: boolean;
  sync_frequency_minutes: number;
  sync_frequency_type: string;
  field_mappings?: Record<string, string>;
  last_sync?: string;
  last_sync_status?: string;
  last_sync_info?: {
    last_sync_time?: string;
    status?: string;
    records_processed?: number;
    records_added?: number;
    records_updated?: number;
    records_deactivated?: number;
  };
  created_at: string;
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  mobile: string;
  title: string;
  department: string;
  office_location: string;
  responsibilities: string[];
  is_active: boolean;
}

const ContactsPage = () => {
  const { toasts, addToast, removeToast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    mobile: '',
    title: '',
    department: '',
    office_location: '',
    responsibilities: [],
    is_active: true
  });
  const [apiConnections, setApiConnections] = useState<ApiConnection[]>([]);
  const [showFieldMappingModal, setShowFieldMappingModal] = useState(false);
  const [selectedApiConnection, setSelectedApiConnection] = useState<ApiConnection | null>(null);
  const [showSyncHistoryModal, setShowSyncHistoryModal] = useState(false);
  const [selectedHistoryConnection, setSelectedHistoryConnection] = useState<ApiConnection | null>(null);
  const [syncingConnectionId, setSyncingConnectionId] = useState<string | null>(null);
  
  // Delete dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // 페이지 타이틀 설정
    document.title = '담당자 관리 - GuardianX';
    
    fetchContacts();
    fetchApiConnections();
  }, []);

  const fetchApiConnections = async () => {
    try {
      const response = await fetch('/api/api-connections?sync_target=contacts', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setApiConnections(data);
      }
    } catch (error) {
      console.error('Failed to fetch API connections:', error);
    }
  };

  const handleSyncNow = async (apiConnectionId: string) => {
    setSyncingConnectionId(apiConnectionId);
    try {
      const response = await fetch('/api/sync/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ apiConnectionId }),
      });

      if (response.ok) {
        const result = await response.json();
        let message = `담당자 동기화 성공: ${result.stats.added}개 추가, ${result.stats.updated}개 업데이트`;
        if (result.stats.recordsSkipped > 0) {
          message += `, ${result.stats.recordsSkipped}개 건너뜀`;
        }
        
        addToast('success', message);
        
        // Show warnings if any records were skipped
        if (result.warnings && result.warnings.length > 0) {
          setTimeout(() => {
            addToast('warning', `주의: ${result.warnings.join(', ')}`);
          }, 1000);
        }
        fetchContacts();
        fetchApiConnections();
      } else {
        const error = await response.json();
        addToast('error', `담당자 동기화 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      addToast('error', '담당자 동기화 중 오류가 발생했습니다.');
    } finally {
      setSyncingConnectionId(null);
    }
  };

  const handleDeleteApiConnection = async (apiConnectionId: string) => {
    if (!confirm('이 API 연결을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/api-connections/${apiConnectionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        addToast('success', 'API 연결이 삭제되었습니다.');
        fetchApiConnections();
      } else {
        addToast('error', 'API 연결 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      addToast('error', 'API 연결 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleFieldMapping = (connection: ApiConnection) => {
    setSelectedApiConnection(connection);
    setShowFieldMappingModal(true);
  };

  const handleShowHistory = (connection: ApiConnection) => {
    setSelectedHistoryConnection(connection);
    setShowSyncHistoryModal(true);
  };

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contacts', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        throw new Error(`Failed to fetch contacts: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      setContacts(data.contacts);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      mobile: '',
      title: '',
      department: '',
      office_location: '',
      responsibilities: [],
      is_active: true
    });
    setShowFormModal(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone || '',
      mobile: contact.mobile || '',
      title: contact.title || '',
      department: contact.department || '',
      office_location: contact.office_location || '',
      responsibilities: contact.responsibilities || [],
      is_active: contact.is_active
    });
    setShowFormModal(true);
  };

  const handleDeleteContact = (contact: Contact) => {
    setDeletingContact(contact);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deletingContact) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/contacts/${deletingContact.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete contact');
      }
      
      // Remove from local state
      setContacts(contacts.filter(c => c.id !== deletingContact.id));
      setShowDeleteDialog(false);
      setDeletingContact(null);
      addToast('담당자가 성공적으로 삭제되었습니다.', 'success');
    } catch (error) {
      console.error('Failed to delete contact:', error);
      addToast('담당자 삭제에 실패했습니다.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingContact) {
        // Update existing contact
        const response = await fetch(`/api/contacts/${editingContact.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(formData),
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update contact');
        }
        
        const result = await response.json();
        // Update local state
        setContacts(contacts.map(c => 
          c.id === editingContact.id 
            ? result
            : c
        ));
      } else {
        // Create new contact
        const response = await fetch('/api/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(formData),
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create contact');
        }
        
        const result = await response.json();
        setContacts([...contacts, result]);
      }
      
      setShowFormModal(false);
    } catch (error) {
      console.error('Failed to save contact:', error);
      alert('담당자 저장에 실패했습니다.');
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  );


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">담당자 관리</h1>
          <p className="text-gray-600 mt-1">디바이스 담당자를 관리합니다</p>
        </div>
        <button
          onClick={handleAddContact}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          담당자 추가
        </button>
      </div>

      {/* API 연결 섹션 */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold">담당자 API 연결</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchApiConnections()}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                title="새로고침"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => window.location.href = '/api-connections/add'}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                <Plus className="w-4 h-4" />
                API 연결 추가
              </button>
            </div>
          </div>
        </div>

        {apiConnections.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">연결 이름</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">API URL</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">연결 기준</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">동기화 상태</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">마지막 동기화</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">자동 동기화</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">동기화 주기</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700 text-sm">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {apiConnections.map((connection) => (
                  <tr key={connection.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{connection.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-600 font-mono truncate max-w-md" title={connection.api_url}>
                        {connection.api_url}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {connection.field_mappings?.email ? '이메일' : '설정 필요'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {connection.last_sync_status === 'success' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          성공
                        </span>
                      ) : connection.last_sync_status === 'error' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          실패
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          대기
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {connection.last_sync ? (
                        <span className="text-sm text-gray-600">
                          {new Date(connection.last_sync).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <AutoSyncToggle
                        connectionId={connection.id}
                        isEnabled={connection.auto_sync_enabled}
                        onToggle={async (id, enabled) => { 
                          // TODO: Implement auto-sync toggle API call
                          await fetchApiConnections();
                        }}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {connection.sync_frequency_minutes} 분
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleFieldMapping(connection)}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="필드 매핑"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSyncNow(connection.id)}
                          disabled={syncingConnectionId === connection.id}
                          className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                          title="지금 동기화"
                        >
                          {syncingConnectionId === connection.id ? (
                            <RotateCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleShowHistory(connection)}
                          className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="동기화 이력"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => window.location.href = `/api-connections/edit/${connection.id}`}
                          className="p-1.5 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteApiConnection(connection.id)}
                          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Link className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">API 연결이 없습니다</h3>
            <p className="text-gray-500 mb-4">외부 API와 연결하여 담당자 정보를 자동으로 동기화하세요.</p>
            <button
              onClick={() => window.location.href = '/api-connections/add'}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              API 연결 추가
            </button>
          </div>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border mb-6 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="담당자 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-900">담당자명</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">연락처</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">직책/부서</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">상태</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">위치</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredContacts.map((contact) => (
              <tr key={contact.id} className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{contact.name}</div>
                      <div className="text-sm text-gray-500">{contact.email}</div>
                      {contact.notes && (
                        <div className="text-xs text-gray-400 mt-1">{contact.notes}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {contact.phone ? (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {contact.phone}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">전화번호 없음</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div>
                    {contact.title && (
                      <div className="text-sm font-medium text-gray-900">
                        {contact.title}
                      </div>
                    )}
                    {contact.department && (
                      <div className="text-xs text-gray-500">
                        {contact.department}
                      </div>
                    )}
                    {!contact.title && !contact.department && (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    contact.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {contact.is_active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-600">
                    {contact.office_location || '-'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditContact(contact)}
                      className="text-gray-600 hover:text-blue-600 p-1 rounded hover:bg-blue-50"
                      title="편집"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact)}
                      className="text-gray-600 hover:text-red-600 p-1 rounded hover:bg-red-50"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredContacts.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            담당자가 없습니다.
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editingContact ? '담당자 수정' : '담당자 추가'}
            </h2>
            
            <form onSubmit={handleSubmitForm}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이름 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="담당자 이름"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    전화번호 *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="010-0000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이메일 *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    활성 상태
                  </label>
                  <select
                    value={formData.is_active ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="true">활성</option>
                    <option value="false">비활성</option>
                  </select>
                </div>

              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingContact ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Field Mapping Modal */}
      {showFieldMappingModal && selectedApiConnection && (
        <ContactFieldMappingModal
          isOpen={showFieldMappingModal}
          onClose={() => {
            setShowFieldMappingModal(false);
            setSelectedApiConnection(null);
          }}
          apiConnectionId={selectedApiConnection.id}
          apiUrl={selectedApiConnection.api_url}
          onSave={() => {
            fetchApiConnections();
            setShowFieldMappingModal(false);
            setSelectedApiConnection(null);
          }}
        />
      )}

      {/* Sync History Modal */}
      {showSyncHistoryModal && selectedHistoryConnection && (
        <SyncHistoryModal
          isOpen={showSyncHistoryModal}
          onClose={() => {
            setShowSyncHistoryModal(false);
            setSelectedHistoryConnection(null);
          }}
          connectionId={selectedHistoryConnection.id}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeletingContact(null);
        }}
        onConfirm={confirmDelete}
        contactName={deletingContact?.name || ''}
        isDeleting={isDeleting}
      />

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default ContactsPage;