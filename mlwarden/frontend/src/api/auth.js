import { apiClient } from '@/api/client.js'

class AuthApi {
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
