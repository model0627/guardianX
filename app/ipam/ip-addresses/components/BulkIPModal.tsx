'use client';

import { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, Network, Wifi, Globe } from 'lucide-react';

interface IPRange {
  id: string;
  network_address: string;
  subnet_mask: number;
  name: string;
}

interface BulkIPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkIPModal({ isOpen, onClose, onSuccess }: BulkIPModalProps) {
  const [ipRanges, setIpRanges] = useState<IPRange[]>([]);
  const [selectedRangeId, setSelectedRangeId] = useState('');
  const [startIP, setStartIP] = useState('');
  const [endIP, setEndIP] = useState('');
  const [status, setStatus] = useState<'available' | 'reserved' | 'disabled'>('available');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [ipCount, setIpCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadIPRanges();
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    calculateIPCount();
  }, [startIP, endIP]);

  const loadIPRanges = async () => {
    try {
      const response = await fetch('/api/ipam/ip-ranges', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded IP ranges:', data);
        // API 응답 구조에 따라 조정
        const ranges = data.ipRanges || data.ranges || data.data || [];
        setIpRanges(ranges);
      } else {
        console.error('Failed to load IP ranges:', response.status);
      }
    } catch (error) {
      console.error('Failed to load IP ranges:', error);
    }
  };

  const resetForm = () => {
    setSelectedRangeId('');
    setStartIP('');
    setEndIP('');
    setStatus('available');
    setDescription('');
    setIpCount(0);
    setError('');
  };

  const ipToNumber = (ip: string): number => {
    const parts = ip.split('.');
    if (parts.length !== 4) return 0;
    
    return parts.reduce((acc, part, index) => {
      const num = parseInt(part);
      if (isNaN(num) || num < 0 || num > 255) return 0;
      return acc + (num << (8 * (3 - index)));
    }, 0);
  };

  const numberToIP = (num: number): string => {
    return [
      (num >>> 24) & 255,
      (num >>> 16) & 255,
      (num >>> 8) & 255,
      num & 255
    ].join('.');
  };

  const calculateIPCount = () => {
    if (!startIP || !endIP) {
      setIpCount(0);
      return;
    }

    const start = ipToNumber(startIP);
    const end = ipToNumber(endIP);

    if (start === 0 || end === 0 || start > end) {
      setIpCount(0);
      setError(start > end ? '시작 IP가 종료 IP보다 큽니다.' : '');
      return;
    }

    const count = end - start + 1;
    if (count > 256) {
      setError('한 번에 최대 256개의 IP만 생성할 수 있습니다.');
      setIpCount(0);
    } else {
      setError('');
      setIpCount(count);
    }
  };

  const validateIPRange = () => {
    if (!selectedRangeId) {
      setError('IP 대역을 선택해주세요.');
      return false;
    }

    if (!startIP || !endIP) {
      setError('시작 IP와 종료 IP를 입력해주세요.');
      return false;
    }

    const start = ipToNumber(startIP);
    const end = ipToNumber(endIP);

    if (start === 0 || end === 0) {
      setError('유효한 IP 주소를 입력해주세요.');
      return false;
    }

    if (start > end) {
      setError('시작 IP가 종료 IP보다 큽니다.');
      return false;
    }

    const count = end - start + 1;
    if (count > 256) {
      setError('한 번에 최대 256개의 IP만 생성할 수 있습니다.');
      return false;
    }

    // Check if IPs are within the selected range
    const selectedRange = ipRanges.find(r => r.id === selectedRangeId);
    if (selectedRange) {
      const [network] = selectedRange.network_address.split('/');
      const networkNum = ipToNumber(network);
      const maskBits = parseInt(selectedRange.subnet_mask.toString());
      const hostBits = 32 - maskBits;
      const networkSize = Math.pow(2, hostBits);
      const networkEnd = networkNum + networkSize - 1;

      if (start < networkNum || end > networkEnd) {
        setError(`IP 주소가 선택한 대역(${selectedRange.network_address})을 벗어났습니다.`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateIPRange()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const start = ipToNumber(startIP);
      const end = ipToNumber(endIP);
      const ips = [];

      for (let i = start; i <= end; i++) {
        ips.push(numberToIP(i));
      }

      const response = await fetch('/api/ipam/ip-addresses/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ip_range_id: selectedRangeId,
          ip_addresses: ips,
          status,
          description
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`${result.created}개의 IP 주소가 생성되었습니다.${result.skipped > 0 ? ` (${result.skipped}개 중복)` : ''}`);
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        setError(error.error || 'IP 주소 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to create IP addresses:', error);
      setError('IP 주소 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">IP 주소 범위 추가</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {/* IP 대역 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IP 대역 선택 *
              </label>
              {ipRanges.length > 0 ? (
                <select
                  value={selectedRangeId}
                  onChange={(e) => {
                    setSelectedRangeId(e.target.value);
                    setError('');
                    // Auto-fill start IP based on selected range
                    const range = ipRanges.find(r => r.id === e.target.value);
                    if (range) {
                      const [network] = range.network_address.split('/');
                      const parts = network.split('.');
                      if (parts.length === 4) {
                        // Set start IP to network + 1 (skip network address)
                        parts[3] = String(parseInt(parts[3]) + 1);
                        setStartIP(parts.join('.'));
                      }
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="">IP 대역을 선택하세요</option>
                  {ipRanges.map((range) => (
                    <option key={range.id} value={range.id}>
                      {range.name} ({range.network_address})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                  IP 대역이 없습니다. 먼저 IP 대역을 생성해주세요.
                </div>
              )}
              {ipRanges.length === 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  IP 대역 관리 페이지에서 먼저 IP 대역을 생성해주세요.
                </p>
              )}
            </div>

            {/* IP 범위 입력 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시작 IP *
                </label>
                <input
                  type="text"
                  placeholder="192.168.1.1"
                  value={startIP}
                  onChange={(e) => {
                    setStartIP(e.target.value);
                    setError('');
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  종료 IP *
                </label>
                <input
                  type="text"
                  placeholder="192.168.1.100"
                  value={endIP}
                  onChange={(e) => {
                    setEndIP(e.target.value);
                    setError('');
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />
              </div>
            </div>

            {/* IP 개수 표시 */}
            {ipCount > 0 && !error && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    {ipCount}개의 IP 주소가 생성됩니다.
                  </span>
                </div>
              </div>
            )}

            {/* 상태 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                초기 상태
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'available' | 'reserved' | 'disabled')}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="available">사용 가능</option>
                <option value="reserved">예약됨</option>
                <option value="disabled">비활성</option>
              </select>
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="IP 주소 범위에 대한 설명 (선택사항)"
                disabled={loading}
              />
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-800">{error}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || ipCount === 0 || !!error}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  생성 중...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  IP 주소 생성
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}