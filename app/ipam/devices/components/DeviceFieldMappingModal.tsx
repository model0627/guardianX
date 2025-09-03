'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight, RefreshCw } from 'lucide-react';

interface FieldMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiConnection: {
    id: string;
    name: string;
    api_url: string;
    field_mappings: Record<string, string>;
    sync_frequency_minutes?: number;
    sync_frequency_type?: string;
  };
  onSave: (mappings: Record<string, string>, syncSettings?: { frequency_minutes: number; frequency_type: string }) => Promise<void>;
}

const DATABASE_FIELDS = [
  { key: 'name', label: '디바이스 이름 (name)', required: true },
  { key: 'ip_address', label: 'IP 주소 (ip_address)', required: false },
  { key: 'mac_address', label: 'MAC 주소 (mac_address)', required: false },
  { key: 'device_type', label: '디바이스 타입 (device_type)', required: false },
  { key: 'os_name', label: '운영체제 (os_name)', required: false },
  { key: 'os_version', label: 'OS 버전 (os_version)', required: false },
  { key: 'hostname', label: '호스트명 (hostname)', required: false },
  { key: 'location', label: '위치 (location)', required: false },
  { key: 'description', label: '설명 (description)', required: false },
  { key: 'manufacturer', label: '제조사 (manufacturer)', required: false },
  { key: 'model', label: '모델 (model)', required: false },
  { key: 'serial_number', label: '시리얼 번호 (serial_number)', required: false },
];

export default function DeviceFieldMappingModal({ isOpen, onClose, apiConnection, onSave }: FieldMappingModalProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [apiFields, setApiFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sampleData, setSampleData] = useState<any>(null);
  const [syncFrequency, setSyncFrequency] = useState({
    minutes: 5,
    type: 'minutes'
  });

  useEffect(() => {
    if (isOpen) {
      setMappings(apiConnection.field_mappings || {});
      setSyncFrequency({
        minutes: apiConnection.sync_frequency_minutes || 5,
        type: apiConnection.sync_frequency_type || 'minutes'
      });
      fetchSampleData();
    }
  }, [isOpen, apiConnection]);

  const fetchSampleData = async () => {
    try {
      let response;
      
      // Check if this is a Google Sheets connection
      if (apiConnection.api_url?.includes('docs.google.com/spreadsheets')) {
        console.log('[DeviceFieldMapping] Detected Google Sheets URL, using Google Sheets API');
        
        // Extract spreadsheet ID from URL
        const spreadsheetIdMatch = apiConnection.api_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        const spreadsheetId = spreadsheetIdMatch ? spreadsheetIdMatch[1] : null;
        
        if (spreadsheetId) {
          // Use Google Sheets private API (with OAuth)
          response = await fetch('/api/google-sheets/private', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              spreadsheetId: spreadsheetId,
              sheetName: '', // Will use first sheet
              range: 'A:Z'
            }),
          });
        } else {
          throw new Error('Invalid Google Sheets URL');
        }
      } else {
        // Regular REST API
        console.log('[DeviceFieldMapping] Using regular proxy API for:', apiConnection.api_url);
        
        const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        response = await fetch('/api/proxy/fetch-api', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ url: apiConnection.api_url }),
        });
      }

      if (response.ok) {
        const result = await response.json();
        
        // Handle Google Sheets response structure
        const data = result.data || result;
        setSampleData(data);
        
        // Extract field names from the sample data
        if (Array.isArray(data) && data.length > 0) {
          const fields = Object.keys(data[0]);
          setApiFields(fields);
          console.log('[DeviceFieldMapping] Extracted fields:', fields);
        } else {
          console.log('[DeviceFieldMapping] No data or empty array received');
          setApiFields(['데이터가 없습니다']);
        }
      } else if (response.status === 401) {
        console.error('Authentication failed - please refresh the page and try again');
        setApiFields(['인증 오류: 페이지를 새로고침해주세요']);
      } else if (response.status === 502) {
        const errorData = await response.json().catch(() => ({}));
        console.error('External API error:', errorData);
        setApiFields([`외부 API 오류: ${errorData.details || errorData.error || 'API가 응답하지 않습니다'}`]);
      } else {
        console.error(`API call failed: ${response.status}`);
        const errorData = await response.json().catch(() => ({}));
        setApiFields([`오류: ${errorData.error || 'API 호출 실패'}`]);
      }
    } catch (error) {
      console.error('Failed to fetch sample data:', error);
      setApiFields(['네트워크 오류: API에 연결할 수 없습니다']);
    }
  };

  const handleMappingChange = (dbField: string, apiField: string) => {
    setMappings(prev => ({
      ...prev,
      [dbField]: apiField
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(mappings, {
        frequency_minutes: syncFrequency.minutes,
        frequency_type: syncFrequency.type
      });
      onClose();
    } catch (error) {
      console.error('Failed to save mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">디바이스 필드 매핑 설정 - {apiConnection.name}</h2>
            <p className="text-sm text-gray-600 mt-1">API 응답 필드를 디바이스 데이터베이스 필드에 매핑하세요.</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Sync Frequency Configuration */}
          <div className="mb-6 p-4 bg-orange-50 rounded-lg">
            <h3 className="text-lg font-medium mb-4">자동 동기화 주기 설정</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  주기
                </label>
                <input
                  type="number"
                  min="1"
                  value={syncFrequency.minutes}
                  onChange={(e) => setSyncFrequency(prev => ({
                    ...prev,
                    minutes: parseInt(e.target.value) || 1
                  }))}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  단위
                </label>
                <select
                  value={syncFrequency.type}
                  onChange={(e) => setSyncFrequency(prev => ({
                    ...prev,
                    type: e.target.value
                  }))}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="minutes">분</option>
                  <option value="hours">시간</option>
                  <option value="days">일</option>
                </select>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              현재 설정: {syncFrequency.minutes} {
                syncFrequency.type === 'minutes' ? '분' :
                syncFrequency.type === 'hours' ? '시간' : '일'
              }마다 자동 동기화
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mapping Configuration */}
            <div>
              <h3 className="text-lg font-medium mb-4">필드 매핑</h3>
              <div className="space-y-4">
                {DATABASE_FIELDS.map((dbField) => (
                  <div key={dbField.key} className="flex items-center space-x-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {dbField.label}
                        {dbField.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <select
                        value={mappings[dbField.key] || ''}
                        onChange={(e) => handleMappingChange(dbField.key, e.target.value)}
                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">선택하세요...</option>
                        {apiFields.map((field) => (
                          <option key={field} value={field}>
                            {field}
                          </option>
                        ))}
                      </select>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <div className="p-2 bg-gray-50 rounded border text-sm">
                        {mappings[dbField.key] || '매핑되지 않음'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample Data Preview */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">API 응답 샘플</h3>
                <button
                  onClick={fetchSampleData}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  새로고침
                </button>
              </div>
              
              {sampleData ? (
                <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-sm text-gray-800">
                    {JSON.stringify(sampleData, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                  API 데이터를 불러오는 중...
                </div>
              )}

              {/* Field List */}
              {apiFields.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">사용 가능한 필드</h4>
                  <div className="flex flex-wrap gap-2">
                    {apiFields.map((field) => (
                      <span
                        key={field}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <p className="text-sm text-gray-600">
            * 필수 필드는 반드시 매핑해야 합니다.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !mappings.name}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}