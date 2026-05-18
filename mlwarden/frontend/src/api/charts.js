import { apiClient } from '@/api/client.js'

class ChartsApi {
  constructor({ client = apiClient } = {}) {
    this.client = client
  }

  list(projectId) {
    return this.client.request(`/api/projects/${projectId}/charts`)
  }

  create(projectId, body) {
    return this.client.request(`/api/projects/${projectId}/charts`, { method: 'POST', body })
  }

  get(chartId) {
    return this.client.request(`/api/charts/${chartId}`)
  }

  update(chartId, body) {
    return this.client.request(`/api/charts/${chartId}`, { method: 'PATCH', body })
  }

  delete(chartId) {
    return this.client.request(`/api/charts/${chartId}`, { method: 'DELETE' })
  }
}

export const chartsApi = new ChartsApi()
