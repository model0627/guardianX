'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function GoogleAuthCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Google 인증 처리 중...');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    if (error) {
      setStatus('error');
      setMessage('Google 인증이 취소되었거나 오류가 발생했습니다.');
      setTimeout(() => window.close(), 3000);
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('인증 코드를 받을 수 없습니다.');
      setTimeout(() => window.close(), 3000);
      return;
    }

    // 인증 코드를 서버로 전송
    handleAuthCallback(code);
  }, [searchParams]);

  const handleAuthCallback = async (code: string) => {
    try {
      const response = await fetch('/api/auth/google/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        const data = await response.json();
        setStatus('success');
        setMessage(`Google 계정이 성공적으로 연결되었습니다: ${data.googleAccount?.email}`);
        
        // 부모 창에 성공 메시지 전달 (필요시)
        if (window.opener) {
          window.opener.postMessage({ 
            type: 'GOOGLE_AUTH_SUCCESS', 
            data: data.googleAccount 
          }, window.location.origin);
        }
        
        // 3초 후 창 닫기
        setTimeout(() => window.close(), 3000);
      } else {
        const error = await response.json();
        setStatus('error');
        setMessage(error.error || 'Google 계정 연결에 실패했습니다.');
        setTimeout(() => window.close(), 3000);
      }
    } catch (error) {
      console.error('Google auth callback error:', error);
      setStatus('error');
      setMessage('인증 처리 중 오류가 발생했습니다.');
      setTimeout(() => window.close(), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <Loader className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">인증 처리 중</h2>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">인증 성공</h2>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">인증 실패</h2>
            </>
          )}
          
          <p className="text-gray-600">{message}</p>
          
          {status !== 'processing' && (
            <p className="text-sm text-gray-500 mt-4">
              이 창은 자동으로 닫힙니다...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}