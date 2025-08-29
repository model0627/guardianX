'use client';

import { useState, useEffect } from 'react';
import { X, Search, Link2, Unlink } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  device_type: string;
  status: string;
}

interface DeviceLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  library: {
    id: string;
    name: string;
    linkedDevices: string[];
  };
  onLink: (libraryId: string, deviceIds: string[]) => Promise<void>;
}

export default function DeviceLinkModal({ isOpen, onClose, library, onLink }: DeviceLinkModalProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDevices();
      // Initialize with already linked devices
      setSelectedDevices(new Set(library.linkedDevices));
    }
  }, [isOpen, library.linkedDevices]);

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/ipam/devices', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    }
  };

  const handleToggleDevice = (deviceId: string) => {
    const newSelected = new Set(selectedDevices);
    if (newSelected.has(deviceId)) {
      newSelected.delete(deviceId);
    } else {
      newSelected.add(deviceId);
    }
    setSelectedDevices(newSelected);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onLink(library.id, Array.from(selectedDevices));
      onClose();
    } catch (error) {
      console.error('Failed to link devices:', error);
      // Error handling is done in the parent component
    } finally {
      setLoading(false);
    }
  };

  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">디바이스 연결 관리</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Library Info */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <p className="text-sm text-gray-600">라이브러리</p>
          <p className="font-medium">{library.name}</p>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="디바이스 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Device List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            {filteredDevices.length === 0 ? (
              <p className="text-center text-gray-500 py-8">디바이스가 없습니다.</p>
            ) : (
              filteredDevices.map((device) => (
                <div
                  key={device.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedDevices.has(device.id)
                      ? 'bg-orange-50 border-orange-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleToggleDevice(device.id)}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedDevices.has(device.id)}
                      onChange={() => {}}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className="text-sm text-gray-500">{device.device_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {library.linkedDevices.includes(device.id) && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        연결됨
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded ${
                      device.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {device.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <p className="text-sm text-gray-600">
            {selectedDevices.size}개 디바이스 선택됨
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
              disabled={loading}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                '저장 중...'
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  연결 저장
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}