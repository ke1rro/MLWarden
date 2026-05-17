import { apiClient, buildQuery } from '@/api/client.js'

export class EventsApi {
  constructor({ client = apiClient } = {}) {
    this.client = client
  }

  listRun(runId, params = {}) {
    return this.client.request(`/api/runs/${runId}/events${buildQuery(params)}`)
  }

  listRecent(params = {}) {
    return this.client.request(`/api/events/recent${buildQuery(params)}`)
  }
}

export const eventsApi = new EventsApi()

export function listRunEvents(runId, params = {}) {
  return eventsApi.listRun(runId, params)
}

export function listRecentEvents(params = {}) {
  return eventsApi.listRecent(params)
}
