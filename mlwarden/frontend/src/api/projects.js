import { apiClient, buildQuery } from '@/api/client.js'

class ProjectsApi {
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
