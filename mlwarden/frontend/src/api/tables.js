import { apiClient, buildQuery } from '@/api/client.js'

export class TablesApi {
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

export function listTables(runId) {
  return tablesApi.list(runId)
}

export function replaceTable(runId, tableName, body) {
  return tablesApi.replace(runId, tableName, body)
}

export function appendTableRows(runId, tableName, rows) {
  return tablesApi.appendRows(runId, tableName, rows)
}

export function getTable(runId, tableName, params = {}) {
  return tablesApi.get(runId, tableName, params)
}
