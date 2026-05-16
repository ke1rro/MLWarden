import { useEffect, useRef, useState } from 'react'
import { createChart } from '@/api/charts.js'
import { compareRuns, createRunComparison } from '@/api/runComparisons.js'
import { Button } from '@/components/common/Button.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { MetricChart } from '@/components/charts/MetricChart.jsx'
import { buildChartOption } from '@/components/charts/chartOptions.js'
import { exportChart } from '@/components/charts/chartExport.js'
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

export function RunComparisonWorkspace({
  project,
  selectedRunIds,
  sharedMetrics,
  savedComparisons = [],
  activeComparison,
  onSaved,
  onApplyComparison,
  onReset,
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
  const primaryChartRef = useRef(null)

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
    let cancelled = false
    async function loadComparison() {
      if (selectedRunIds.length < 2 || !config.metrics.length) {
        setComparison(null)
        return
      }
      setIsLoading(true)
      setError('')
      try {
        const response = await compareRuns(project.id, {
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

  function optionForMetric(metric) {
    const series = buildMetricSeries(comparison, metric)
    return buildChartOption({
      chartType: config.chartType,
      metric,
      yAxis: metric,
      xAxis: config.xAxis,
      title: metric,
      subtitle: `Showing ${series.length} of ${selectedRunIds.length} runs`,
      xAxisLabel: metricLabel(config.xAxis),
      yAxisLabel: metric,
      showLegend: config.showLegend,
      showTooltip: config.showTooltip,
      smooth: Number(config.smoothing) > 0,
      lineWidth: 2,
      pointSize: config.chartType === 'scatter' ? 5 : 3,
      grid: { left: 56, right: 24, top: 92, bottom: 50 },
      palette: (comparison?.runs || []).map((run) => run.color),
      useExplicitX: true,
      highlightBestRun: config.highlightBestRun,
      bestRunId: comparison?.summary?.best_run_id,
    }, series)
  }

  async function handleSaveComparison() {
    if (selectedRunIds.length < 2 || !config.metrics.length) return
    setIsSaving(true)
    setError('')
    try {
      await createRunComparison(project.id, {
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

  async function handleCreateReport() {
    if (!config.metrics.length) return
    setError('')
    try {
      await createChart(project.id, {
        name: config.name.trim() || `${project.name} comparison`,
        chart_type: 'comparison',
        config: {
          ...config,
          runIds: selectedRunIds,
          primaryMetric,
          source: 'run-comparison',
        },
      })
      await onSaved?.()
    } catch (err) {
      setError(err.message || 'Failed to create report.')
    }
  }

  async function handleExport(format) {
    const option = optionForMetric(primaryMetric)
    if (!primaryChartRef.current || !option) return
    try {
      await exportChart({
        chart: primaryChartRef.current,
        option,
        format,
        filename: `${config.name || project.name}-${primaryMetric}`,
      })
    } catch (err) {
      setError(err.message || `Failed to export ${format.toUpperCase()}.`)
    }
  }

  function handleExportJson() {
    saveTextFile(
      JSON.stringify({ config, selectedRunIds, comparison }, null, 2),
      `${config.name || project.name}-comparison.json`,
      'application/json',
    )
  }

  if (selectedRunIds.length < 2) {
    return <EmptyState title="Select at least two runs to create a comparison." message="Use the run selector to build a combined view." />
  }

  return (
    <section className="run-comparison-workspace">
      <header className="combined-run-header panel">
        <div>
          <h2>Combined Runs: {selectedRunIds.length} selected</h2>
          <p>Primary metric: {primaryMetric || 'none'} · Best run: {bestRunName}{bestValue === null || bestValue === undefined ? '' : ` (${Number(bestValue).toPrecision(5)})`}</p>
        </div>
        <div className="button-row">
          <Button disabled={isSaving || !config.metrics.length} onClick={handleSaveComparison}>{isSaving ? 'Saving...' : 'Save comparison'}</Button>
          <Button onClick={() => handleExport('png')} variant="secondary">Export PNG</Button>
          <Button onClick={() => handleExport('svg')} variant="secondary">Export SVG</Button>
          <Button onClick={handleExportJson} variant="secondary">Export JSON</Button>
          <Button onClick={handleCreateReport} variant="secondary">Create report</Button>
          <Button onClick={onReset} variant="secondary">Reset selection</Button>
        </div>
      </header>

      <div className="comparison-toolbar panel">
        <label>
          Rename comparison
          <input value={config.name} onChange={(event) => updateConfig({ name: event.target.value })} />
        </label>
        <label>
          Primary metric
          <select value={primaryMetric} onChange={(event) => updateConfig({ primaryMetric: event.target.value, metrics: [event.target.value, ...config.metrics.filter((metric) => metric !== event.target.value)] })}>
            {sharedMetrics.map((metric) => <option key={metric} value={metric}>{metric}</option>)}
          </select>
        </label>
        <label>
          X-axis
          <select value={config.xAxis} onChange={(event) => updateConfig({ xAxis: event.target.value })}>
            <option value="step">step</option>
            <option value="epoch">epoch</option>
            <option value="timestamp">timestamp</option>
          </select>
        </label>
        <label>
          Chart type
          <select value={config.chartType} onChange={(event) => updateConfig({ chartType: event.target.value })}>
            <option value="line">line</option>
            <option value="scatter">scatter</option>
            <option value="bar">bar</option>
          </select>
        </label>
        <label>
          Aggregation
          <select value={config.aggregation} onChange={(event) => updateConfig({ aggregation: event.target.value })}>
            <option value="none">none</option>
            <option value="mean">mean</option>
            <option value="median">median</option>
            <option value="min">min</option>
            <option value="max">max</option>
          </select>
        </label>
        <label>
          Smoothing
          <input max="0.95" min="0" onChange={(event) => updateConfig({ smoothing: event.target.value })} step="0.05" type="number" value={config.smoothing} />
        </label>
        <label>
          Best value
          <select value={config.metricDirection} onChange={(event) => updateConfig({ metricDirection: event.target.value })}>
            <option value="auto">auto</option>
            <option value="maximize">maximize</option>
            <option value="minimize">minimize</option>
          </select>
        </label>
        <label className="toggle-control"><input checked={config.showLegend} onChange={(event) => updateConfig({ showLegend: event.target.checked })} type="checkbox" /> Legend</label>
        <label className="toggle-control"><input checked={config.showTooltip} onChange={(event) => updateConfig({ showTooltip: event.target.checked })} type="checkbox" /> Tooltip</label>
        <label className="toggle-control"><input checked={config.highlightBestRun} onChange={(event) => updateConfig({ highlightBestRun: event.target.checked })} type="checkbox" /> Highlight best</label>
      </div>

      <div className="comparison-metric-picker panel">
        <strong>Charts {config.metrics.length}</strong>
        <div>
          {sharedMetrics.map((metric) => (
            <label className="toggle-control" key={metric}>
              <input checked={selectedMetricSet.has(metric)} onChange={() => toggleMetric(metric)} type="checkbox" />
              {metric}
            </label>
          ))}
        </div>
      </div>

      {savedComparisons.length ? (
        <div className="saved-comparisons panel">
          <strong>Saved comparisons</strong>
          {savedComparisons.map((comparisonItem) => (
            <button key={comparisonItem.id} onClick={() => onApplyComparison?.(comparisonItem)} type="button">{comparisonItem.name}</button>
          ))}
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p className="muted-copy">Loading comparison...</p> : null}
      {!sharedMetrics.length ? <EmptyState title="Selected runs have no shared metrics." message="Choose runs that logged at least one metric with the same name." /> : null}

      <div className="chart-grid comparison-chart-grid">
        {config.metrics.map((metric) => (
          <article className="comparison-chart-card" key={metric}>
            <MetricChart option={optionForMetric(metric)} onReady={metric === primaryMetric ? (chart) => { primaryChartRef.current = chart } : undefined} />
          </article>
        ))}
      </div>
    </section>
  )
}
