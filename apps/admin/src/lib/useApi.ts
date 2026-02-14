import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiOptions } from '@home-services/shared';
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
  return { api: request, token };
}
