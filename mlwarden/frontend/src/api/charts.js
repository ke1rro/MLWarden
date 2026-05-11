import { apiRequest } from '@/api/client.js'

export function listCharts(projectId) {
  return apiRequest(`/api/projects/${projectId}/charts`)
}

export function createChart(projectId, body) {
  return apiRequest(`/api/projects/${projectId}/charts`, { method: 'POST', body })
}

export function getChart(chartId) {
  return apiRequest(`/api/charts/${chartId}`)
}

export function updateChart(chartId, body) {
  return apiRequest(`/api/charts/${chartId}`, { method: 'PATCH', body })
}

export function deleteChart(chartId) {
  return apiRequest(`/api/charts/${chartId}`, { method: 'DELETE' })
}
