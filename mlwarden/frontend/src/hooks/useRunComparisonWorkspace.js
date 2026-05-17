import { useEffect, useRef, useState } from 'react'
import { runComparisonsApi } from '@/api/runComparisons.js'
import { buildChartOption } from '@/components/charts/chartOptions.js'
import { exportChart } from '@/components/charts/chartExport.js'
import { runPaletteForRuns } from '@/components/charts/runColors.js'
import { saveTextFile } from '@/shared/downloads.js'

const preferredMetrics = ['val.psnr', 'val.best_psnr', 'val.loss', 'train.loss', 'epoch', 'val.accuracy', 'train.accuracy']

function defaultMetrics(sharedMetrics) {
  const preferred = preferredMetrics.filter((metric) => sharedMetrics.includes(metric))
  return (preferred.length ? preferred : sharedMetrics).slice(0, 5)
}

function metricLabel(axis) {
  if (axis === 'timestamp') return 'Time'
  if (axis === 'epoch') return 'Epoch'
  return 'Step'
}

function buildMetricSeries(comparison, metric) {
  return (comparison?.runs || [])
    .map((run) => ({
      name: run.name,
      runId: run.id,
      data: run.metrics?.[metric] || [],
    }))
    .filter((series) => series.data.length)
}

export function useRunComparisonWorkspace({
  activeComparison,
  onSaved,
  project,
  selectedRunIds,
  sharedMetrics,
}) {
  const [config, setConfig] = useState({
    name: `${project.name} comparison`,
    primaryMetric: '',
    metrics: [],
    xAxis: 'step',
    chartType: 'line',
    smoothing: 0,
    aggregation: 'none',
    metricDirection: 'auto',
    showLegend: true,
    showTooltip: true,
    highlightBestRun: true,
  })
  const [comparison, setComparison] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isMetricPickerOpen, setIsMetricPickerOpen] = useState(false)
  const [metricOrder, setMetricOrder] = useState([])
  const [panelSizes, setPanelSizes] = useState({})
  const [panelAxisLabels, setPanelAxisLabels] = useState({})
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [exportSelection, setExportSelection] = useState(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const chartRefs = useRef({})

  useEffect(() => {
    if (!activeComparison) return
    const settings = activeComparison.chart_settings || {}
    setConfig((current) => ({
      ...current,
      name: activeComparison.name,
      primaryMetric: activeComparison.primary_metric || settings.metrics?.[0] || current.primaryMetric,
      metrics: settings.metrics || current.metrics,
      xAxis: activeComparison.x_axis || settings.xAxis || settings.x_axis || current.xAxis,
      chartType: settings.chartType || settings.chart_type || current.chartType,
      smoothing: settings.smoothing ?? current.smoothing,
      aggregation: settings.aggregation || current.aggregation,
      metricDirection: settings.metricDirection || settings.metric_direction || current.metricDirection,
      showLegend: settings.showLegend ?? settings.show_legend ?? current.showLegend,
      showTooltip: settings.showTooltip ?? settings.show_tooltip ?? current.showTooltip,
      highlightBestRun: settings.highlightBestRun ?? settings.highlight_best_run ?? current.highlightBestRun,
    }))
  }, [activeComparison])

  useEffect(() => {
    if (!sharedMetrics.length) return
    setConfig((current) => {
      const metrics = current.metrics.filter((metric) => sharedMetrics.includes(metric))
      const nextMetrics = metrics.length ? metrics : defaultMetrics(sharedMetrics)
      const primaryMetric = sharedMetrics.includes(current.primaryMetric) ? current.primaryMetric : nextMetrics[0] || ''
      return { ...current, metrics: nextMetrics, primaryMetric }
    })
  }, [sharedMetrics])

  useEffect(() => {
    setMetricOrder((prev) => {
      const prevSet = new Set(prev)
      const nextMetrics = config.metrics
      const kept = prev.filter((metric) => nextMetrics.includes(metric))
      const added = nextMetrics.filter((metric) => !prevSet.has(metric))
      return [...kept, ...added]
    })
  }, [config.metrics])

  useEffect(() => {
    let cancelled = false
    async function loadComparison() {
      if (selectedRunIds.length < 2 || !config.metrics.length) {
        setComparison(null)
        return
      }
      setIsLoading(true)
      setError('')
      try {
        const response = await runComparisonsApi.compare(project.id, {
          run_ids: selectedRunIds,
          metrics: config.metrics,
          x_axis: config.xAxis,
          smoothing: Number(config.smoothing) || 0,
          aggregation: config.aggregation,
          metric_direction: config.metricDirection,
        })
        if (!cancelled) setComparison(response)
      } catch (err) {
        if (!cancelled) {
          setComparison(null)
          setError(err.message || 'Failed to compare selected runs.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadComparison()
    return () => {
      cancelled = true
    }
  }, [config.aggregation, config.metricDirection, config.metrics, config.smoothing, config.xAxis, project.id, selectedRunIds])

  const selectedMetricSet = new Set(config.metrics)
  const orderedMetrics = metricOrder.length
    ? metricOrder.filter((metric) => config.metrics.includes(metric))
    : config.metrics
  const visibleMetrics = orderedMetrics.filter((metric) => metric.toLowerCase().includes(query.toLowerCase()))
  const primaryMetric = config.primaryMetric || config.metrics[0] || ''
  const bestRunName = comparison?.summary?.best_run_name || 'n/a'
  const bestValue = comparison?.summary?.best_value

  function updateConfig(patch) {
    setConfig((current) => ({ ...current, ...patch }))
  }

  function toggleMetric(metric) {
    setConfig((current) => {
      const exists = current.metrics.includes(metric)
      const metrics = exists ? current.metrics.filter((item) => item !== metric) : [...current.metrics, metric]
      return { ...current, metrics, primaryMetric: metrics.includes(current.primaryMetric) ? current.primaryMetric : metrics[0] || '' }
    })
  }

  function reorderPanel(sourceMetric, targetMetric) {
    if (!sourceMetric || sourceMetric === targetMetric) return
    setMetricOrder((prev) => {
      const list = prev.length ? prev : [...config.metrics]
      const sourceIndex = list.indexOf(sourceMetric)
      const targetIndex = list.indexOf(targetMetric)
      if (sourceIndex < 0 || targetIndex < 0) return list
      const next = [...list]
      const [item] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, item)
      return next
    })
  }

  function resizePanel(metric, size) {
    setPanelSizes((prev) => ({ ...prev, [metric]: size }))
  }

  function toggleAxisLabel(metric, key, value) {
    setPanelAxisLabels((prev) => ({
      ...prev,
      [metric]: {
        ...(prev[metric] || {}),
        [key]: value,
      },
    }))
  }

  function chartReady(metric, chart) {
    if (chart) chartRefs.current[metric] = chart
    else delete chartRefs.current[metric]
  }

  function optionForMetric(metric) {
    const axisLabels = panelAxisLabels[metric] || {}
    const comparisonRuns = comparison?.runs || []
    const palette = runPaletteForRuns(comparisonRuns)
    const colorByRunId = new Map(comparisonRuns.map((run, index) => [run.id, palette[index]]))
    const series = buildMetricSeries(comparison, metric).map((item) => ({
      ...item,
      color: colorByRunId.get(item.runId),
    }))
    return buildChartOption({
      chartType: config.chartType,
      metric,
      yAxis: metric,
      xAxis: config.xAxis,
      title: metric,
      subtitle: `Showing ${series.length} of ${selectedRunIds.length} runs`,
      showTitle: false,
      xAxisLabel: metricLabel(config.xAxis),
      yAxisLabel: metric,
      showXAxisLabel: axisLabels.showXAxisLabel ?? false,
      showYAxisLabel: axisLabels.showYAxisLabel ?? false,
      showLegend: config.showLegend,
      showTooltip: config.showTooltip,
      smooth: Number(config.smoothing) > 0,
      lineWidth: 2,
      pointSize: config.chartType === 'scatter' ? 5 : 3,
      grid: { left: 56, right: 24, top: config.showLegend ? 42 : 18, bottom: 50 },
      palette,
      useExplicitX: true,
      highlightBestRun: config.highlightBestRun,
      bestRunId: comparison?.summary?.best_run_id,
    }, series)
  }

  async function saveComparison() {
    if (selectedRunIds.length < 2 || !config.metrics.length) return
    setIsSaving(true)
    setError('')
    try {
      await runComparisonsApi.create(project.id, {
        name: config.name.trim() || `${project.name} comparison`,
        run_ids: selectedRunIds,
        primary_metric: primaryMetric,
        x_axis: config.xAxis,
        chart_settings: config,
      })
      await onSaved?.()
    } catch (err) {
      setError(err.message || 'Failed to save comparison.')
    } finally {
      setIsSaving(false)
    }
  }

  async function exportMetric(metric, format) {
    const chart = chartRefs.current[metric]
    const option = optionForMetric(metric)
    if (!chart || !option) return
    await exportChart({
      chart,
      option,
      format,
      filename: `${config.name || project.name}-${metric}`,
    })
  }

  async function bulkExport(format) {
    if (!exportSelection.size) return
    setIsExporting(true)
    const metrics = [...exportSelection]
    try {
      for (const metric of metrics) {
        await exportMetric(metric, format)
      }
    } catch (err) {
      setError(err.message || `Failed to export ${format.toUpperCase()}.`)
    } finally {
      setIsExporting(false)
    }
  }

  function openExportModal() {
    setExportSelection(new Set(visibleMetrics))
    setIsExportOpen(true)
  }

  function exportJson() {
    saveTextFile(
      JSON.stringify({ config, selectedRunIds, comparison }, null, 2),
      `${config.name || project.name}-comparison.json`,
      'application/json',
    )
  }

  return {
    bestRunName,
    bestValue,
    config,
    error,
    exportSelection,
    isExporting,
    isExportOpen,
    isLoading,
    isMetricPickerOpen,
    isSaving,
    isSettingsOpen,
    panelAxisLabels,
    panelSizes,
    primaryMetric,
    query,
    selectedMetricSet,
    visibleMetrics,
    bulkExport,
    chartReady,
    exportJson,
    exportMetric,
    openExportModal,
    optionForMetric,
    reorderPanel,
    resizePanel,
    saveComparison,
    setExportSelection,
    setIsExportOpen,
    setIsMetricPickerOpen,
    setIsSettingsOpen,
    setQuery,
    toggleAxisLabel,
    toggleMetric,
    updateConfig,
  }
}
