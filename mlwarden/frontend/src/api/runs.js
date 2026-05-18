import { apiClient, buildQuery } from '@/api/client.js'

class RunsApi {
  constructor({ client = apiClient } = {}) {
    this.client = client
  }

  list(projectId, params) {
    return this.client.request(`/api/projects/${projectId}/runs${buildQuery(params)}`)
  }

  create(projectId, body) {
    return this.client.request(`/api/projects/${projectId}/runs`, { method: 'POST', body })
  }

  get(runId) {
    return this.client.request(`/api/runs/${runId}`)
  }

  update(runId, body) {
    return this.client.request(`/api/runs/${runId}`, { method: 'PATCH', body })
  }

  delete(runId) {
    return this.client.request(`/api/runs/${runId}`, { method: 'DELETE' })
  }
}

export const runsApi = new RunsApi()
