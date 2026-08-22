import { User } from '../../types';
import { apiRequest } from '../../services/apiClient';

export const authApi = {
  login: (email: string, password: string) => apiRequest<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => apiRequest<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => apiRequest<{ user: User }>('/api/auth/me'),
};
