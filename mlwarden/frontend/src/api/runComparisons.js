import { apiClient } from '@/api/client.js'

export class RunComparisonsApi {
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

export function compareRuns(projectId, body) {
  return runComparisonsApi.compare(projectId, body)
}

export function listRunComparisons(projectId) {
  return runComparisonsApi.list(projectId)
}

export function createRunComparison(projectId, body) {
  return runComparisonsApi.create(projectId, body)
}

export function updateRunComparison(projectId, comparisonId, body) {
  return runComparisonsApi.update(projectId, comparisonId, body)
}

export function deleteRunComparison(projectId, comparisonId) {
  return runComparisonsApi.delete(projectId, comparisonId)
}
