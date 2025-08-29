'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Network, Lock, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { toasts, removeToast, success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 페이지 타이틀 설정
    document.title = 'GuardianX IPAM - IP 주소 관리 시스템';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (activeTab === 'login') {
        const response = await api.auth.login({
          email: formData.email,
          password: formData.password
        });
        
        if (response.success) {
          // 로그인 성공
          success(`환영합니다, ${response.user.name}님!`);
          
          // 테넌트 상태 확인
          try {
            const tenantResponse = await fetch('/api/user/current-tenant', {
              method: 'GET',
              credentials: 'include'
            });
            
            if (tenantResponse.ok) {
              const tenantData = await tenantResponse.json();
              
              if (tenantData.hasTenant) {
                // 테넌트가 있으면 대시보드로
                setTimeout(() => router.push('/dashboard'), 1500);
              } else {
                // 테넌트가 없으면 테넌트 설정 페이지로
                setTimeout(() => router.push('/tenant-setup'), 1500);
              }
            } else {
              // 테넌트 정보 조회 실패 시 기본적으로 테넌트 설정으로
              setTimeout(() => router.push('/tenant-setup'), 1500);
            }
          } catch (err) {
            // 오류 시 기본적으로 테넌트 설정으로
            setTimeout(() => router.push('/tenant-setup'), 1500);
          }
        }
      } else {
        // 비밀번호 확인 검증
        if (formData.password !== formData.confirmPassword) {
          error('비밀번호가 일치하지 않습니다.');
          return;
        }
        
        const response = await api.auth.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        });
        
        if (response.success) {
          // 회원가입 성공
          success(`회원가입이 완료되었습니다, ${response.user.name}님!`);
          setActiveTab('login'); // 로그인 탭으로 전환
          setFormData({ email: formData.email, password: '', name: '', confirmPassword: '' });
        }
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      
      // API에서 반환된 에러 메시지를 그대로 사용
      let errorMessage = err.message || (activeTab === 'login' ? '로그인에 실패했습니다.' : '회원가입에 실패했습니다.');
      
      error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    console.log('Google login clicked');
    // TODO: Google OAuth 연동
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-orange-100 p-3 rounded-xl mr-3">
              <Shield className="w-8 h-8 text-orange-500" />
            </div>
            <div className="bg-orange-100 p-3 rounded-xl">
              <Network className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">CloudGuard IPAM</h1>
          <p className="text-gray-600">통합 클라우드 보안 및 IP 관리 플랫폼</p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* 플랫폼 접속 헤더 */}
          <div className="text-center mb-6">
            <Lock className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <h2 className="text-xl font-semibold text-gray-800">플랫폼 접속</h2>
          </div>

          {/* 탭 버튼 */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'login'
                  ? 'bg-orange-400 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'register'
                  ? 'bg-orange-400 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              회원가입
            </button>
          </div>

          {/* Google 로그인 버튼 */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-gray-700">Google로 로그인</span>
          </button>

          {/* 구분선 */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">또는</span>
            </div>
          </div>

          {/* 로그인/회원가입 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이름 필드 (회원가입 시에만 표시) */}
            {activeTab === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="홍길동"
                  required={activeTab === 'register'}
                />
              </div>
            )}

            {/* 이메일 필드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-1">
                  <span>이메일</span>
                </span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="admin@company.com"
                required
              />
            </div>

            {/* 비밀번호 필드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-1">
                  <Lock className="w-4 h-4" />
                  <span>비밀번호</span>
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* 비밀번호 확인 필드 (회원가입 시에만 표시) */}
            {activeTab === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="••••••••"
                  required={activeTab === 'register'}
                />
              </div>
            )}

            {/* 로그인/회원가입 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-400 hover:bg-orange-500 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>처리 중...</span>
                </div>
              ) : (
                activeTab === 'login' ? '로그인' : '회원가입'
              )}
            </button>
          </form>

          {/* 추가 링크 */}
          {activeTab === 'login' && (
            <div className="mt-4 text-center">
              <a href="#" className="text-sm text-orange-600 hover:text-orange-700">
                비밀번호를 잊으셨나요?
              </a>
            </div>
          )}
        </div>

        {/* 하단 정보 */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>GuardianX CloudGuard IPAM Platform</p>
          <p className="mt-1">
            <a href="/api-docs" className="text-orange-600 hover:text-orange-700">
              API 문서
            </a>
            {' · '}
            <a href="#" className="text-orange-600 hover:text-orange-700">
              도움말
            </a>
          </p>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}