'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface ContactFieldMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiConnectionId: string;
  apiUrl: string;
  onSave: () => void;
}

const DATABASE_FIELDS = [
  { key: 'email', label: '이메일 (email)', required: true },
  { key: 'name', label: '이름 (name)', required: false },
  { key: 'phone', label: '전화번호 (phone)', required: false },
  { key: 'mobile', label: '휴대폰 (mobile)', required: false },
  { key: 'title', label: '직책 (title)', required: false },
  { key: 'department', label: '부서 (department)', required: false },
  { key: 'office_location', label: '근무지 (office_location)', required: false },
  { key: 'responsibilities', label: '담당업무 (responsibilities)', required: false },
];

export default function ContactFieldMappingModal({
  isOpen,
  onClose,
  apiConnectionId,
  apiUrl,
  onSave
}: ContactFieldMappingModalProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [apiFields, setApiFields] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [sampleData, setSampleData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && apiUrl) {
      fetchApiStructure();
    }
  }, [isOpen, apiUrl]);

  const fetchApiStructure = async () => {
    setLoading(true);
    try {
      // Fetch API data through proxy
      const response = await fetch('/api/proxy/fetch-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ url: apiUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch API data');
      }

      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        // Extract fields from the first item
        const firstItem = data[0];
        const fields = Object.keys(firstItem);
        setApiFields(fields);
        setSampleData(firstItem);
        
        // Auto-detect common mappings
        const autoMappings: Record<string, string> = {};
        DATABASE_FIELDS.forEach(dbField => {
          const matchingApiField = fields.find(apiField => 
            apiField.toLowerCase().includes(dbField.key.toLowerCase()) ||
            dbField.key.toLowerCase().includes(apiField.toLowerCase())
          );
          if (matchingApiField) {
            autoMappings[dbField.key] = matchingApiField;
          }
        });
        setFieldMappings(autoMappings);
      } else {
        throw new Error('API response is not a valid array');
      }
    } catch (error) {
      console.error('Error fetching API structure:', error);
      addToast('error', 'API 구조를 가져오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (dbField: string, apiField: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [dbField]: apiField
    }));
  };

  const handleSave = async () => {
    // Check if required fields are mapped
    const requiredFields = DATABASE_FIELDS.filter(f => f.required);
    const missingRequired = requiredFields.filter(f => !fieldMappings[f.key]);
    
    if (missingRequired.length > 0) {
      addToast('error', `필수 필드를 매핑해주세요: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      // Save field mappings
      const response = await fetch(`/api/api-connections/${apiConnectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          field_mappings: fieldMappings,
          sync_target: 'contacts'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save field mappings');
      }

      addToast('success', '필드 매핑이 저장되었습니다.');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving field mappings:', error);
      addToast('error', '필드 매핑 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">담당자 필드 매핑 설정</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : apiFields.length > 0 ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">필드 매핑 안내</p>
                    <p>API 응답의 필드를 데이터베이스 필드와 매핑해주세요. 이메일은 필수 필드입니다.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {DATABASE_FIELDS.map(dbField => (
                  <div key={dbField.key} className="flex items-center space-x-4">
                    <div className="w-1/3">
                      <label className="block text-sm font-medium text-gray-700">
                        {dbField.label}
                        {dbField.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <select
                        value={fieldMappings[dbField.key] || ''}
                        onChange={(e) => handleMappingChange(dbField.key, e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">선택하지 않음</option>
                        {apiFields.map(apiField => (
                          <option key={apiField} value={apiField}>
                            {apiField}
                            {sampleData && sampleData[apiField] && 
                              ` (예: ${String(sampleData[apiField]).substring(0, 30)})`
                            }
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {sampleData && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">샘플 데이터</h3>
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(sampleData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              API 필드를 불러올 수 없습니다.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={loading || apiFields.length === 0}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}