'use client';

import { useState, useEffect } from 'react';
import { X, Database, AlertCircle } from 'lucide-react';

interface ServerRoom {
  id: string;
  name: string;
  office_name: string;
}

interface Rack {
  id?: string;
  name: string;
  rack_number?: string;
  server_room_id: string;
  size_u: number;
  used_u?: number;
  description?: string;
}

interface RackFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rack: Rack) => Promise<void>;
  rack?: Rack;
  mode: 'create' | 'edit';
}

export default function RackFormModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  rack, 
  mode 
}: RackFormModalProps) {
  const [formData, setFormData] = useState<Rack>({
    name: '',
    rack_number: '',
    server_room_id: '',
    size_u: 42,
    used_u: 0,
    description: ''
  });
  const [serverRooms, setServerRooms] = useState<ServerRoom[]>([]);
  const [errors, setErrors] = useState<Partial<Rack>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingServerRooms, setIsLoadingServerRooms] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadServerRooms();
    }
  }, [isOpen]);

  useEffect(() => {
    if (rack && mode === 'edit') {
      setFormData(rack);
    } else {
      setFormData({
        name: '',
        rack_number: '',
        server_room_id: '',
        size_u: 42,
        used_u: 0,
        description: ''
      });
    }
    setErrors({});
  }, [rack, mode, isOpen]);

  const loadServerRooms = async () => {
    try {
      setIsLoadingServerRooms(true);
      const response = await fetch('/api/ipam/server-rooms', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setServerRooms(data.serverRooms || []);
      }
    } catch (error) {
      console.error('Failed to load server rooms:', error);
    } finally {
      setIsLoadingServerRooms(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};

    if (!formData.name.trim()) {
      newErrors.name = '랙명은 필수입니다.';
    }

    if (!formData.server_room_id) {
      newErrors.server_room_id = '서버실 선택은 필수입니다.';
    }

    if (!formData.size_u || formData.size_u < 1 || formData.size_u > 100) {
      newErrors.size_u = '랙 크기는 1U ~ 100U 범위여야 합니다.';
    }

    if (formData.used_u !== undefined && formData.used_u !== null) {
      if (formData.used_u < 0 || formData.used_u > formData.size_u) {
        newErrors.used_u = `사용중인 U는 0 ~ ${formData.size_u}U 범위여야 합니다.`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof Rack, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 실시간 에러 제거
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const calculateUsagePercentage = () => {
    if (!formData.size_u || formData.size_u === 0) return 0;
    return Math.round(((formData.used_u || 0) / formData.size_u) * 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Database className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              {mode === 'create' ? '새 랙 추가' : '랙 정보 수정'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 랙명 */}
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                랙명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="랙명을 입력하세요"
                disabled={isSubmitting}
              />
              {errors.name && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.name}</span>
                </div>
              )}
            </div>

            {/* 서버실 선택 */}
            <div className="md:col-span-2">
              <label htmlFor="server_room_id" className="block text-sm font-medium text-gray-700 mb-2">
                서버실 <span className="text-red-500">*</span>
              </label>
              <select
                id="server_room_id"
                value={formData.server_room_id}
                onChange={(e) => handleInputChange('server_room_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  errors.server_room_id ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting || isLoadingServerRooms}
              >
                <option value="">서버실을 선택하세요</option>
                {serverRooms.map((serverRoom) => (
                  <option key={serverRoom.id} value={serverRoom.id}>
                    {serverRoom.name} ({serverRoom.office_name})
                  </option>
                ))}
              </select>
              {errors.server_room_id && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.server_room_id}</span>
                </div>
              )}
            </div>

            {/* 랙 번호 */}
            <div>
              <label htmlFor="rack_number" className="block text-sm font-medium text-gray-700 mb-2">
                랙 번호
              </label>
              <input
                type="text"
                id="rack_number"
                value={formData.rack_number}
                onChange={(e) => handleInputChange('rack_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="예: RC-1, A10"
                disabled={isSubmitting}
              />
            </div>

            {/* 랙 크기 */}
            <div>
              <label htmlFor="size_u" className="block text-sm font-medium text-gray-700 mb-2">
                랙 크기 (U) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="size_u"
                value={formData.size_u}
                onChange={(e) => handleInputChange('size_u', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  errors.size_u ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="예: 42"
                min="1"
                max="100"
                disabled={isSubmitting}
              />
              {errors.size_u && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.size_u}</span>
                </div>
              )}
            </div>

            {/* 사용중인 U */}
            <div>
              <label htmlFor="used_u" className="block text-sm font-medium text-gray-700 mb-2">
                사용중인 U
              </label>
              <input
                type="number"
                id="used_u"
                value={formData.used_u || 0}
                onChange={(e) => handleInputChange('used_u', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  errors.used_u ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
                min="0"
                max={formData.size_u}
                disabled={isSubmitting}
              />
              {errors.used_u && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.used_u}</span>
                </div>
              )}
            </div>

            {/* 사용률 표시 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사용률
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                  <div 
                    className={`absolute left-0 top-0 h-full transition-all duration-300 ${
                      calculateUsagePercentage() > 80 ? 'bg-red-500' : 
                      calculateUsagePercentage() > 60 ? 'bg-orange-500' : 
                      'bg-green-500'
                    }`}
                    style={{ width: `${calculateUsagePercentage()}%` }}
                  ></div>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-700">
                    {formData.used_u || 0} / {formData.size_u}U
                  </span>
                </div>
                <span className={`text-sm font-medium ${
                  calculateUsagePercentage() > 80 ? 'text-red-600' : 
                  calculateUsagePercentage() > 60 ? 'text-orange-600' : 
                  'text-green-600'
                }`}>
                  {calculateUsagePercentage()}%
                </span>
              </div>
            </div>

            {/* 설명 */}
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                설명
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="랙에 대한 설명을 입력하세요"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || isLoadingServerRooms}
            >
              {isSubmitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {mode === 'create' ? '추가' : '수정'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}