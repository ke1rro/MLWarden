import { apiRequest } from '@/api/client.js'

export function getParams(runId) {
  return apiRequest(`/api/runs/${runId}/params`)
}

export function putParams(runId, params) {
  return apiRequest(`/api/runs/${runId}/params`, { method: 'PUT', body: { params } })
}
