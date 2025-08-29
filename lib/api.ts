const API_URL = '/api';

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    let errorMessage = `API Error: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // JSON 파싱 실패 시 기본 에러 메시지 사용
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export const api = {
  health: () => fetchAPI('/health'),
  
  auth: {
    login: (data: { email: string; password: string }) =>
      fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    register: (data: { name: string; email: string; password: string; confirmPassword?: string }) =>
      fetchAPI('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    logout: () =>
      fetchAPI('/auth/logout', {
        method: 'POST',
      }),
    
    me: () => fetchAPI('/auth/me'),
  },
  
  users: {
    getAll: () => fetchAPI('/users'),
    create: (data: { name: string; email: string }) => 
      fetchAPI('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};