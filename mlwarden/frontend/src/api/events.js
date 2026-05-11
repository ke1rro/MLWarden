import { apiRequest, buildQuery } from '@/api/client.js'

export function listRunEvents(runId, params = {}) {
  return apiRequest(`/api/runs/${runId}/events${buildQuery(params)}`)
}

export function listRecentEvents(params = {}) {
  return apiRequest(`/api/events/recent${buildQuery(params)}`)
}
