import { apiClient, buildQuery } from '@/api/client.js'

class TablesApi {
  constructor({ client = apiClient } = {}) {
    this.client = client
  }

  list(runId) {
    return this.client.request(`/api/runs/${runId}/tables`)
  }

  replace(runId, tableName, body) {
    return this.client.request(`/api/runs/${runId}/tables/${encodeURIComponent(tableName)}`, { method: 'PUT', body })
  }

  appendRows(runId, tableName, rows) {
    return this.client.request(`/api/runs/${runId}/tables/${encodeURIComponent(tableName)}/rows`, { method: 'POST', body: { rows } })
  }

  get(runId, tableName, params = {}) {
    return this.client.request(`/api/runs/${runId}/tables/${encodeURIComponent(tableName)}${buildQuery(params)}`)
  }
}

export const tablesApi = new TablesApi()
