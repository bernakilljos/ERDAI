import type { LoginRequest, LoginResponse, User, ChangePasswordRequest } from '../types/auth'
import { request } from '../lib/fetchClient'

export const authApi = {
  login: (data: LoginRequest) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<void>('/auth/logout', { method: 'POST' }),

  me: () =>
    request<User>('/auth/me'),

  changePassword: (data: ChangePasswordRequest) =>
    request<void>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}
