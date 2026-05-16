import { apiRequest } from './client.js'

export function getSystemMetrics() {
  return apiRequest('/api/system/metrics')
}
