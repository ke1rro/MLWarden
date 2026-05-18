import { apiClient, buildQuery } from '@/api/client.js'

class LogsApi {
  constructor({ client = apiClient } = {}) {
    this.client = client
  }

  list(runId, params = {}) {
    return this.client.request(`/api/runs/${runId}/logs${buildQuery(params)}`)
  }

  append(runId, body) {
    return this.client.request(`/api/runs/${runId}/logs`, { method: 'POST', body })
  }
}

export const logsApi = new LogsApi()
