import { apiClient, buildQuery } from '@/api/client.js'

class ArtifactsApi {
  constructor({ client = apiClient } = {}) {
    this.client = client
  }

  list(runId, params = {}) {
    return this.client.request(`/api/runs/${runId}/artifacts${buildQuery(params)}`)
  }

  get(artifactId) {
    return this.client.request(`/api/artifacts/${artifactId}`)
  }

  download(artifactId, filename) {
    return this.client.downloadToFile(`/api/artifacts/${artifactId}/download`, filename)
  }

  upload(runId, { file, name, artifactPath, metadata }) {
    const formData = new FormData()
    formData.set('file', file)
    if (name) formData.set('name', name)
    if (artifactPath) formData.set('artifact_path', artifactPath)
    if (metadata) formData.set('metadata', JSON.stringify(metadata))
    return this.client.request(`/api/runs/${runId}/artifacts`, { method: 'POST', formData })
  }
}

export const artifactsApi = new ArtifactsApi()
