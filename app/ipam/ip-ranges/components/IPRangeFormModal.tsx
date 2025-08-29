'use client';

import { useState, useEffect } from 'react';
import { X, Network, AlertCircle } from 'lucide-react';

interface IPRange {
  id?: string;
  name: string;
  description?: string;
  network_address: string;
  subnet_mask: number;
  gateway?: string;
  dns_servers?: string[];
  vlan_id?: number;
  ip_version: number;
}

interface IPRangeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ipRange: IPRange) => Promise<void>;
  ipRange?: IPRange;
  mode: 'create' | 'edit';
}

export default function IPRangeFormModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  ipRange, 
  mode 
}: IPRangeFormModalProps) {
  const [formData, setFormData] = useState<IPRange>({
    name: '',
    description: '',
    network_address: '',
    subnet_mask: 24,
    gateway: '',
    dns_servers: [],
    vlan_id: undefined,
    ip_version: 4
  });
  
  const [dnsServersText, setDnsServersText] = useState('');
  const [errors, setErrors] = useState<Partial<IPRange>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (ipRange && mode === 'edit') {
      setFormData(ipRange);
      setDnsServersText(ipRange.dns_servers?.join(', ') || '');
    } else {
      setFormData({
        name: '',
        description: '',
        network_address: '',
        subnet_mask: 24,
        gateway: '',
        dns_servers: [],
        vlan_id: undefined,
        ip_version: 4
      });
      setDnsServersText('');
    }
    setErrors({});
  }, [ipRange, mode, isOpen]);

  const validateIPAddress = (ip: string): boolean => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<IPRange> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'IP 대역명은 필수입니다.';
    }

    if (!formData.network_address.trim()) {
      newErrors.network_address = '네트워크 주소는 필수입니다.';
    } else if (!validateIPAddress(formData.network_address)) {
      newErrors.network_address = '올바른 IP 주소 형식이 아닙니다.';
    }

    if (!formData.subnet_mask || formData.subnet_mask < 8 || formData.subnet_mask > 32) {
      newErrors.subnet_mask = '서브넷 마스크는 8 ~ 32 범위여야 합니다.' as any;
    }

    if (formData.gateway && !validateIPAddress(formData.gateway)) {
      newErrors.gateway = '올바른 게이트웨이 IP 주소 형식이 아닙니다.';
    }

    if (formData.vlan_id && (formData.vlan_id < 1 || formData.vlan_id > 4094)) {
      newErrors.vlan_id = 'VLAN ID는 1 ~ 4094 범위여야 합니다.' as any;
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
      // Parse DNS servers from text
      const dnsServers = dnsServersText
        .split(',')
        .map(dns => dns.trim())
        .filter(dns => dns !== '');

      const submitData = {
        ...formData,
        dns_servers: dnsServers.length > 0 ? dnsServers : undefined,
        vlan_id: formData.vlan_id || undefined
      };

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof IPRange, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 실시간 에러 제거
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const calculateTotalIPs = () => {
    if (formData.subnet_mask && formData.subnet_mask >= 8 && formData.subnet_mask <= 32) {
      return Math.pow(2, (32 - formData.subnet_mask)) - 2; // 네트워크와 브로드캐스트 주소 제외
    }
    return 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Network className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              {mode === 'create' ? '새 IP 대역 추가' : 'IP 대역 정보 수정'}
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
            {/* IP 대역명 */}
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                IP 대역명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="예: 사무실 내부망, DMZ 구간"
                disabled={isSubmitting}
              />
              {errors.name && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.name}</span>
                </div>
              )}
            </div>

            {/* 네트워크 주소 */}
            <div>
              <label htmlFor="network_address" className="block text-sm font-medium text-gray-700 mb-2">
                네트워크 주소 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="network_address"
                value={formData.network_address}
                onChange={(e) => handleInputChange('network_address', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.network_address ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="예: 192.168.1.0"
                disabled={isSubmitting}
              />
              {errors.network_address && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.network_address}</span>
                </div>
              )}
            </div>

            {/* 서브넷 마스크 */}
            <div>
              <label htmlFor="subnet_mask" className="block text-sm font-medium text-gray-700 mb-2">
                서브넷 마스크 (CIDR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="subnet_mask"
                value={formData.subnet_mask}
                onChange={(e) => handleInputChange('subnet_mask', parseInt(e.target.value) || 24)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.subnet_mask ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="24"
                min="8"
                max="32"
                disabled={isSubmitting}
              />
              {errors.subnet_mask && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.subnet_mask}</span>
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                사용 가능한 IP: {calculateTotalIPs().toLocaleString()}개
              </div>
            </div>

            {/* 게이트웨이 */}
            <div>
              <label htmlFor="gateway" className="block text-sm font-medium text-gray-700 mb-2">
                게이트웨이
              </label>
              <input
                type="text"
                id="gateway"
                value={formData.gateway}
                onChange={(e) => handleInputChange('gateway', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.gateway ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="예: 192.168.1.1"
                disabled={isSubmitting}
              />
              {errors.gateway && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.gateway}</span>
                </div>
              )}
            </div>

            {/* VLAN ID */}
            <div>
              <label htmlFor="vlan_id" className="block text-sm font-medium text-gray-700 mb-2">
                VLAN ID
              </label>
              <input
                type="number"
                id="vlan_id"
                value={formData.vlan_id || ''}
                onChange={(e) => handleInputChange('vlan_id', e.target.value ? parseInt(e.target.value) : undefined)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.vlan_id ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="예: 100"
                min="1"
                max="4094"
                disabled={isSubmitting}
              />
              {errors.vlan_id && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.vlan_id}</span>
                </div>
              )}
            </div>

            {/* DNS 서버 */}
            <div className="md:col-span-2">
              <label htmlFor="dns_servers" className="block text-sm font-medium text-gray-700 mb-2">
                DNS 서버
              </label>
              <input
                type="text"
                id="dns_servers"
                value={dnsServersText}
                onChange={(e) => setDnsServersText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="예: 8.8.8.8, 8.8.4.4"
                disabled={isSubmitting}
              />
              <div className="text-xs text-gray-500 mt-1">
                여러 DNS 서버는 쉼표로 구분하여 입력하세요
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="IP 대역에 대한 설명을 입력하세요"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* 미리보기 */}
          {formData.network_address && formData.subnet_mask && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-2">네트워크 정보 미리보기</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">CIDR:</span>
                  <span className="ml-2 font-mono">{formData.network_address}/{formData.subnet_mask}</span>
                </div>
                <div>
                  <span className="text-gray-500">사용 가능한 IP:</span>
                  <span className="ml-2">{calculateTotalIPs().toLocaleString()}개</span>
                </div>
              </div>
            </div>
          )}

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
              disabled={isSubmitting}
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