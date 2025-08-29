'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface AutoSyncToggleProps {
  connectionId: string;
  isEnabled: boolean;
  onToggle: (connectionId: string, enabled: boolean) => Promise<void>;
}

export default function AutoSyncToggle({ connectionId, isEnabled, onToggle }: AutoSyncToggleProps) {
  const [enabled, setEnabled] = useState(isEnabled);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEnabled(isEnabled);
  }, [isEnabled]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const newState = !enabled;
      await onToggle(connectionId, newState);
      setEnabled(newState);
    } catch (error) {
      console.error('Failed to toggle auto-sync:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-green-600' : 'bg-gray-300'
        } ${loading ? 'opacity-50' : ''}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <div className="flex items-center text-xs text-gray-600">
        <RefreshCw className={`w-3 h-3 mr-1 ${enabled ? 'animate-spin' : ''}`} />
        {enabled ? '자동 (5분)' : '수동'}
      </div>
    </div>
  );
}