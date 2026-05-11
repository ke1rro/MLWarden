import { apiRequest, buildQuery } from '@/api/client.js'

export function getLogs(runId, params = {}) {
  return apiRequest(`/api/runs/${runId}/logs${buildQuery(params)}`)
}

export function appendLog(runId, body) {
  return apiRequest(`/api/runs/${runId}/logs`, { method: 'POST', body })
}
