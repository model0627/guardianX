'use client';

import { useState, useEffect } from 'react';
import { X, Monitor, AlertCircle } from 'lucide-react';

interface Rack {
  id: string;
  name: string;
  server_room_name: string;
  office_name: string;
  size_u: number;
  used_u: number;
}

interface Device {
  id?: string;
  name: string;
  description?: string;
  device_type: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  rack_id?: string;
  rack_position?: number;
  rack_size: number;
  power_consumption?: number;
  status: 'active' | 'inactive' | 'maintenance' | 'decommissioned';
  purchase_date?: string;
  warranty_end?: string;
}

interface DeviceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (device: Device) => Promise<void>;
  device?: Device;
  mode: 'create' | 'edit';
}

export default function DeviceFormModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  device, 
  mode 
}: DeviceFormModalProps) {
  const [formData, setFormData] = useState<Device>({
    name: '',
    description: '',
    device_type: 'server',
    manufacturer: '',
    model: '',
    serial_number: '',
    rack_id: '',
    rack_position: undefined,
    rack_size: 1,
    power_consumption: undefined,
    status: 'active',
    purchase_date: '',
    warranty_end: ''
  });
  
  const [racks, setRacks] = useState<Rack[]>([]);
  const [errors, setErrors] = useState<Partial<Device>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRacks, setIsLoadingRacks] = useState(true);

  const deviceTypes = [
    { value: 'server', label: '서버' },
    { value: 'switch', label: '스위치' },
    { value: 'router', label: '라우터' },
    { value: 'storage', label: '스토리지' },
    { value: 'firewall', label: '방화벽' },
    { value: 'load_balancer', label: '로드밸런서' },
    { value: 'ups', label: 'UPS' },
    { value: 'other', label: '기타' }
  ];

  const statusOptions = [
    { value: 'active', label: '활성' },
    { value: 'inactive', label: '비활성' },
    { value: 'maintenance', label: '점검' },
    { value: 'decommissioned', label: '폐기' }
  ];

  useEffect(() => {
    if (isOpen) {
      loadRacks();
    }
  }, [isOpen]);

  useEffect(() => {
    if (device && mode === 'edit') {
      setFormData({
        ...device,
        purchase_date: device.purchase_date ? device.purchase_date.split('T')[0] : '',
        warranty_end: device.warranty_end ? device.warranty_end.split('T')[0] : ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        device_type: 'server',
        manufacturer: '',
        model: '',
        serial_number: '',
        rack_id: '',
        rack_position: undefined,
        rack_size: 1,
        power_consumption: undefined,
        status: 'active',
        purchase_date: '',
        warranty_end: ''
      });
    }
    setErrors({});
  }, [device, mode, isOpen]);

  const loadRacks = async () => {
    try {
      setIsLoadingRacks(true);
      const response = await fetch('/api/ipam/racks', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRacks(Array.isArray(data.racks) ? data.racks : []);
      } else {
        console.error('Failed to load racks:', response.statusText);
        setRacks([]);
      }
    } catch (error) {
      console.error('Failed to load racks:', error);
      setRacks([]);
    } finally {
      setIsLoadingRacks(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = '디바이스명은 필수입니다.';
    }

    if (!formData.device_type) {
      newErrors.device_type = '디바이스 타입은 필수입니다.';
    }

    if (formData.rack_position !== undefined && formData.rack_position !== null) {
      if (formData.rack_position < 1) {
        newErrors.rack_position = '랙 위치는 1 이상이어야 합니다.';
      }
    }

    if (formData.rack_size < 1 || formData.rack_size > 10) {
      newErrors.rack_size = '랙 크기는 1U ~ 10U 범위여야 합니다.';
    }

    if (formData.power_consumption !== undefined && formData.power_consumption !== null && formData.power_consumption < 0) {
      newErrors.power_consumption = '전력 소비량은 0 이상이어야 합니다.';
    }

    setErrors(newErrors as any);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        rack_id: formData.rack_id || undefined,
        rack_position: formData.rack_position || undefined,
        power_consumption: formData.power_consumption || undefined,
        purchase_date: formData.purchase_date || undefined,
        warranty_end: formData.warranty_end || undefined
      };

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof Device, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 실시간 에러 제거
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Monitor className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              {mode === 'create' ? '새 디바이스 추가' : '디바이스 정보 수정'}
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
            {/* 디바이스명 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                디바이스명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="디바이스명을 입력하세요"
                disabled={isSubmitting}
              />
              {errors.name && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.name}</span>
                </div>
              )}
            </div>

            {/* 디바이스 타입 */}
            <div>
              <label htmlFor="device_type" className="block text-sm font-medium text-gray-700 mb-2">
                디바이스 타입 <span className="text-red-500">*</span>
              </label>
              <select
                id="device_type"
                value={formData.device_type}
                onChange={(e) => handleInputChange('device_type', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.device_type ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              >
                {deviceTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.device_type && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.device_type}</span>
                </div>
              )}
            </div>

            {/* 제조사 */}
            <div>
              <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700 mb-2">
                제조사
              </label>
              <input
                type="text"
                id="manufacturer"
                value={formData.manufacturer || ''}
                onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="예: Dell, HP, Cisco"
                disabled={isSubmitting}
              />
            </div>

            {/* 모델 */}
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                모델
              </label>
              <input
                type="text"
                id="model"
                value={formData.model || ''}
                onChange={(e) => handleInputChange('model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="예: PowerEdge R740"
                disabled={isSubmitting}
              />
            </div>

            {/* 시리얼 번호 */}
            <div>
              <label htmlFor="serial_number" className="block text-sm font-medium text-gray-700 mb-2">
                시리얼 번호
              </label>
              <input
                type="text"
                id="serial_number"
                value={formData.serial_number || ''}
                onChange={(e) => handleInputChange('serial_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="시리얼 번호를 입력하세요"
                disabled={isSubmitting}
              />
            </div>

            {/* 상태 */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                상태
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                disabled={isSubmitting}
              >
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 랙 선택 */}
            <div>
              <label htmlFor="rack_id" className="block text-sm font-medium text-gray-700 mb-2">
                설치 랙
              </label>
              <select
                id="rack_id"
                value={formData.rack_id || ''}
                onChange={(e) => handleInputChange('rack_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                disabled={isSubmitting || isLoadingRacks}
              >
                <option value="">랙을 선택하세요 (선택사항)</option>
                {racks.map((rack) => {
                  const usedPercentage = rack.size_u > 0 ? Math.round((rack.used_u / rack.size_u) * 100) : 0;
                  const availableU = rack.size_u - rack.used_u;
                  const isNearlyFull = usedPercentage >= 80;
                  const isFull = usedPercentage >= 100;
                  
                  return (
                    <option 
                      key={rack.id} 
                      value={rack.id}
                      disabled={isFull}
                    >
                      {rack.name} ({rack.server_room_name} - {rack.office_name}) - {rack.used_u}/{rack.size_u}U ({usedPercentage}% 사용중) {availableU}U 여유
                    </option>
                  );
                })}
              </select>
              
              {/* 선택된 랙의 상태 표시 */}
              {formData.rack_id && (
                <div className="mt-2">
                  {(() => {
                    const selectedRack = racks.find(rack => rack.id === formData.rack_id);
                    if (!selectedRack) return null;
                    
                    const usedPercentage = selectedRack.size_u > 0 ? Math.round((selectedRack.used_u / selectedRack.size_u) * 100) : 0;
                    const availableU = selectedRack.size_u - selectedRack.used_u;
                    const isNearlyFull = usedPercentage >= 80;
                    const isFull = usedPercentage >= 100;
                    
                    return (
                      <div className={`p-3 rounded-lg border ${
                        isFull ? 'bg-red-50 border-red-200' : 
                        isNearlyFull ? 'bg-yellow-50 border-yellow-200' : 
                        'bg-green-50 border-green-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            {selectedRack.name} 상태
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isFull ? 'bg-red-100 text-red-700' : 
                            isNearlyFull ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-green-100 text-green-700'
                          }`}>
                            {isFull ? '용량 초과' : isNearlyFull ? '용량 부족' : '여유 있음'}
                          </span>
                        </div>
                        
                        {/* 용량 바 */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div 
                            className={`h-2 rounded-full ${
                              isFull ? 'bg-red-500' : 
                              isNearlyFull ? 'bg-yellow-500' : 
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(usedPercentage, 100)}%` }}
                          ></div>
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>사용: {selectedRack.used_u}U / {selectedRack.size_u}U</span>
                          <span>여유: {availableU}U ({100 - usedPercentage}%)</span>
                        </div>
                        
                        {availableU < formData.rack_size && (
                          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                            ⚠️ 현재 디바이스 크기({formData.rack_size}U)가 랙 여유 공간({availableU}U)보다 큽니다.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* 랙 위치 */}
            <div>
              <label htmlFor="rack_position" className="block text-sm font-medium text-gray-700 mb-2">
                랙 위치 (U)
              </label>
              <input
                type="number"
                id="rack_position"
                value={formData.rack_position || ''}
                onChange={(e) => handleInputChange('rack_position', e.target.value ? parseInt(e.target.value) : undefined)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.rack_position ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="예: 10"
                min="1"
                disabled={isSubmitting}
              />
              {errors.rack_position && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.rack_position}</span>
                </div>
              )}
            </div>

            {/* 랙 크기 */}
            <div>
              <label htmlFor="rack_size" className="block text-sm font-medium text-gray-700 mb-2">
                랙 크기 (U)
              </label>
              <input
                type="number"
                id="rack_size"
                value={formData.rack_size}
                onChange={(e) => handleInputChange('rack_size', parseInt(e.target.value) || 1)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.rack_size ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="1"
                min="1"
                max="10"
                disabled={isSubmitting}
              />
              {errors.rack_size && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.rack_size}</span>
                </div>
              )}
            </div>

            {/* 전력 소비량 */}
            <div>
              <label htmlFor="power_consumption" className="block text-sm font-medium text-gray-700 mb-2">
                전력 소비량 (W)
              </label>
              <input
                type="number"
                id="power_consumption"
                value={formData.power_consumption || ''}
                onChange={(e) => handleInputChange('power_consumption', e.target.value ? parseInt(e.target.value) : undefined)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.power_consumption ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="예: 350"
                min="0"
                disabled={isSubmitting}
              />
              {errors.power_consumption && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.power_consumption}</span>
                </div>
              )}
            </div>

            {/* 구매일 */}
            <div>
              <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700 mb-2">
                구매일
              </label>
              <input
                type="date"
                id="purchase_date"
                value={formData.purchase_date || ''}
                onChange={(e) => handleInputChange('purchase_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                disabled={isSubmitting}
              />
            </div>

            {/* 보증 종료일 */}
            <div>
              <label htmlFor="warranty_end" className="block text-sm font-medium text-gray-700 mb-2">
                보증 종료일
              </label>
              <input
                type="date"
                id="warranty_end"
                value={formData.warranty_end || ''}
                onChange={(e) => handleInputChange('warranty_end', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                disabled={isSubmitting}
              />
            </div>

            {/* 설명 */}
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                설명
              </label>
              <textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="디바이스에 대한 설명을 입력하세요"
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
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || isLoadingRacks}
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