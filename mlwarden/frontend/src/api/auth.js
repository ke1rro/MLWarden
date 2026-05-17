import { apiClient } from '@/api/client.js'

export class AuthApi {
  constructor({ client = apiClient } = {}) {
    this.client = client
  }

  login(credentials) {
    return this.client.request('/api/auth/login', { method: 'POST', body: credentials })
  }

  currentUser() {
    return this.client.request('/api/auth/me')
  }
}

export const authApi = new AuthApi()

export function loginRequest(credentials) {
  return authApi.login(credentials)
}

export function getCurrentUser() {
  return authApi.currentUser()
}
