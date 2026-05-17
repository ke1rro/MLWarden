import { useCallback, useEffect, useMemo, useState } from 'react'
import { chartsApi } from '@/api/charts.js'
import { workspaceApi } from '@/api/workspace.js'

export function useChartsIndexWorkspace({ charts = chartsApi, workspace = workspaceApi } = {}) {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadCharts = useCallback(async () => {
    setError('')
    try {
      const projects = await workspace.loadProjects()
      const nextCharts = await workspace.loadAllCharts(projects)
      setItems(nextCharts)
    } catch (err) {
      setError(err.message || 'Failed to load charts.')
    } finally {
      setIsLoading(false)
    }
  }, [workspace])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const projects = await workspace.loadProjects()
        const nextCharts = await workspace.loadAllCharts(projects)
        if (!cancelled) setItems(nextCharts)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load charts.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [workspace])

  const filteredCharts = useMemo(
    () => items.filter((chart) => `${chart.name} ${chart.projectName} ${chart.chart_type || chart.type || ''}`.toLowerCase().includes(query.toLowerCase())),
    [items, query],
  )

  async function confirmDelete() {
    setIsDeleting(true)
    setError('')
    try {
      await charts.delete(deleteTarget.id)
      setDeleteTarget(null)
      await loadCharts()
    } catch (err) {
      setError(err.message || 'Failed to delete chart.')
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    deleteTarget,
    error,
    filteredCharts,
    isDeleting,
    isLoading,
    query,
    confirmDelete,
    setDeleteTarget,
    setQuery,
  }
}
