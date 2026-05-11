import { apiRequest, buildQuery, fileObjectUrl } from '@/api/client.js'

export function listImages(runId, params = {}) {
  return apiRequest(`/api/runs/${runId}/images${buildQuery(params)}`)
}

export function getImage(imageId) {
  return apiRequest(`/api/images/${imageId}`)
}

export function getImageFileUrl(imageId) {
  return fileObjectUrl(`/api/images/${imageId}/file`)
}

export function uploadImage(runId, { file, name, step, caption, metadata }) {
  const formData = new FormData()
  formData.set('file', file)
  if (name) formData.set('name', name)
  if (step !== undefined && step !== null && step !== '') formData.set('step', step)
  if (caption) formData.set('caption', caption)
  if (metadata) formData.set('metadata', JSON.stringify(metadata))
  return apiRequest(`/api/runs/${runId}/images`, { method: 'POST', formData })
}
