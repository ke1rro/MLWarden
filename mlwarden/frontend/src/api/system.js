import { apiClient, buildQuery } from './client.js'

class SystemApi {
  constructor({ client = apiClient } = {}) {
    this.client = client
  }

  getMetrics() {
    return this.client.request('/api/system/metrics')
  }

  getMetricsHistory({ limit, since } = {}) {
    return this.client.request(`/api/system/metrics/history${buildQuery({ limit, since })}`)
  }
}

export const systemApi = new SystemApi()
