import { apiRequest, buildQuery } from '@/api/client.js'

export function logMetric(runId, body) {
  return apiRequest(`/api/runs/${runId}/metrics`, { method: 'POST', body })
}

export function logMetrics(runId, metrics) {
  return apiRequest(`/api/runs/${runId}/metrics/batch`, { method: 'POST', body: { metrics } })
}

export function getMetrics(runId, names = []) {
  return apiRequest(`/api/runs/${runId}/metrics${buildQuery({ names: names.join(',') })}`)
}

export function getMetricSummary(runId) {
  return apiRequest(`/api/runs/${runId}/metrics/summary`)
}
