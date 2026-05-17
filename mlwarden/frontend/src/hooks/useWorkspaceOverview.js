import { useEffect, useMemo, useState } from 'react'
import { workspaceApi } from '@/api/workspace.js'

export function useWorkspaceOverview({ api = workspaceApi } = {}) {
  const [snapshot, setSnapshot] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api.loadSnapshot()
      .then((data) => {
        if (!cancelled) setSnapshot(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load workspace.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [api])

  const summary = useMemo(() => {
    const projects = snapshot?.projects || []
    const runs = snapshot?.runs || []
    return {
      projects: projects.length,
      runs: runs.length,
      running: runs.filter((run) => run.status === 'running').length,
      charts: snapshot?.charts?.length || 0,
    }
  }, [snapshot])

  return {
    error,
    isLoading,
    snapshot,
    summary,
  }
}
