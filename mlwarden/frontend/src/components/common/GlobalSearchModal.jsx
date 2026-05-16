import { LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadWorkspaceSnapshot } from '@/api/workspace.js'

const groups = [
  ['projects', 'Projects'],
  ['runs', 'Runs'],
  ['charts', 'Charts'],
  ['artifacts', 'Artifacts'],
]

function containsKeyword(values, keyword) {
  const haystack = values.filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(keyword.toLowerCase())
}

function withHighlight(to, query) {
  const [path, search = ''] = to.split('?')
  const params = new URLSearchParams(search)
  params.set('highlight', query)
  return `${path}?${params.toString()}`
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
      detail: `${chart.projectName} · ${chart.chart_type || chart.type || 'chart'}`,
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

export function GlobalSearchModal({ query = '', onClose }) {
  const [snapshot, setSnapshot] = useState(null)
  const [loadedQuery, setLoadedQuery] = useState('')
  const [error, setError] = useState('')
  const trimmedQuery = query.trim()

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      return undefined
    }

    let cancelled = false
    loadWorkspaceSnapshot({ includeArtifacts: true })
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
  }, [trimmedQuery])

  const isLoading = trimmedQuery.length >= 2 && loadedQuery !== trimmedQuery && !error
  const results = useMemo(
    () => (snapshot && loadedQuery === trimmedQuery && trimmedQuery.length >= 2 ? buildResults(snapshot, trimmedQuery) : {}),
    [loadedQuery, snapshot, trimmedQuery],
  )
  const total = groups.reduce((sum, [key]) => sum + (results[key]?.length || 0), 0)

  return (
    <div className="global-search-dropdown" role="dialog" aria-label="Search results">
      {trimmedQuery.length < 2 ? <p className="muted-copy">Type at least two characters.</p> : null}
      {isLoading ? <p className="search-loading"><LoaderCircle size={16} /> Searching...</p> : null}
      {trimmedQuery.length >= 2 && loadedQuery === trimmedQuery && error ? <p className="form-error">{error}</p> : null}
      {!isLoading && trimmedQuery.length >= 2 && loadedQuery === trimmedQuery && !error && !total ? (
        <p className="muted-copy">No matching workspace items.</p>
      ) : null}
      <div className="global-search-results">
        {groups.map(([key, label]) => {
          const items = results[key] || []
          if (!items.length) return null
          return (
            <section className="search-result-group" key={key}>
              <h3>{label}</h3>
              {items.slice(0, 8).map((item) => (
                <Link
                  className="search-result-item"
                  data-search-text={`${item.title} ${item.detail}`}
                  key={item.id}
                  onClick={onClose}
                  to={withHighlight(item.to, trimmedQuery)}
                >
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </Link>
              ))}
            </section>
          )
        })}
      </div>
    </div>
  )
}
