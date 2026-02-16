import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiMultipart, ApiOptions } from '@home-services/shared';
import { useAuth } from '../auth';

export function useApi() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const on401 = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);
  const request = useCallback(
    <T,>(path: string, options: ApiOptions = {}): Promise<T> => {
      return api<T>(path, {
        ...options,
        token: token ?? undefined,
        on401,
      });
    },
    [token, on401]
  );
  const multipartRequest = useCallback(
    <T,>(path: string, formData: FormData): Promise<T> => {
      return apiMultipart<T>(path, formData, {
        token: token ?? undefined,
        on401,
      });
    },
    [token, on401]
  );
  return { api: request, apiMultipart: multipartRequest, token };
}
