import { apiClient, buildQuery } from '@/api/client.js'

export class RunsApi {
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

export function listRuns(projectId, params) {
  return runsApi.list(projectId, params)
}

export function createRun(projectId, body) {
  return runsApi.create(projectId, body)
}

export function getRun(runId) {
  return runsApi.get(runId)
}

export function updateRun(runId, body) {
  return runsApi.update(runId, body)
}

export function deleteRun(runId) {
  return runsApi.delete(runId)
}
