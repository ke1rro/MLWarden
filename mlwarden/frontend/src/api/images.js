import { apiClient, buildQuery } from '@/api/client.js'

class ImagesApi {
  constructor({ client = apiClient } = {}) {
    this.client = client
  }

  list(runId, params = {}) {
    return this.client.request(`/api/runs/${runId}/images${buildQuery(params)}`)
  }

  get(imageId) {
    return this.client.request(`/api/images/${imageId}`)
  }

  getFileUrl(imageId) {
    return this.client.fileObjectUrl(`/api/images/${imageId}/file`)
  }

  upload(runId, { file, name, step, caption, metadata }) {
    const formData = new FormData()
    formData.set('file', file)
    if (name) formData.set('name', name)
    if (step !== undefined && step !== null && step !== '') formData.set('step', step)
    if (caption) formData.set('caption', caption)
    if (metadata) formData.set('metadata', JSON.stringify(metadata))
    return this.client.request(`/api/runs/${runId}/images`, { method: 'POST', formData })
  }
}

export const imagesApi = new ImagesApi()
