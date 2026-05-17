import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getMetricSummary, getMetrics } from '@/api/metrics.js'
import { listProjects } from '@/api/projects.js'
import { Button } from '@/components/common/Button.jsx'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
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
  return (
    <section className="builder-section builder-section-inline">
      <h3>Data</h3>
      <Field label="Name">
        <input value={config.name} onChange={(event) => onChange({ name: event.target.value })} placeholder={selectedMetric ? `${selectedMetric} ${config.chartType}` : 'Chart name'} />
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
          {runs.map((run) => <option key={run.id} value={run.id}>{run.name}</option>)}
        </select>
      </Field>
      <Field label="Y-Axis">
        <select value={selectedMetric} onChange={(event) => onChange({ metric: event.target.value, yAxis: event.target.value })}>
          <option value="">Choose metric</option>
          {metricNames.map((metric) => <option key={metric} value={metric}>{metric}</option>)}
        </select>
      </Field>
      <Field label="X-axis">
        <select value={config.xAxis} onChange={(event) => onChange({ xAxis: event.target.value })}>
          <option value="step">Step</option>
          <option value="timestamp">Timestamp</option>
        </select>
      </Field>
    </section>
  )
}

function ChartDisplayControls({ config, onChange }) {
  return (
    <section className="builder-section builder-section-inline">
      <h3>Chart</h3>
      <Field label="Chart type">
        <select value={config.chartType} onChange={(event) => onChange({ chartType: event.target.value, area: event.target.value === 'area' ? true : config.area })}>
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
          <input checked={config.showXAxisLabel} onChange={(event) => onChange({ showXAxisLabel: event.target.checked })} type="checkbox" />
          X label
        </label>
        <label>
          <input checked={config.showYAxisLabel} onChange={(event) => onChange({ showYAxisLabel: event.target.checked })} type="checkbox" />
          Y label
        </label>
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
        <Field label="Line width">
          <input min="1" max="10" value={config.lineWidth} onChange={(event) => onChange({ lineWidth: event.target.value })} type="number" />
        </Field>
      </div>
      <div className="builder-field-row">
        <Field label="Point size">
          <input min="1" max="20" value={config.pointSize} onChange={(event) => onChange({ pointSize: event.target.value })} type="number" />
        </Field>
        <Field label="Bar width">
          <input min="4" max="80" value={config.barWidth} onChange={(event) => onChange({ barWidth: event.target.value })} type="number" />
        </Field>
      </div>
      <div className="toggle-grid">
        <label>
          <input checked={config.smooth} onChange={(event) => onChange({ smooth: event.target.checked })} type="checkbox" />
          Smooth
        </label>
        <label>
          <input checked={config.area} onChange={(event) => onChange({ area: event.target.checked })} type="checkbox" />
          Area
        </label>
      </div>
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

function ChartBuilderActions({ activeChartId, canSave, isSaving, onDelete, onExport, onSave, saveLabel }) {
  return (
    <div className="builder-actions-row">
      <div className="button-row">
        <Button disabled={!canSave} onClick={() => onExport('png')} variant="secondary">Export PNG</Button>
        <Button disabled={!canSave} onClick={() => onExport('svg')} variant="secondary">Export SVG</Button>
        <Button disabled={isSaving || !onSave} onClick={onSave}>{isSaving ? 'Saving...' : saveLabel}</Button>
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
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const previewChartRef = useRef(null)

  const activeChartId = initialChart?.id

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
      setIsLoadingMetrics(true)
      setError('')
      try {
        const summary = await getMetricSummary(config.runId)
        const names = (summary.items || []).map((item) => item.name)
        const response = names.length ? await getMetrics(config.runId, names) : { series: {} }
        if (!cancelled) setMetricSeries(response.series || {})
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load metrics.')
      } finally {
        if (!cancelled) setIsLoadingMetrics(false)
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

  const chartPlaceholder = useMemo(() => {
    if (!project && !config.runId) return 'Select a project to get started.'
    if (!config.runId) return 'Choose a run to preview the chart.'
    if (isLoadingMetrics) return 'Loading metrics…'
    if (!selectedMetric) return 'Choose a metric for the Y-axis.'
    if (!selectedSeries.length) return `No data found for metric "${selectedMetric}".`
    return ''
  }, [config.runId, isLoadingMetrics, project, selectedMetric, selectedSeries])

  const buildPreview = useCallback((showError = false) => {
    if (!config.runId || !selectedMetric || !selectedSeries.length || isLoadingMetrics) {
      setPreview({ config: null, option: null })
      return null
    }
    try {
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
  }, [baseConfig, config, isLoadingMetrics, selectedMetric, selectedSeries])

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
            canSave={Boolean(preview.option)}
            isSaving={isSaving}
            onDelete={activeChartId && onDeleteChart ? () => setShowDeleteConfirm(true) : null}
            onExport={handleExport}
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
          allProjects={allProjects}
          config={config}
          metricNames={metricNames}
          onChange={updateConfig}
          onProjectChange={onProjectChange}
          project={project}
          runs={runs}
          selectedMetric={selectedMetric}
        />
        <ChartDisplayControls config={config} onChange={updateConfig} />
        <ChartStyleControls config={config} onChange={updateConfig} />
        <ChartAdvancedControls config={config} onChange={updateConfig} />
      </ChartBuilderControls>
    </ChartBuilderShell>
  )
}
