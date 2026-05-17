import { apiClient, buildQuery } from '@/api/client.js'

export class ProjectsApi {
  constructor({ client = apiClient } = {}) {
    this.client = client
  }

  list(params) {
    return this.client.request(`/api/projects${buildQuery(params)}`)
  }

  create(body) {
    return this.client.request('/api/projects', { method: 'POST', body })
  }

  get(projectId) {
    return this.client.request(`/api/projects/${projectId}`)
  }

  update(projectId, body) {
    return this.client.request(`/api/projects/${projectId}`, { method: 'PATCH', body })
  }

  delete(projectId) {
    return this.client.request(`/api/projects/${projectId}`, { method: 'DELETE' })
  }
}

export const projectsApi = new ProjectsApi()

export function listProjects(params) {
  return projectsApi.list(params)
}

export function createProject(body) {
  return projectsApi.create(body)
}

export function getProject(projectId) {
  return projectsApi.get(projectId)
}

export function updateProject(projectId, body) {
  return projectsApi.update(projectId, body)
}

export function deleteProject(projectId) {
  return projectsApi.delete(projectId)
}
