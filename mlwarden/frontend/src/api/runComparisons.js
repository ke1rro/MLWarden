import { apiClient } from '@/api/client.js'

class RunComparisonsApi {
  constructor({ client = apiClient } = {}) {
    this.client = client
  }

  compare(projectId, body) {
    return this.client.request(`/api/projects/${projectId}/runs/compare`, { method: 'POST', body })
  }

  list(projectId) {
    return this.client.request(`/api/projects/${projectId}/run-comparisons`)
  }

  create(projectId, body) {
    return this.client.request(`/api/projects/${projectId}/run-comparisons`, { method: 'POST', body })
  }

  update(projectId, comparisonId, body) {
    return this.client.request(`/api/projects/${projectId}/run-comparisons/${comparisonId}`, { method: 'PATCH', body })
  }

  delete(projectId, comparisonId) {
    return this.client.request(`/api/projects/${projectId}/run-comparisons/${comparisonId}`, { method: 'DELETE' })
  }
}

export const runComparisonsApi = new RunComparisonsApi()
