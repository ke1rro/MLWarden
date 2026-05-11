import { apiRequest, buildQuery, downloadToFile } from '@/api/client.js'

export function listArtifacts(runId, params = {}) {
  return apiRequest(`/api/runs/${runId}/artifacts${buildQuery(params)}`)
}

export function getArtifact(artifactId) {
  return apiRequest(`/api/artifacts/${artifactId}`)
}

export function downloadArtifact(artifactId, filename) {
  return downloadToFile(`/api/artifacts/${artifactId}/download`, filename)
}

export function uploadArtifact(runId, { file, name, artifactPath, metadata }) {
  const formData = new FormData()
  formData.set('file', file)
  if (name) formData.set('name', name)
  if (artifactPath) formData.set('artifact_path', artifactPath)
  if (metadata) formData.set('metadata', JSON.stringify(metadata))
  return apiRequest(`/api/runs/${runId}/artifacts`, { method: 'POST', formData })
}
