import { useEffect, useMemo, useState } from 'react'
import { artifactsApi } from '@/api/artifacts.js'
import { workspaceApi } from '@/api/workspace.js'

export function useArtifactsWorkspace({ artifactsApi: artifacts = artifactsApi, workspace = workspaceApi } = {}) {
  const [artifactsList, setArtifactsList] = useState([])
  const [selectedMetadata, setSelectedMetadata] = useState(null)
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadArtifacts() {
      try {
        const projects = await workspace.loadProjects()
        const runs = await workspace.loadAllRuns(projects)
        const nextArtifacts = await workspace.loadAllArtifacts(projects, runs)
        if (!cancelled) setArtifactsList(nextArtifacts)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load artifacts.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadArtifacts()
    return () => {
      cancelled = true
    }
  }, [workspace])

  const filteredArtifacts = useMemo(
    () => artifactsList.filter((artifact) => `${artifact.name} ${artifact.path} ${artifact.projectName} ${artifact.runName} ${artifact.contentType}`.toLowerCase().includes(query.toLowerCase())),
    [artifactsList, query],
  )

  async function download(artifact) {
    await artifacts.download(artifact.id, artifact.original_filename || artifact.name)
  }

  function viewMetadata(artifact) {
    setSelectedMetadata({ title: `${artifact.name} metadata`, value: artifact.metadata })
  }

  return {
    artifacts: artifactsList,
    error,
    filteredArtifacts,
    isLoading,
    query,
    selectedMetadata,
    download,
    setQuery,
    setSelectedMetadata,
    viewMetadata,
  }
}
