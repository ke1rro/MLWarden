import { apiClient, buildQuery } from './client.js'

export class SystemApi {
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

export function getSystemMetrics() {
  return systemApi.getMetrics()
}

export function getSystemMetricsHistory(options) {
  return systemApi.getMetricsHistory(options)
}
