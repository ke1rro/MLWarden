import { useCallback, useEffect, useMemo, useState } from 'react'
import { runsApi } from '@/api/runs.js'
import { workspaceApi } from '@/api/workspace.js'

export const runStatusOptions = ['all', 'created', 'running', 'finished', 'failed', 'cancelled']

export function useRunsWorkspace({ runs = runsApi, workspace = workspaceApi } = {}) {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const reload = useCallback(async () => {
    setError('')
    try {
      const projects = await workspace.loadProjects()
      const nextRuns = await workspace.loadAllRuns(projects)
      setItems(nextRuns)
    } catch (err) {
      setError(err.message || 'Failed to load runs.')
    } finally {
      setIsLoading(false)
    }
  }, [workspace])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError('')
      try {
        const projects = await workspace.loadProjects()
        const nextRuns = await workspace.loadAllRuns(projects)
        if (!cancelled) setItems(nextRuns)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load runs.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [workspace])

  const filteredRuns = useMemo(
    () =>
      items.filter((run) => {
        const matchesStatus = status === 'all' || run.status === status
        const matchesQuery = `${run.name} ${run.projectName} ${run.description} ${run.tags?.join(' ')}`.toLowerCase().includes(query.toLowerCase())
        return matchesStatus && matchesQuery
      }),
    [items, query, status],
  )

  async function confirmDelete() {
    setIsDeleting(true)
    setError('')
    try {
      await runs.delete(deleteTarget.id)
      setDeleteTarget(null)
      await reload()
    } catch (err) {
      setError(err.message || 'Failed to delete run.')
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    deleteTarget,
    error,
    filteredRuns,
    isDeleting,
    isLoading,
    query,
    runs: items,
    status,
    confirmDelete,
    setDeleteTarget,
    setQuery,
    setStatus,
  }
}
