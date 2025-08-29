'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

interface Library {
  id: string;
  name: string;
  version: string;
  vendor: string;
  type: string;
  product_type: string;
  device_name: string;
  process_name: string;
  install_path: string;
  install_date: string;
  license_type: string;
  license_expiry: string;
  last_update: string;
  security_patch_level: string;
  vulnerability_status: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  status: string;
  description: string;
  tags: string[];
}

interface EditLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  library: Library | null;
  onSave: (libraryId: string, updates: Partial<Library>) => Promise<void>;
}

export default function EditLibraryModal({ isOpen, onClose, library, onSave }: EditLibraryModalProps) {
  const [formData, setFormData] = useState<Partial<Library>>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (library) {
      setFormData({
        name: library.name,
        version: library.version,
        vendor: library.vendor,
        type: library.type,
        product_type: library.product_type,
        device_name: library.device_name,
        process_name: library.process_name,
        install_path: library.install_path,
        install_date: library.install_date,
        license_type: library.license_type,
        license_expiry: library.license_expiry,
        last_update: library.last_update,
        security_patch_level: library.security_patch_level,
        vulnerability_status: library.vulnerability_status,
        cpu_usage: library.cpu_usage,
        memory_usage: library.memory_usage,
        disk_usage: library.disk_usage,
        status: library.status,
        description: library.description,
        tags: library.tags
      });
      setErrors({});
    }
  }, [library]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleTagsChange = (value: string) => {
    // Split by comma and trim whitespace
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag);
    handleChange('tags', tags);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = '이름은 필수입니다';
    }
    
    if (formData.cpu_usage && (formData.cpu_usage < 0 || formData.cpu_usage > 100)) {
      newErrors.cpu_usage = 'CPU 사용량은 0-100 사이여야 합니다';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !library) return;
    
    setSaving(true);
    try {
      await onSave(library.id, formData);
      onClose();
    } catch (error) {
      console.error('Failed to save library:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return 0;
    return Math.round(bytes / 1024 / 1024); // Convert to MB
  };

  const parseBytes = (mb: number) => {
    return mb * 1024 * 1024; // Convert MB to bytes
  };

  if (!isOpen || !library) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">라이브러리 편집</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="col-span-2">
              <h3 className="text-lg font-medium mb-4">기본 정보</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">버전</label>
              <input
                type="text"
                value={formData.version || ''}
                onChange={(e) => handleChange('version', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">제조사</label>
              <input
                type="text"
                value={formData.vendor || ''}
                onChange={(e) => handleChange('vendor', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">타입</label>
              <select
                value={formData.type || 'software'}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="software">Software</option>
                <option value="hardware">Hardware</option>
                <option value="firmware">Firmware</option>
                <option value="driver">Driver</option>
              </select>
            </div>

            {/* Device Information */}
            <div className="col-span-2 mt-4">
              <h3 className="text-lg font-medium mb-4">디바이스 정보</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">디바이스 이름</label>
              <input
                type="text"
                value={formData.device_name || ''}
                onChange={(e) => handleChange('device_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">프로세스 이름</label>
              <input
                type="text"
                value={formData.process_name || ''}
                onChange={(e) => handleChange('process_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">설치 경로</label>
              <input
                type="text"
                value={formData.install_path || ''}
                onChange={(e) => handleChange('install_path', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">설치 날짜</label>
              <input
                type="date"
                value={formData.install_date || ''}
                onChange={(e) => handleChange('install_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* License Information */}
            <div className="col-span-2 mt-4">
              <h3 className="text-lg font-medium mb-4">라이선스 정보</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">라이선스 타입</label>
              <select
                value={formData.license_type || ''}
                onChange={(e) => handleChange('license_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">선택하세요</option>
                <option value="commercial">Commercial</option>
                <option value="open_source">Open Source</option>
                <option value="trial">Trial</option>
                <option value="freeware">Freeware</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">라이선스 만료일</label>
              <input
                type="date"
                value={formData.license_expiry || ''}
                onChange={(e) => handleChange('license_expiry', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Security Information */}
            <div className="col-span-2 mt-4">
              <h3 className="text-lg font-medium mb-4">보안 정보</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">보안 패치 레벨</label>
              <input
                type="text"
                value={formData.security_patch_level || ''}
                onChange={(e) => handleChange('security_patch_level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">취약점 상태</label>
              <select
                value={formData.vulnerability_status || 'unknown'}
                onChange={(e) => handleChange('vulnerability_status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="unknown">Unknown</option>
                <option value="safe">Safe</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Resource Usage */}
            <div className="col-span-2 mt-4">
              <h3 className="text-lg font-medium mb-4">리소스 사용량</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPU 사용량 (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.cpu_usage || 0}
                onChange={(e) => handleChange('cpu_usage', parseFloat(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md ${errors.cpu_usage ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.cpu_usage && <p className="text-red-500 text-xs mt-1">{errors.cpu_usage}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                메모리 사용량 (MB)
              </label>
              <input
                type="number"
                min="0"
                value={formatBytes(formData.memory_usage || 0)}
                onChange={(e) => handleChange('memory_usage', parseBytes(parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                디스크 사용량 (MB)
              </label>
              <input
                type="number"
                min="0"
                value={formatBytes(formData.disk_usage || 0)}
                onChange={(e) => handleChange('disk_usage', parseBytes(parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Other Information */}
            <div className="col-span-2 mt-4">
              <h3 className="text-lg font-medium mb-4">기타 정보</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
              <select
                value={formData.status || 'active'}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                태그 (쉼표로 구분)
              </label>
              <input
                type="text"
                value={formData.tags?.join(', ') || ''}
                onChange={(e) => handleTagsChange(e.target.value)}
                placeholder="예: security, enterprise, monitoring"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 flex items-center"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  저장
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}