'use client';

import { useState, useEffect } from 'react';
import { X, Server, AlertCircle } from 'lucide-react';

interface Office {
  id: string;
  name: string;
}

interface ServerRoom {
  id?: string;
  name: string;
  description?: string;
  office_id: string;
  floor?: string;
  room_number?: string;
  temperature_monitoring?: boolean;
  humidity_monitoring?: boolean;
  access_control?: boolean;
}

interface ServerRoomFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (serverRoom: ServerRoom) => Promise<void>;
  serverRoom?: ServerRoom;
  mode: 'create' | 'edit';
}

export default function ServerRoomFormModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  serverRoom, 
  mode 
}: ServerRoomFormModalProps) {
  const [formData, setFormData] = useState<ServerRoom>({
    name: '',
    description: '',
    office_id: '',
    floor: '',
    room_number: '',
    temperature_monitoring: false,
    humidity_monitoring: false,
    access_control: false
  });
  const [offices, setOffices] = useState<Office[]>([]);
  const [errors, setErrors] = useState<Partial<ServerRoom>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOffices, setIsLoadingOffices] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadOffices();
    }
  }, [isOpen]);

  useEffect(() => {
    if (serverRoom && mode === 'edit') {
      setFormData(serverRoom);
    } else {
      setFormData({
        name: '',
        description: '',
        office_id: '',
        floor: '',
        room_number: '',
        temperature_monitoring: false,
        humidity_monitoring: false,
        access_control: false
      });
    }
    setErrors({});
  }, [serverRoom, mode, isOpen]);

  const loadOffices = async () => {
    try {
      setIsLoadingOffices(true);
      const response = await fetch('/api/ipam/offices', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setOffices(data.offices || []);
      }
    } catch (error) {
      console.error('Failed to load offices:', error);
    } finally {
      setIsLoadingOffices(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ServerRoom> = {};

    if (!formData.name.trim()) {
      newErrors.name = '서버실명은 필수입니다.';
    }

    if (!formData.office_id) {
      newErrors.office_id = '사무실 선택은 필수입니다.';
    }

    // No specific validation needed for boolean fields

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

  const handleInputChange = (field: keyof ServerRoom, value: string | number | boolean | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 실시간 에러 제거
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Server className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              {mode === 'create' ? '새 서버실 추가' : '서버실 정보 수정'}
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
            {/* 서버실명 */}
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                서버실명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="서버실명을 입력하세요"
                disabled={isSubmitting}
              />
              {errors.name && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.name}</span>
                </div>
              )}
            </div>

            {/* 사무실 선택 */}
            <div className="md:col-span-2">
              <label htmlFor="office_id" className="block text-sm font-medium text-gray-700 mb-2">
                사무실 <span className="text-red-500">*</span>
              </label>
              <select
                id="office_id"
                value={formData.office_id}
                onChange={(e) => handleInputChange('office_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.office_id ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting || isLoadingOffices}
              >
                <option value="">사무실을 선택하세요</option>
                {offices.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.name}
                  </option>
                ))}
              </select>
              {errors.office_id && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.office_id}</span>
                </div>
              )}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="서버실에 대한 설명을 입력하세요"
                disabled={isSubmitting}
              />
            </div>

            {/* 층수 */}
            <div>
              <label htmlFor="floor" className="block text-sm font-medium text-gray-700 mb-2">
                층수
              </label>
              <input
                type="text"
                id="floor"
                value={formData.floor}
                onChange={(e) => handleInputChange('floor', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="예: B1, 1F, 10A"
                disabled={isSubmitting}
              />
            </div>

            {/* 호실 번호 */}
            <div>
              <label htmlFor="room_number" className="block text-sm font-medium text-gray-700 mb-2">
                호실 번호
              </label>
              <input
                type="text"
                id="room_number"
                value={formData.room_number}
                onChange={(e) => handleInputChange('room_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="예: A101, B-205"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* 모니터링 설정 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-3">모니터링 설정</label>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="temperature_monitoring"
                  checked={formData.temperature_monitoring}
                  onChange={(e) => handleInputChange('temperature_monitoring', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isSubmitting}
                />
                <label htmlFor="temperature_monitoring" className="ml-2 block text-sm text-gray-900">
                  온도 모니터링
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="humidity_monitoring"
                  checked={formData.humidity_monitoring}
                  onChange={(e) => handleInputChange('humidity_monitoring', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isSubmitting}
                />
                <label htmlFor="humidity_monitoring" className="ml-2 block text-sm text-gray-900">
                  습도 모니터링
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="access_control"
                  checked={formData.access_control}
                  onChange={(e) => handleInputChange('access_control', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isSubmitting}
                />
                <label htmlFor="access_control" className="ml-2 block text-sm text-gray-900">
                  출입 통제 시스템
                </label>
              </div>
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
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || isLoadingOffices}
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