import { useEffect, useMemo, useState } from 'react'
import { workspaceApi } from '@/api/workspace.js'

function containsKeyword(values, keyword) {
  const haystack = values.filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(keyword.toLowerCase())
}

function buildResults(snapshot, query) {
  const projects = snapshot.projects
    .filter((project) => containsKeyword([project.name, project.description, project.tags?.join(' ')], query))
    .map((project) => ({
      id: project.id,
      title: project.name,
      detail: project.description || 'Project workspace',
      to: `/projects/${project.id}`,
    }))

  const runs = snapshot.runs
    .filter((run) => containsKeyword([run.name, run.description, run.projectName, run.status, run.tags?.join(' ')], query))
    .map((run) => ({
      id: run.id,
      title: run.name,
      detail: `${run.projectName} · ${run.status} · ${run.duration}`,
      to: `/runs/${run.id}`,
    }))

  const charts = snapshot.charts
    .filter((chart) => containsKeyword([chart.name, chart.projectName, chart.chart_type, chart.config?.y_axis, chart.config?.metric], query))
    .map((chart) => ({
      id: chart.id,
      title: chart.name,
      detail: `${chart.projectName} · ${chart.chart_type ? `${chart.chart_type} chart` : (chart.type ? `${chart.type} chart` : 'chart')}`,
      to: `/projects/${chart.projectId}/charts`,
    }))

  const artifacts = snapshot.artifacts
    .filter((artifact) => containsKeyword([artifact.name, artifact.path, artifact.contentType, artifact.projectName, artifact.runName], query))
    .map((artifact) => ({
      id: artifact.id,
      title: artifact.name,
      detail: `${artifact.projectName} / ${artifact.runName} · ${artifact.path}`,
      to: `/runs/${artifact.runId}?tab=artifacts`,
    }))

  return { projects, runs, charts, artifacts }
}

export function useGlobalSearchResults(query, { api = workspaceApi } = {}) {
  const [snapshot, setSnapshot] = useState(null)
  const [loadedQuery, setLoadedQuery] = useState('')
  const [error, setError] = useState('')
  const trimmedQuery = query.trim()

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      return undefined
    }

    let cancelled = false
    api.loadSnapshot({ includeArtifacts: true })
      .then((nextSnapshot) => {
        if (!cancelled) {
          setSnapshot(nextSnapshot)
          setLoadedQuery(trimmedQuery)
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadedQuery(trimmedQuery)
          setError(err.message || 'Search failed.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [api, trimmedQuery])

  const results = useMemo(
    () => (snapshot && loadedQuery === trimmedQuery && trimmedQuery.length >= 2 ? buildResults(snapshot, trimmedQuery) : {}),
    [loadedQuery, snapshot, trimmedQuery],
  )

  return {
    error,
    isLoading: trimmedQuery.length >= 2 && loadedQuery !== trimmedQuery && !error,
    loadedQuery,
    results,
    trimmedQuery,
  }
}
