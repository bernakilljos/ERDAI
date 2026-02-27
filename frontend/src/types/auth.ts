export type Role = 'ADMIN' | 'USER' | 'VIEWER'

export interface User {
  id: string
  loginId: string
  role: Role
  mustChangePassword: boolean
}

export interface LoginRequest {
  loginId: string
  password: string
}

export interface LoginResponse {
  user: User
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
