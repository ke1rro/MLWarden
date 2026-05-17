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
import { artifactsApi } from '@/api/artifacts.js'
import { eventsApi } from '@/api/events.js'
import { imagesApi } from '@/api/images.js'
import { logsApi } from '@/api/logs.js'
import { metricsApi } from '@/api/metrics.js'
import { paramsApi } from '@/api/params.js'
import { projectsApi } from '@/api/projects.js'
import { runsApi } from '@/api/runs.js'
import { tablesApi } from '@/api/tables.js'
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
      const runResponse = await runsApi.get(runId)
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
        projectsApi.get(runResponse.project_id),
        paramsApi.get(runId),
        metricsApi.summary(runId),
        logsApi.list(runId, { limit: 500 }),
        tablesApi.list(runId),
        imagesApi.list(runId, { limit: 500 }),
        artifactsApi.list(runId, { limit: 500 }),
        eventsApi.listRun(runId, { limit: 500 }),
      ])

      const params = adaptParams(paramsResponse)
      const summaries = adaptMetricSummary(summaryResponse.items || [])
      const names = summaries.map((summary) => summary.name)
      const metricsResponse = names.length ? await metricsApi.get(runId, names) : { series: {} }

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

  const loadTableRows = useCallback(async (tableName, params) => {
    const response = await tablesApi.get(runId, tableName, params)
    return {
      rows: adaptTableRows(response.rows || response.items || []),
      total: response.total || 0,
    }
  }, [runId])

  const uploadRunImage = useCallback(async (payload) => {
    await imagesApi.upload(runId, payload)
    await reload()
  }, [reload, runId])

  const uploadRunArtifact = useCallback(async (payload) => {
    await artifactsApi.upload(runId, payload)
    await reload()
  }, [reload, runId])

  const downloadRunArtifact = useCallback(async (artifact) => {
    await artifactsApi.download(artifact.id, artifact.original_filename || artifact.name)
  }, [])

  const getRunImageUrl = useCallback((imageId) => imagesApi.getFileUrl(imageId), [])

  return {
    ...workspace,
    error,
    isLoading,
    reload,
    loadTableRows,
    uploadRunImage,
    uploadRunArtifact,
    downloadRunArtifact,
    getRunImageUrl,
  }
}
