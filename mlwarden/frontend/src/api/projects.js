import { apiRequest, buildQuery } from '@/api/client.js'

export function listProjects(params) {
  return apiRequest(`/api/projects${buildQuery(params)}`)
}

export function createProject(body) {
  return apiRequest('/api/projects', { method: 'POST', body })
}

export function getProject(projectId) {
  return apiRequest(`/api/projects/${projectId}`)
}

export function updateProject(projectId, body) {
  return apiRequest(`/api/projects/${projectId}`, { method: 'PATCH', body })
}

export function deleteProject(projectId) {
  return apiRequest(`/api/projects/${projectId}`, { method: 'DELETE' })
}
