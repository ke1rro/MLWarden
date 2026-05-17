import { apiRequest, buildQuery } from '@/api/client.js'

export function listRuns(projectId, params) {
  return apiRequest(`/api/projects/${projectId}/runs${buildQuery(params)}`)
}

export function createRun(projectId, body) {
  return apiRequest(`/api/projects/${projectId}/runs`, { method: 'POST', body })
}

export function getRun(runId) {
  return apiRequest(`/api/runs/${runId}`)
}

export function updateRun(runId, body) {
  return apiRequest(`/api/runs/${runId}`, { method: 'PATCH', body })
}

export function startRun(runId) {
  return apiRequest(`/api/runs/${runId}/start`, { method: 'POST' })
}

export function finishRun(runId, summary = {}) {
  return apiRequest(`/api/runs/${runId}/finish`, { method: 'POST', body: { summary } })
}

export function failRun(runId, body = {}) {
  return apiRequest(`/api/runs/${runId}/fail`, { method: 'POST', body })
}

export function cancelRun(runId) {
  return apiRequest(`/api/runs/${runId}/cancel`, { method: 'POST' })
}

export function deleteRun(runId) {
  return apiRequest(`/api/runs/${runId}`, { method: 'DELETE' })
}
