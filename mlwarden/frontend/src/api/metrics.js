import { apiClient, buildQuery } from '@/api/client.js'

export class MetricsApi {
  constructor({ client = apiClient } = {}) {
    this.client = client
  }

  log(runId, body) {
    return this.client.request(`/api/runs/${runId}/metrics`, { method: 'POST', body })
  }

  logBatch(runId, metrics) {
    return this.client.request(`/api/runs/${runId}/metrics/batch`, { method: 'POST', body: { metrics } })
  }

  get(runId, names = []) {
    return this.client.request(`/api/runs/${runId}/metrics${buildQuery({ names: names.join(',') })}`)
  }

  summary(runId) {
    return this.client.request(`/api/runs/${runId}/metrics/summary`)
  }
}

export const metricsApi = new MetricsApi()

export function logMetric(runId, body) {
  return metricsApi.log(runId, body)
}

export function logMetrics(runId, metrics) {
  return metricsApi.logBatch(runId, metrics)
}

export function getMetrics(runId, names = []) {
  return metricsApi.get(runId, names)
}

export function getMetricSummary(runId) {
  return metricsApi.summary(runId)
}
