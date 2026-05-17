import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/common/Button.jsx'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { MetricChart } from './MetricChart.jsx'
import { PanelCard } from './PanelCard.jsx'
import { buildChartOption, normalizeChartConfig, parseChartFilters, parseEchartsOverride } from './chartOptions.js'
import { exportChart } from './chartExport.js'
import { runColorForRun } from './runColors.js'

const defaultOverride = '{\n}'
const sourceOptions = [{ value: 'metrics', label: 'Run metrics' }]
const templateOptions = [
  { value: 'custom', label: 'Custom empty chart' },
  { value: 'training-loss', label: 'Training loss over steps' },
  { value: 'accuracy', label: 'Accuracy over steps' },
  { value: 'run-comparison', label: 'Metric comparison between runs' },
  { value: 'latest-bar', label: 'Bar chart for latest metric values' },
  { value: 'scatter-two-metrics', label: 'Scatter plot for two metrics' },
  { value: 'system-metrics', label: 'System metrics chart' },
]
const timeAxisValues = new Set(['step', 'timestamp'])

function axisLabelFor(axis) {
  if (axis === 'timestamp') return 'Time'
  if (axis === 'step') return 'Step'
  return axis || 'Value'
}

function firstMetric(metricNames, candidates, fallback = '') {
  const lowerNames = metricNames.map((metric) => [metric.toLowerCase(), metric])
  for (const candidate of candidates) {
    const exact = lowerNames.find(([name]) => name === candidate)
    if (exact) return exact[1]
    const partial = lowerNames.find(([name]) => name.includes(candidate))
    if (partial) return partial[1]
  }
  return fallback || metricNames[0] || ''
}

function jsonForEditor(value, fallback = '') {
  if (!value) return fallback
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

function defaultConfig(project, runs) {
  const runId = runs[0]?.id || ''
  const runColor = runColorForRun(runs[0])
  return normalizeChartConfig({
    name: '',
    chartType: 'line',
    source: 'metrics',
    runId,
    metric: '',
    yAxis: '',
    xAxis: 'step',
    groupBy: '',
    filters: '',
    title: '',
    subtitle: '',
    showXAxisLabel: true,
    showYAxisLabel: true,
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

function configForEditor(input, fallback) {
  const normalized = normalizeChartConfig(input, fallback)
  return {
    ...normalized,
    filters: jsonForEditor(normalized.filters),
    echartsOptionOverride: jsonForEditor(normalized.echartsOptionOverride, defaultOverride),
  }
}

function configForSavedChart(chart, fallback) {
  return configForEditor({
    ...chart.config,
    name: chart.name,
    chartType: chart.chart_type || chart.type,
  }, fallback)
}

function templatePatch(templateId, current, metricNames) {
  const selectedMetric = current.metric || current.yAxis
  if (templateId === 'custom') {
    return {
      name: '',
      chartType: 'line',
      metric: '',
      yAxis: '',
      xAxis: 'step',
      groupBy: '',
      filters: '',
      title: '',
      subtitle: '',
      xAxisLabel: 'Step',
      yAxisLabel: 'Value',
      showLegend: false,
      showTooltip: true,
      smooth: true,
      area: false,
      echartsOptionOverride: defaultOverride,
    }
  }

  if (templateId === 'training-loss') {
    const metric = firstMetric(metricNames, ['train.loss', 'training.loss', 'loss'], selectedMetric)
    return {
      chartType: 'area',
      metric,
      yAxis: metric,
      xAxis: 'step',
      title: 'Training loss over steps',
      subtitle: '',
      xAxisLabel: 'Step',
      yAxisLabel: 'Loss',
      showLegend: false,
      smooth: true,
      area: true,
      color: '#dc2626',
    }
  }

  if (templateId === 'accuracy') {
    const metric = firstMetric(metricNames, ['val.accuracy', 'accuracy', 'acc'], selectedMetric)
    return {
      chartType: 'line',
      metric,
      yAxis: metric,
      xAxis: 'step',
      title: 'Accuracy over steps',
      subtitle: '',
      xAxisLabel: 'Step',
      yAxisLabel: 'Accuracy',
      showLegend: false,
      smooth: true,
      area: false,
      color: '#16a34a',
    }
  }

  if (templateId === 'run-comparison') {
    const metric = selectedMetric || metricNames[0] || ''
    return {
      chartType: 'line',
      metric,
      yAxis: metric,
      xAxis: 'step',
      groupBy: 'runId',
      title: 'Metric comparison between runs',
      subtitle: '',
      xAxisLabel: 'Step',
      yAxisLabel: metric || 'Value',
      showLegend: true,
      smooth: true,
      area: false,
    }
  }

  if (templateId === 'latest-bar') {
    const metric = selectedMetric || metricNames[0] || ''
    return {
      chartType: 'bar',
      metric,
      yAxis: metric,
      xAxis: 'step',
      title: 'Latest metric values',
      subtitle: '',
      xAxisLabel: 'Step',
      yAxisLabel: metric || 'Value',
      showLegend: false,
      smooth: false,
      area: false,
      barWidth: 28,
      color: '#7c3aed',
    }
  }

  if (templateId === 'scatter-two-metrics') {
    const yMetric = selectedMetric || metricNames[1] || metricNames[0] || ''
    const xMetric = metricNames.find((metric) => metric !== yMetric) || 'step'
    return {
      chartType: 'scatter',
      metric: yMetric,
      yAxis: yMetric,
      xAxis: xMetric,
      title: 'Scatter plot for two metrics',
      subtitle: '',
      xAxisLabel: axisLabelFor(xMetric),
      yAxisLabel: yMetric || 'Value',
      showLegend: false,
      smooth: false,
      area: false,
      pointSize: 7,
      color: '#0891b2',
    }
  }

  if (templateId === 'system-metrics') {
    const metric = firstMetric(metricNames, ['gpu-usage', 'cpu-usage', 'memory', 'disk'], selectedMetric)
    return {
      chartType: 'area',
      metric,
      yAxis: metric,
      xAxis: 'timestamp',
      title: 'System metrics chart',
      subtitle: 'Host telemetry',
      xAxisLabel: 'Time',
      yAxisLabel: metric || 'Value',
      showLegend: false,
      smooth: true,
      area: true,
      color: '#0f766e',
    }
  }

  return {}
}

function pointKey(point, index) {
  return point?.step ?? point?.timestamp ?? index
}

function seriesForMetricAxis(metricSeries, yMetric, xMetric) {
  const ySeries = metricSeries[yMetric] || []
  if (!xMetric || timeAxisValues.has(xMetric) || xMetric === yMetric || !metricSeries[xMetric]) return ySeries

  const xSeries = metricSeries[xMetric] || []
  const xByKey = new Map(xSeries.map((point, index) => [pointKey(point, index), point.value]))
  return ySeries
    .map((point, index) => {
      const xValue = xByKey.get(pointKey(point, index)) ?? xSeries[index]?.value
      if (xValue === undefined || xValue === null) return null
      return {
        ...point,
        [xMetric]: xValue,
        context: {
          ...(point.context || {}),
          [xMetric]: xValue,
        },
      }
    })
    .filter(Boolean)
}

function Field({ label, children }) {
  return <label>{label}{children}</label>
}

function ChartBuilderShell({ children }) {
  return <div className="chart-builder chart-builder-vertical">{children}</div>
}

function ChartPreviewPanel({ chartPlaceholder, config, onChartReady, preview, project, selectedMetric }) {
  const title = !project
    ? 'Select a project'
    : !config.runId
      ? 'Choose a run'
      : !selectedMetric
        ? 'Choose a metric'
        : `${project.name} · preview`

  return (
    <section className="builder-preview panel">
      <header className="section-header">
        <div>
          <h2>{title}</h2>
          <p>x: {config.xAxis} · y: {selectedMetric || 'none'}</p>
        </div>
      </header>
      <PanelCard title="Preview">
        <MetricChart option={preview.option} onReady={onChartReady} placeholder={chartPlaceholder} />
      </PanelCard>
    </section>
  )
}

function ChartBuilderControls({ children, deleteConfirm, error, footer }) {
  return (
    <div className="builder-controls panel">
      <div className="builder-controls-row">
        {children}
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {footer}
      {deleteConfirm}
    </div>
  )
}

function ChartDataControls({
  allProjects,
  config,
  metricNames,
  onChange,
  onProjectChange,
  project,
  runs,
  selectedMetric,
}) {
  const handleMetricChange = (metric) => {
    const currentMetric = config.metric || config.yAxis
    onChange({
      metric,
      yAxis: metric,
      title: !config.title || config.title === currentMetric ? metric : config.title,
      yAxisLabel: !config.yAxisLabel || config.yAxisLabel === currentMetric || config.yAxisLabel === 'Value' ? metric : config.yAxisLabel,
    })
  }
  const handleXAxisChange = (xAxis) => {
    onChange({
      xAxis,
      xAxisLabel: config.xAxisLabel === axisLabelFor(config.xAxis) ? axisLabelFor(xAxis) : config.xAxisLabel,
    })
  }

  return (
    <section className="builder-section builder-section-inline">
      <h3>Data</h3>
      <Field label="Name">
        <input value={config.name} onChange={(event) => onChange({ name: event.target.value })} placeholder={selectedMetric ? `${selectedMetric} ${config.chartType}` : 'Chart name'} />
      </Field>
      <Field label="Source">
        <select value={config.source} onChange={(event) => onChange({ source: event.target.value })}>
          {sourceOptions.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
        </select>
      </Field>
      {allProjects.length > 0 ? (
        <Field label="Project">
          <select value={project?.id || ''} onChange={(event) => event.target.value && onProjectChange?.(event.target.value)}>
            {!project ? <option value="" disabled>Choose project…</option> : null}
            {allProjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
      ) : null}
      <Field label="Run">
        <select value={config.runId} onChange={(event) => {
          const nextRun = runs.find((run) => run.id === event.target.value)
          onChange({ runId: event.target.value, metric: '', yAxis: '', color: runColorForRun(nextRun) })
        }}>
          <option value="">Choose run</option>
          {runs.map((run) => <option key={run.id} value={run.id}>{run.name}</option>)}
        </select>
      </Field>
      <Field label="Metric / Y-axis">
        <select value={selectedMetric} onChange={(event) => handleMetricChange(event.target.value)}>
          <option value="">Choose metric</option>
          {metricNames.map((metric) => <option key={metric} value={metric}>{metric}</option>)}
        </select>
      </Field>
      <Field label="X-axis">
        <select value={config.xAxis} onChange={(event) => handleXAxisChange(event.target.value)}>
          <option value="step">Step</option>
          <option value="timestamp">Timestamp</option>
          {metricNames.filter((metric) => metric !== selectedMetric).length ? (
            <optgroup label="Metrics">
              {metricNames
                .filter((metric) => metric !== selectedMetric)
                .map((metric) => <option key={metric} value={metric}>{metric}</option>)}
            </optgroup>
          ) : null}
        </select>
      </Field>
      <Field label="Group by">
        <input value={config.groupBy} onChange={(event) => onChange({ groupBy: event.target.value })} placeholder="context key" />
      </Field>
      <Field label="Filters JSON">
        <textarea value={config.filters} onChange={(event) => onChange({ filters: event.target.value })} rows={3} />
      </Field>
    </section>
  )
}

function ChartDisplayControls({ config, onChange, onTemplateChange, selectedTemplate }) {
  return (
    <section className="builder-section builder-section-inline">
      <h3>Chart</h3>
      <Field label="Template">
        <select value={selectedTemplate} onChange={(event) => onTemplateChange(event.target.value)}>
          {templateOptions.map((template) => <option key={template.value} value={template.value}>{template.label}</option>)}
        </select>
      </Field>
      <Field label="Chart type">
        <select value={config.chartType} onChange={(event) => onChange({ chartType: event.target.value, area: event.target.value === 'area' })}>
          <option value="line">Line</option>
          <option value="scatter">Scatter</option>
          <option value="bar">Bar</option>
          <option value="area">Area</option>
        </select>
      </Field>
      <Field label="Title">
        <input value={config.title} onChange={(event) => onChange({ title: event.target.value })} />
      </Field>
      <Field label="Subtitle">
        <input value={config.subtitle} onChange={(event) => onChange({ subtitle: event.target.value })} />
      </Field>
      <Field label="X-axis label">
        <input value={config.xAxisLabel} onChange={(event) => onChange({ xAxisLabel: event.target.value })} />
      </Field>
      <Field label="Y-axis label">
        <input value={config.yAxisLabel} onChange={(event) => onChange({ yAxisLabel: event.target.value })} />
      </Field>
      <div className="toggle-grid">
        <label>
          <input checked={config.showLegend} onChange={(event) => onChange({ showLegend: event.target.checked })} type="checkbox" />
          Legend
        </label>
        <label>
          <input checked={config.showTooltip} onChange={(event) => onChange({ showTooltip: event.target.checked })} type="checkbox" />
          Tooltip
        </label>
      </div>
    </section>
  )
}

function ChartStyleControls({ config, onChange }) {
  const isLineLike = config.chartType === 'line' || config.chartType === 'area'
  const supportsPointSize = config.chartType === 'line' || config.chartType === 'area' || config.chartType === 'scatter'

  return (
    <section className="builder-section builder-section-inline">
      <h3>Style</h3>
      <div className="builder-field-row">
        <Field label="Color">
          <input value={config.color} onChange={(event) => onChange({ color: event.target.value })} type="color" />
        </Field>
        <Field label="Background">
          <input value={config.backgroundColor} onChange={(event) => onChange({ backgroundColor: event.target.value })} type="color" />
        </Field>
      </div>
      <div className="builder-field-row">
        <Field label="Font size">
          <input min="9" max="24" value={config.fontSize} onChange={(event) => onChange({ fontSize: event.target.value })} type="number" />
        </Field>
        {isLineLike ? (
          <Field label="Line width">
            <input min="1" max="10" value={config.lineWidth} onChange={(event) => onChange({ lineWidth: event.target.value })} type="number" />
          </Field>
        ) : null}
      </div>
      {supportsPointSize || config.chartType === 'bar' ? (
        <div className="builder-field-row">
          {supportsPointSize ? (
            <Field label="Point size">
              <input min="1" max="20" value={config.pointSize} onChange={(event) => onChange({ pointSize: event.target.value })} type="number" />
            </Field>
          ) : null}
          {config.chartType === 'bar' ? (
            <Field label="Bar width">
              <input min="4" max="80" value={config.barWidth} onChange={(event) => onChange({ barWidth: event.target.value })} type="number" />
            </Field>
          ) : null}
        </div>
      ) : null}
      {isLineLike ? (
        <div className="toggle-grid">
          <label>
            <input checked={config.smooth} onChange={(event) => onChange({ smooth: event.target.checked })} type="checkbox" />
            Smooth line
          </label>
          <label>
            <input checked={config.area} onChange={(event) => onChange({ area: event.target.checked })} type="checkbox" />
            Area fill
          </label>
        </div>
      ) : null}
    </section>
  )
}

function ChartAdvancedControls({ config, onChange }) {
  return (
    <section className="builder-section builder-section-inline">
      <h3>Advanced</h3>
      <div className="grid-inputs">
        {['left', 'right', 'top', 'bottom'].map((side) => (
          <Field key={side} label={side}>
            <input
              min="0"
              value={config.grid[side]}
              onChange={(event) => onChange({ grid: { ...config.grid, [side]: event.target.value } })}
              type="number"
            />
          </Field>
        ))}
      </div>
      <Field label="ECharts JSON override">
        <textarea value={config.echartsOptionOverride} onChange={(event) => onChange({ echartsOptionOverride: event.target.value })} rows={4} />
      </Field>
    </section>
  )
}

function ChartBuilderActions({ activeChartId, canExport, canSave, isSaving, onDelete, onExport, onPreview, onSave, saveLabel }) {
  return (
    <div className="builder-actions-row">
      <div className="button-row">
        <Button onClick={onPreview} variant="secondary">Preview</Button>
        <Button disabled={!canExport} onClick={() => onExport('png')} variant="secondary">Export PNG</Button>
        <Button disabled={!canExport} onClick={() => onExport('svg')} variant="secondary">Export SVG</Button>
        <Button disabled={isSaving || !canSave || !onSave} onClick={onSave}>{isSaving ? 'Saving...' : saveLabel}</Button>
        {activeChartId && onDelete ? (
          <Button onClick={onDelete} variant="secondary">Delete chart</Button>
        ) : null}
      </div>
    </div>
  )
}

function DeleteChartConfirm({ config, isDeleting, onCancel, onConfirm }) {
  return (
    <ConfirmDialog
      title={`Delete "${config.name || config.title || 'this chart'}"?`}
      message="This will permanently remove the saved chart configuration. This action cannot be undone."
      confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
      cancelLabel="Cancel"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}

export function ChartBuilder({
  project,
  runs,
  availableProjects = [],
  loadMetricSeries,
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
    if (initialChart) return configForSavedChart(initialChart, baseConfig)
    return configForEditor(initialConfig || baseConfig, baseConfig)
  })
  const [selectedTemplate, setSelectedTemplate] = useState('custom')
  const [metricSeries, setMetricSeries] = useState(initialMetricSeries || {})
  const [preview, setPreview] = useState({ config: null, option: null })
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const projectKey = project?.id || ''
  const initialChartId = initialChart?.id || ''
  const sourceKey = `${projectKey}:${initialChartId}`
  const [loadedSourceKey, setLoadedSourceKey] = useState(sourceKey)
  const previewChartRef = useRef(null)

  const activeChartId = initialChartId || null

  useEffect(() => {
    if (sourceKey === loadedSourceKey) return
    setLoadedSourceKey(sourceKey)
    setSelectedTemplate('custom')
    setPreview({ config: null, option: null })
    if (initialChart) {
      setConfig(configForSavedChart(initialChart, baseConfig))
    } else {
      setConfig(configForEditor(initialConfig || baseConfig, baseConfig))
    }
  }, [baseConfig, initialChart, initialConfig, loadedSourceKey, sourceKey])

  const metricNames = useMemo(() => Object.keys(metricSeries), [metricSeries])
  const selectedMetric = config.metric || config.yAxis
  const selectedRun = useMemo(() => runs.find((run) => run.id === config.runId), [config.runId, runs])
  const selectedSeries = useMemo(
    () => seriesForMetricAxis(metricSeries, selectedMetric, config.xAxis),
    [config.xAxis, metricSeries, selectedMetric],
  )
  const previewSeries = useMemo(() => {
    if (!selectedSeries.length) return []
    return [{
      name: selectedRun?.name || selectedMetric || 'Metric',
      runId: config.runId,
      color: config.color,
      data: selectedSeries,
    }]
  }, [config.color, config.runId, selectedMetric, selectedRun, selectedSeries])

  const updateConfig = useCallback((patch) => {
    setConfig((current) => ({ ...current, ...patch }))
  }, [])

  const handleTemplateChange = useCallback((templateId) => {
    setSelectedTemplate(templateId)
    updateConfig(templatePatch(templateId, config, metricNames))
  }, [config, metricNames, updateConfig])

  useEffect(() => {
    if (!runs.length || config.runId) return
    updateConfig({ runId: runs[0].id, color: runColorForRun(runs[0]) })
  }, [config.runId, runs, updateConfig])

  useEffect(() => {
    if (!config.runId) {
      setMetricSeries({})
      setIsLoadingMetrics(false)
      return undefined
    }
    if (initialMetricSeries && runs[0]?.id === config.runId) {
      setMetricSeries(initialMetricSeries)
      setIsLoadingMetrics(false)
      return undefined
    }
    let cancelled = false
    async function loadRunMetrics() {
      if (!loadMetricSeries) {
        setMetricSeries({})
        setIsLoadingMetrics(false)
        return
      }
      setIsLoadingMetrics(true)
      setError('')
      try {
        const nextMetricSeries = await loadMetricSeries(config.runId)
        if (!cancelled) setMetricSeries(nextMetricSeries || {})
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load metrics.')
      } finally {
        if (!cancelled) setIsLoadingMetrics(false)
      }
    }
    loadRunMetrics()
    return () => { cancelled = true }
  }, [config.runId, initialMetricSeries, loadMetricSeries, runs])

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

  const chartPlaceholder = useMemo(() => {
    if (!project && !config.runId) return 'Select a project to get started.'
    if (!config.runId) return 'Choose a run to preview the chart.'
    if (isLoadingMetrics) return 'Loading metrics…'
    if (!selectedMetric) return 'Choose a metric for the Y-axis.'
    if (!selectedSeries.length) return `No data found for metric "${selectedMetric}".`
    return ''
  }, [config.runId, isLoadingMetrics, project, selectedMetric, selectedSeries])

  const buildPreview = useCallback((showError = false) => {
    try {
      if (config.source !== 'metrics') throw new Error('Choose the run metrics source.')
      if (!config.runId) throw new Error('Choose a run before previewing.')
      if (runs.length && !runs.some((run) => run.id === config.runId)) throw new Error('The selected run is not available.')
      if (isLoadingMetrics) throw new Error('Metrics are still loading.')
      if (!selectedMetric) throw new Error('Choose a metric before previewing.')
      if (!metricSeries[selectedMetric]) throw new Error(`Metric "${selectedMetric}" was not found for this run.`)
      if (!previewSeries.length) throw new Error(`No data found for metric "${selectedMetric}".`)
      const filters = parseChartFilters(config.filters)
      const echartsOptionOverride = parseEchartsOverride(config.echartsOptionOverride)
      const normalized = normalizeChartConfig({
        ...config,
        metric: selectedMetric,
        yAxis: config.yAxis || selectedMetric,
        showXAxisLabel: Boolean(config.xAxisLabel),
        showYAxisLabel: Boolean(config.yAxisLabel),
        filters,
        echartsOptionOverride,
        useExplicitX: config.chartType === 'scatter' || !timeAxisValues.has(config.xAxis),
      }, baseConfig)
      const option = buildChartOption(normalized, previewSeries)
      setPreview({ config: normalized, option })
      setError('')
      return { config: normalized, option }
    } catch (err) {
      setPreview({ config: null, option: null })
      if (showError) setError(err.message || 'Invalid chart configuration.')
      return null
    }
  }, [baseConfig, config, isLoadingMetrics, metricSeries, previewSeries, runs, selectedMetric])

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
    const nextPreview = buildPreview(true)
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

  function handlePreview() {
    buildPreview(true)
  }

  async function handleConfirmDelete() {
    setIsDeleting(true)
    try {
      await onDeleteChart(activeChartId)
    } catch (err) {
      setError(err.message || 'Failed to delete chart.')
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const saveLabel = mode === 'panel' || onAddPanel
    ? 'Add panel'
    : activeChartId ? 'Update chart' : 'Save chart'

  return (
    <ChartBuilderShell>
      <ChartPreviewPanel
        chartPlaceholder={chartPlaceholder}
        config={config}
        onChartReady={(chart) => { previewChartRef.current = chart }}
        preview={preview}
        project={project}
        selectedMetric={selectedMetric}
      />
      <ChartBuilderControls
        error={error}
        footer={(
          <ChartBuilderActions
            activeChartId={activeChartId}
            canExport={Boolean(preview.option)}
            canSave={Boolean(preview.option)}
            isSaving={isSaving}
            onDelete={activeChartId && onDeleteChart ? () => setShowDeleteConfirm(true) : null}
            onExport={handleExport}
            onPreview={handlePreview}
            onSave={onSaveChart || onAddPanel ? handleSave : null}
            saveLabel={saveLabel}
          />
        )}
        deleteConfirm={showDeleteConfirm ? (
          <DeleteChartConfirm
            config={config}
            isDeleting={isDeleting}
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={handleConfirmDelete}
          />
        ) : null}
      >
        <ChartDataControls
          allProjects={availableProjects}
          config={config}
          metricNames={metricNames}
          onChange={updateConfig}
          onProjectChange={onProjectChange}
          project={project}
          runs={runs}
          selectedMetric={selectedMetric}
        />
        <ChartDisplayControls
          config={config}
          onChange={updateConfig}
          onTemplateChange={handleTemplateChange}
          selectedTemplate={selectedTemplate}
        />
        <ChartStyleControls config={config} onChange={updateConfig} />
        <ChartAdvancedControls config={config} onChange={updateConfig} />
      </ChartBuilderControls>
    </ChartBuilderShell>
  )
}
