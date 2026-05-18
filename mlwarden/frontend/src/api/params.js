import { apiClient } from '@/api/client.js'

class ParamsApi {
  constructor({ client = apiClient } = {}) {
    this.client = client
  }

  get(runId) {
    return this.client.request(`/api/runs/${runId}/params`)
  }

  put(runId, params) {
    return this.client.request(`/api/runs/${runId}/params`, { method: 'PUT', body: { params } })
  }
}

export const paramsApi = new ParamsApi()
