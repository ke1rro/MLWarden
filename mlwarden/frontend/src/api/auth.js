import { apiRequest } from '@/api/client.js'

export function loginRequest(credentials) {
  return apiRequest('/api/auth/login', { method: 'POST', body: credentials })
}

export function getCurrentUser() {
  return apiRequest('/api/auth/me')
}
