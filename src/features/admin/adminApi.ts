import { apiRequest } from '../../services/apiClient';
import type { User, UserRole } from '../../types';

export const adminApi = {
  createUser: (payload: { name: string; email: string; password: string; role: UserRole }) =>
    apiRequest<{ user: User }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateUser: (userId: string, payload: { name?: string; email?: string; role?: UserRole }) =>
    apiRequest<{ user: User }>(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  updateUserStatus: (userId: string, status: 'active' | 'disabled') =>
    apiRequest<{ user: User; status: User['status'] }>(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};
