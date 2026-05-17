import { apiClient, buildQuery } from '@/api/client.js'

export class LogsApi {
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

export function getLogs(runId, params = {}) {
  return logsApi.list(runId, params)
}

export function appendLog(runId, body) {
  return logsApi.append(runId, body)
}
