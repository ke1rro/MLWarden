import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getMetricSummary, getMetrics } from '@/api/metrics.js'
import { listProjects } from '@/api/projects.js'
import { Button } from '@/components/common/Button.jsx'
import { MetricChart } from './MetricChart.jsx'
import { PanelCard } from './PanelCard.jsx'
import { buildChartOption, normalizeChartConfig, parseEchartsOverride } from './chartOptions.js'
import { exportChart } from './chartExport.js'
import { runColorForRun } from './runColors.js'

const defaultOverride = '{\n  "grid": { "left": 56, "right": 24 }\n}'

function defaultConfig(project, runs) {
  const runId = runs[0]?.id || ''
  const runColor = runColorForRun(runs[0])
  return normalizeChartConfig({
    name: '',
    chartType: 'line',
    runId,
    metric: '',
    yAxis: '',
    xAxis: 'step',
    title: '',
    subtitle: '',
    showXAxisLabel: false,
    showYAxisLabel: false,
    xAxisLabel: 'Step',
    yAxisLabel: 'Value',
    showLegend: false,
    showTooltip: true,
    color: runColor,
    fontSize: 12,
    lineWidth: 2,
    pointSize: 4,
    smooth: true,
    area: false,
    barWidth: 18,
    backgroundColor: '#ffffff',
    echartsOptionOverride: defaultOverride,
  })
}

function configForSavedChart(chart, fallback) {
  const normalized = normalizeChartConfig({
    ...chart.config,
    name: chart.name,
    chartType: chart.chart_type || chart.type,
  }, fallback)
  return {
    ...normalized,
    echartsOptionOverride: JSON.stringify(normalized.echartsOptionOverride || {}, null, 2),
  }
}

function Field({ label, children }) {
  return <label>{label}{children}</label>
}

export function ChartBuilder({
  project,
  runs,
  onSaveChart,
  onAddPanel,
  onDeleteChart,
  onProjectChange,
  initialConfig,
  initialMetricSeries,
  initialChart,
  mode = 'saved',
}) {
  const baseConfig = useMemo(() => defaultConfig(project, runs), [project, runs])
  const [config, setConfig] = useState(() => {
    if (initialChart) return configForSavedChart(initialChart, defaultConfig(project, runs))
    return normalizeChartConfig(initialConfig || defaultConfig(project, runs), defaultConfig(project, runs))
  })
  const [metricSeries, setMetricSeries] = useState(initialMetricSeries || {})
  const [allProjects, setAllProjects] = useState([])
  const [preview, setPreview] = useState({ config: null, option: null })
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const previewChartRef = useRef(null)

  const activeChartId = initialChart?.id

  // Load projects for the project switcher dropdown
  useEffect(() => {
    listProjects().then((res) => setAllProjects(res.items || [])).catch(() => {})
  }, [])

  const metricNames = useMemo(() => Object.keys(metricSeries), [metricSeries])
  const selectedMetric = config.metric || config.yAxis
  const selectedSeries = useMemo(() => metricSeries[selectedMetric] || [], [metricSeries, selectedMetric])

  const updateConfig = useCallback((patch) => {
    setConfig((current) => ({ ...current, ...patch }))
  }, [])

  useEffect(() => {
    if (!runs.length || config.runId) return
    updateConfig({ runId: runs[0].id, color: runColorForRun(runs[0]) })
  }, [config.runId, runs, updateConfig])

  useEffect(() => {
    if (!config.runId) {
      setMetricSeries({})
      return undefined
    }
    if (initialMetricSeries && runs[0]?.id === config.runId) {
      setMetricSeries(initialMetricSeries)
      return undefined
    }
    let cancelled = false
    async function loadRunMetrics() {
      setError('')
      try {
        const summary = await getMetricSummary(config.runId)
        const names = (summary.items || []).map((item) => item.name)
        const response = names.length ? await getMetrics(config.runId, names) : { series: {} }
        if (!cancelled) setMetricSeries(response.series || {})
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load metrics.')
      }
    }
    loadRunMetrics()
    return () => { cancelled = true }
  }, [config.runId, initialMetricSeries, runs])

  useEffect(() => {
    if (!metricNames.length || config.metric) return
    const metric = metricNames[0]
    updateConfig({
      metric,
      yAxis: metric,
      title: config.title || metric,
      yAxisLabel: config.yAxisLabel === 'Value' ? metric : config.yAxisLabel,
    })
  }, [config.metric, config.title, config.yAxisLabel, metricNames, updateConfig])

  const buildPreview = useCallback((showError = false) => {
    try {
      if (!config.runId) throw new Error('Choose a run before previewing the chart.')
      if (!selectedMetric) throw new Error('Choose a metric before previewing the chart.')
      if (!selectedSeries.length) throw new Error(`No metric series was found for "${selectedMetric}".`)

      const normalized = normalizeChartConfig({
        ...config,
        metric: selectedMetric,
        yAxis: config.yAxis || selectedMetric,
        title: config.title || selectedMetric,
        yAxisLabel: config.yAxisLabel || selectedMetric,
        echartsOptionOverride: parseEchartsOverride(config.echartsOptionOverride),
      }, baseConfig)
      const option = buildChartOption(normalized, selectedSeries)
      setPreview({ config: normalized, option })
      setError('')
      return { config: normalized, option }
    } catch (err) {
      setPreview({ config: null, option: null })
      if (showError) setError(err.message || 'Invalid chart configuration.')
      return null
    }
  }, [baseConfig, config, selectedMetric, selectedSeries])

  useEffect(() => {
    buildPreview(false)
  }, [buildPreview])

  async function handleSave() {
    const nextPreview = buildPreview(true)
    if (!nextPreview) return
    setIsSaving(true)
    try {
      const normalized = nextPreview.config
      if (mode === 'panel' || onAddPanel) {
        await onAddPanel?.(normalized)
        return
      }
      const body = {
        name: normalized.name.trim() || normalized.title || `${normalized.metric} ${normalized.chartType}`,
        chart_type: normalized.chartType,
        config: normalized,
      }
      await onSaveChart(body, activeChartId)
      if (!activeChartId) updateConfig({ name: '' })
    } catch (err) {
      setError(err.message || 'Failed to save chart.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleExport(format) {
    const nextPreview = preview.option ? preview : buildPreview(true)
    if (!nextPreview?.option || !previewChartRef.current) return
    const filename = nextPreview.config.name || nextPreview.config.title || nextPreview.config.metric || 'chart'
    try {
      await exportChart({
        chart: previewChartRef.current,
        option: nextPreview.option,
        format,
        filename,
        backgroundColor: nextPreview.config.backgroundColor,
      })
    } catch (err) {
      setError(err.message || `Failed to export ${format.toUpperCase()}.`)
    }
  }


  const saveLabel = mode === 'panel' || onAddPanel
    ? 'Add panel'
    : activeChartId ? 'Update chart' : 'Save chart'

  return (
    <div className="chart-builder chart-builder-vertical">
      <section className="builder-preview panel">
        <header className="section-header">
          <div>
            <h2>{project?.name || 'Run'} preview</h2>
            <p>x: {config.xAxis} · y: {selectedMetric || 'none'}</p>
          </div>
        </header>
        <PanelCard title="Preview">
          <MetricChart option={preview.option} onReady={(chart) => { previewChartRef.current = chart }} />
        </PanelCard>
      </section>

      <div className="builder-controls panel">
        <div className="builder-controls-row">

          <section className="builder-section builder-section-inline">
            <h3>Data</h3>
            <Field label="Name">
              <input value={config.name} onChange={(event) => updateConfig({ name: event.target.value })} placeholder={selectedMetric ? `${selectedMetric} ${config.chartType}` : 'Chart name'} />
            </Field>
            {allProjects.length > 0 ? (
              <Field label="Project">
                <select value={project?.id || ''} onChange={(e) => e.target.value && onProjectChange?.(e.target.value)}>
                  {!project ? <option value="" disabled>Choose project…</option> : null}
                  {allProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            ) : null}
            <Field label="Run">
              <select value={config.runId} onChange={(event) => {
                const nextRun = runs.find((run) => run.id === event.target.value)
                updateConfig({ runId: event.target.value, metric: '', yAxis: '', color: runColorForRun(nextRun) })
              }}>
                {runs.map((run) => <option key={run.id} value={run.id}>{run.name}</option>)}
              </select>
            </Field>
            <Field label="Y-Axis">
              <select value={selectedMetric} onChange={(event) => updateConfig({ metric: event.target.value, yAxis: event.target.value })}>
                <option value="">Choose metric</option>
                {metricNames.map((metric) => <option key={metric} value={metric}>{metric}</option>)}
              </select>
            </Field>
            <Field label="X-axis">
              <select value={config.xAxis} onChange={(event) => updateConfig({ xAxis: event.target.value })}>
                <option value="step">Step</option>
                <option value="timestamp">Timestamp</option>
              </select>
            </Field>
          </section>

          <section className="builder-section builder-section-inline">
            <h3>Chart</h3>
            <Field label="Chart type">
              <select value={config.chartType} onChange={(event) => updateConfig({ chartType: event.target.value, area: event.target.value === 'area' ? true : config.area })}>
                <option value="line">Line</option>
                <option value="scatter">Scatter</option>
                <option value="bar">Bar</option>
                <option value="area">Area</option>
              </select>
            </Field>
            <Field label="Title">
              <input value={config.title} onChange={(event) => updateConfig({ title: event.target.value })} />
            </Field>
            <Field label="Subtitle">
              <input value={config.subtitle} onChange={(event) => updateConfig({ subtitle: event.target.value })} />
            </Field>
            <Field label="X-axis label">
              <input value={config.xAxisLabel} onChange={(event) => updateConfig({ xAxisLabel: event.target.value })} />
            </Field>
            <Field label="Y-axis label">
              <input value={config.yAxisLabel} onChange={(event) => updateConfig({ yAxisLabel: event.target.value })} />
            </Field>
            <div className="toggle-grid">
              <label>
                <input checked={config.showXAxisLabel} onChange={(event) => updateConfig({ showXAxisLabel: event.target.checked })} type="checkbox" />
                X label
              </label>
              <label>
                <input checked={config.showYAxisLabel} onChange={(event) => updateConfig({ showYAxisLabel: event.target.checked })} type="checkbox" />
                Y label
              </label>
              <label>
                <input checked={config.showLegend} onChange={(event) => updateConfig({ showLegend: event.target.checked })} type="checkbox" />
                Legend
              </label>
              <label>
                <input checked={config.showTooltip} onChange={(event) => updateConfig({ showTooltip: event.target.checked })} type="checkbox" />
                Tooltip
              </label>
            </div>
          </section>

          <section className="builder-section builder-section-inline">
            <h3>Style</h3>
            <div className="builder-field-row">
              <Field label="Color">
                <input value={config.color} onChange={(event) => updateConfig({ color: event.target.value })} type="color" />
              </Field>
              <Field label="Background">
                <input value={config.backgroundColor} onChange={(event) => updateConfig({ backgroundColor: event.target.value })} type="color" />
              </Field>
            </div>
            <div className="builder-field-row">
              <Field label="Font size">
                <input min="9" max="24" value={config.fontSize} onChange={(event) => updateConfig({ fontSize: event.target.value })} type="number" />
              </Field>
              <Field label="Line width">
                <input min="1" max="10" value={config.lineWidth} onChange={(event) => updateConfig({ lineWidth: event.target.value })} type="number" />
              </Field>
            </div>
            <div className="builder-field-row">
              <Field label="Point size">
                <input min="1" max="20" value={config.pointSize} onChange={(event) => updateConfig({ pointSize: event.target.value })} type="number" />
              </Field>
              <Field label="Bar width">
                <input min="4" max="80" value={config.barWidth} onChange={(event) => updateConfig({ barWidth: event.target.value })} type="number" />
              </Field>
            </div>
            <div className="toggle-grid">
              <label>
                <input checked={config.smooth} onChange={(event) => updateConfig({ smooth: event.target.checked })} type="checkbox" />
                Smooth
              </label>
              <label>
                <input checked={config.area} onChange={(event) => updateConfig({ area: event.target.checked })} type="checkbox" />
                Area
              </label>
            </div>
          </section>

          <section className="builder-section builder-section-inline">
            <h3>Advanced</h3>
            <div className="grid-inputs">
              {['left', 'right', 'top', 'bottom'].map((side) => (
                <Field key={side} label={side}>
                  <input
                    min="0"
                    value={config.grid[side]}
                    onChange={(event) => updateConfig({ grid: { ...config.grid, [side]: event.target.value } })}
                    type="number"
                  />
                </Field>
              ))}
            </div>
            <Field label="ECharts JSON override">
              <textarea value={config.echartsOptionOverride} onChange={(event) => updateConfig({ echartsOptionOverride: event.target.value })} rows={4} />
            </Field>
          </section>

        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="builder-actions-row">
          <div className="button-row">
            <Button disabled={!preview.option} onClick={() => handleExport('png')} variant="secondary">Export PNG</Button>
            <Button disabled={!preview.option} onClick={() => handleExport('svg')} variant="secondary">Export SVG</Button>
            <Button disabled={isSaving || (!onSaveChart && !onAddPanel)} onClick={handleSave}>{isSaving ? 'Saving...' : saveLabel}</Button>
            {activeChartId && onDeleteChart ? (
              <Button
                disabled={isDeleting}
                onClick={async () => {
                  if (!window.confirm('Delete this saved chart? This cannot be undone.')) return
                  setIsDeleting(true)
                  try {
                    await onDeleteChart(activeChartId)
                  } catch (err) {
                    setError(err.message || 'Failed to delete chart.')
                  } finally {
                    setIsDeleting(false)
                  }
                }}
                variant="secondary"
              >
                {isDeleting ? 'Deleting...' : 'Delete chart'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
