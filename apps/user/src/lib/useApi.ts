import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiMultipart, ApiOptions } from '@home-services/shared';
import { useAuth } from '../auth';

export function useApi() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const request = useCallback(
    <T,>(path: string, options: ApiOptions = {}): Promise<T> => {
      return api<T>(path, {
        ...options,
        token: token ?? undefined,
        on401: () => {
          logout();
          navigate('/login');
        },
      });
    },
    [token, logout, navigate]
  );

  const multipart = useCallback(
    <T,>(path: string, formData: FormData): Promise<T> => {
      return apiMultipart<T>(path, formData, {
        token: token ?? undefined,
        on401: () => {
          logout();
          navigate('/login');
        },
      });
    },
    [token, logout, navigate]
  );

  return { api: request, apiMultipart: multipart, token };
}
