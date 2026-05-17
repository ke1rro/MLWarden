import { useCallback, useEffect, useState } from 'react'
import {
  adaptArtifact,
  adaptEvent,
  adaptImage,
  adaptLog,
  adaptMetricSummary,
  adaptParams,
  adaptProject,
  adaptRun,
  adaptTableMeta,
  adaptTableRows,
} from '@/api/adapters.js'
import { downloadArtifact, listArtifacts, uploadArtifact } from '@/api/artifacts.js'
import { listRunEvents } from '@/api/events.js'
import { listImages, uploadImage } from '@/api/images.js'
import { getLogs } from '@/api/logs.js'
import { getMetricSummary, getMetrics } from '@/api/metrics.js'
import { getParams } from '@/api/params.js'
import { getProject } from '@/api/projects.js'
import { cancelRun, failRun, finishRun, getRun, startRun } from '@/api/runs.js'
import { getTable, listTables } from '@/api/tables.js'
import { useNotifications } from '@/app/useNotifications.js'

const initialWorkspace = {
  project: null,
  run: null,
  metricSeries: {},
  metricSummaries: [],
  logs: [],
  tables: [],
  images: [],
  artifacts: [],
  events: [],
}

export function useRunWorkspace(runId) {
  const [workspace, setWorkspace] = useState(initialWorkspace)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const { subscribe } = useNotifications()

  const reload = useCallback(async () => {
    setError(null)
    try {
      const runResponse = await getRun(runId)
      const [
        projectResponse,
        paramsResponse,
        summaryResponse,
        logsResponse,
        tablesResponse,
        imagesResponse,
        artifactsResponse,
        eventsResponse,
      ] = await Promise.all([
        getProject(runResponse.project_id),
        getParams(runId),
        getMetricSummary(runId),
        getLogs(runId, { limit: 500 }),
        listTables(runId),
        listImages(runId, { limit: 500 }),
        listArtifacts(runId, { limit: 500 }),
        listRunEvents(runId, { limit: 500 }),
      ])

      const params = adaptParams(paramsResponse)
      const summaries = adaptMetricSummary(summaryResponse.items || [])
      const names = summaries.map((summary) => summary.name)
      const metricsResponse = names.length ? await getMetrics(runId, names) : { series: {} }

      setWorkspace({
        project: adaptProject(projectResponse),
        run: adaptRun(runResponse, params),
        metricSummaries: summaries,
        metricSeries: metricsResponse.series || {},
        logs: (logsResponse.items || []).map(adaptLog),
        tables: (tablesResponse.items || []).map(adaptTableMeta),
        images: (imagesResponse.items || []).map(adaptImage),
        artifacts: (artifactsResponse.items || []).map(adaptArtifact),
        events: (eventsResponse.items || []).map(adaptEvent),
      })
    } catch (err) {
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [runId])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => subscribe((message) => {
    if (message.type === 'backend.connected' || message.run_id === runId) {
      reload()
    }
  }), [reload, runId, subscribe])

  const runAction = useCallback(async (action) => {
    setError(null)
    try {
      if (action === 'start') await startRun(runId)
      if (action === 'finish') await finishRun(runId)
      if (action === 'fail') await failRun(runId, { error_message: 'Marked failed from UI' })
      if (action === 'cancel') await cancelRun(runId)
      await reload()
    } catch (err) {
      setError(err)
    }
  }, [reload, runId])

  const loadTableRows = useCallback(async (tableName, params) => {
    const response = await getTable(runId, tableName, params)
    return {
      rows: adaptTableRows(response.rows || response.items || []),
      total: response.total || 0,
    }
  }, [runId])

  const uploadRunImage = useCallback(async (payload) => {
    await uploadImage(runId, payload)
    await reload()
  }, [reload, runId])

  const uploadRunArtifact = useCallback(async (payload) => {
    await uploadArtifact(runId, payload)
    await reload()
  }, [reload, runId])

  const downloadRunArtifact = useCallback(async (artifact) => {
    await downloadArtifact(artifact.id, artifact.original_filename || artifact.name)
  }, [])

  return {
    ...workspace,
    error,
    isLoading,
    reload,
    runAction,
    loadTableRows,
    uploadRunImage,
    uploadRunArtifact,
    downloadRunArtifact,
  }
}
