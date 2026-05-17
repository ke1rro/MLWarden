import { apiClient } from './client.js'

export class SystemApi {
  constructor({ client = apiClient } = {}) {
    this.client = client
  }

  getMetrics() {
    return this.client.request('/api/system/metrics')
  }
}

export const systemApi = new SystemApi()

export function getSystemMetrics() {
  return systemApi.getMetrics()
}
