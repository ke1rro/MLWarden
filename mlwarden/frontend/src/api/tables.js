import { apiRequest, buildQuery } from '@/api/client.js'

export function listTables(runId) {
  return apiRequest(`/api/runs/${runId}/tables`)
}

export function replaceTable(runId, tableName, body) {
  return apiRequest(`/api/runs/${runId}/tables/${encodeURIComponent(tableName)}`, { method: 'PUT', body })
}

export function appendTableRows(runId, tableName, rows) {
  return apiRequest(`/api/runs/${runId}/tables/${encodeURIComponent(tableName)}/rows`, { method: 'POST', body: { rows } })
}

export function getTable(runId, tableName, params = {}) {
  return apiRequest(`/api/runs/${runId}/tables/${encodeURIComponent(tableName)}${buildQuery(params)}`)
}
