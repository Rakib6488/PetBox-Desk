import { apiRequest } from '../../services/apiClient';
import type { User, UserRole } from '../../types';

export const adminApi = {
  createUser: (payload: { name: string; email: string; password: string; role: UserRole }) =>
    apiRequest<{ user: User }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
