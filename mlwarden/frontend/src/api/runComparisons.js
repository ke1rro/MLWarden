import { apiRequest } from '@/api/client.js'

export function compareRuns(projectId, body) {
  return apiRequest(`/api/projects/${projectId}/runs/compare`, { method: 'POST', body })
}

export function listRunComparisons(projectId) {
  return apiRequest(`/api/projects/${projectId}/run-comparisons`)
}

export function createRunComparison(projectId, body) {
  return apiRequest(`/api/projects/${projectId}/run-comparisons`, { method: 'POST', body })
}

export function updateRunComparison(projectId, comparisonId, body) {
  return apiRequest(`/api/projects/${projectId}/run-comparisons/${comparisonId}`, { method: 'PATCH', body })
}

export function deleteRunComparison(projectId, comparisonId) {
  return apiRequest(`/api/projects/${projectId}/run-comparisons/${comparisonId}`, { method: 'DELETE' })
}
