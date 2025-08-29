'use client';

import { useState, useEffect } from 'react';
import { X, User, Plus, Trash2, Shield, Settings, Eye, Search } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  mobile?: string;
  title?: string;
  department?: string;
  office_location?: string;
  responsibilities?: string[];
  status: 'active' | 'inactive';
  is_active: boolean;
  device_count: number;
}

interface AssignedContact {
  id: string;
  contact_id: string;
  name: string;
  email: string;
  role: 'primary' | 'backup' | 'viewer';
}

interface ContactAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  deviceName: string;
}

export default function ContactAssignmentModal({
  isOpen,
  onClose,
  deviceId,
  deviceName
}: ContactAssignmentModalProps) {
  const [assignedContacts, setAssignedContacts] = useState<AssignedContact[]>([]);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'primary' | 'backup' | 'viewer'>('backup');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && deviceId) {
      loadAssignedContacts();
      loadAvailableContacts();
    }
  }, [isOpen, deviceId]);

  const loadAssignedContacts = async () => {
    try {
      const response = await fetch(`/api/ipam/device-assignments?device_id=${deviceId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAssignedContacts(data.assignments);
        }
      }
    } catch (error) {
      console.error('Failed to load assigned contacts:', error);
    }
  };

  const loadAvailableContacts = async () => {
    try {
      const response = await fetch('/api/ipam/contacts', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Contacts API response:', data);
        if (data.success && data.contacts) {
          // Filter out inactive contacts
          const activeContacts = data.contacts.filter((c: Contact) => c.status === 'active');
          console.log('Active contacts:', activeContacts);
          setAvailableContacts(activeContacts);
        } else {
          console.log('No contacts found or invalid response structure');
          setAvailableContacts([]);
        }
      } else {
        console.error('Failed to fetch contacts, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setAvailableContacts([]);
      }
    } catch (error) {
      console.error('Failed to load available contacts:', error);
      setAvailableContacts([]);
    }
  };

  const handleAssignContact = async () => {
    if (!selectedContactId) {
      alert('담당자를 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ipam/device-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          device_id: deviceId,
          contact_id: selectedContactId,
          role: selectedRole
        })
      });

      if (response.ok) {
        await loadAssignedContacts();
        setSelectedContactId('');
        setSelectedRole('backup');
      } else {
        const error = await response.json();
        alert(error.error || '담당자 할당에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to assign contact:', error);
      alert('담당자 할당에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignContact = async (assignmentId: string) => {
    if (!confirm('이 담당자를 해제하시겠습니까?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/ipam/device-assignments?assignment_id=${assignmentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await loadAssignedContacts();
      } else {
        const error = await response.json();
        alert(error.error || '담당자 해제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to unassign contact:', error);
      alert('담당자 해제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'primary':
        return <Shield className="w-4 h-4 text-orange-600" />;
      case 'backup':
        return <Settings className="w-4 h-4 text-blue-600" />;
      case 'viewer':
        return <Eye className="w-4 h-4 text-gray-600" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'primary':
        return '주 담당자';
      case 'backup':
        return '부 담당자';
      case 'viewer':
        return '조회자';
      default:
        return role;
    }
  };

  // Filter out already assigned contacts
  const unassignedContacts = availableContacts.filter(
    contact => !assignedContacts.some(assigned => assigned.contact_id === contact.id)
  );

  const filteredContacts = unassignedContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 디버깅용 로그
  console.log('Available contacts:', availableContacts.length);
  console.log('Assigned contacts:', assignedContacts.length);
  console.log('Unassigned contacts:', unassignedContacts.length);
  console.log('Filtered contacts:', filteredContacts.length);
  console.log('Search term:', searchTerm);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">담당자 관리</h2>
              <p className="text-sm text-gray-600 mt-1">디바이스: {deviceName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 200px)' }}>
          {/* 할당된 담당자 목록 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">할당된 담당자</h3>
            {assignedContacts.length > 0 ? (
              <div className="space-y-2">
                {assignedContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-gray-500">{contact.email}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(contact.role)}
                        <span className="text-sm text-gray-600">{getRoleLabel(contact.role)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnassignContact(contact.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">할당된 담당자가 없습니다</p>
              </div>
            )}
          </div>

          {/* 담당자 할당 폼 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">담당자 할당</h3>
            <div className="border rounded-lg p-4">
              <div className="space-y-4">
                {/* 검색 */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="담당자 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* 담당자 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    담당자 선택
                  </label>
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  >
                    <option value="">
                      {filteredContacts.length === 0 
                        ? (searchTerm 
                          ? '검색 결과가 없습니다'
                          : (availableContacts.length === 0 
                            ? '등록된 담당자가 없습니다' 
                            : '모든 담당자가 이미 할당되었습니다'))
                        : '담당자를 선택하세요'
                      }
                    </option>
                    {filteredContacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name} ({contact.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 역할 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    역할
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as 'primary' | 'backup' | 'viewer')}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  >
                    <option value="primary">주 담당자</option>
                    <option value="backup">부 담당자</option>
                    <option value="viewer">조회자</option>
                  </select>
                </div>

                {/* 할당 버튼 */}
                <button
                  onClick={handleAssignContact}
                  disabled={loading || !selectedContactId}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  담당자 할당
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}