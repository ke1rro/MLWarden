import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getMetricSummary, getMetrics } from '@/api/metrics.js'
import { Button } from '@/components/common/Button.jsx'
import { MetricChart } from './MetricChart.jsx'
import { PanelCard } from './PanelCard.jsx'
import { buildChartOption, chartTemplates, normalizeChartConfig, parseEchartsOverride } from './chartOptions.js'
import { exportChart } from './chartExport.js'

const defaultOverride = '{\n  "grid": { "left": 56, "right": 24 }\n}'

function defaultConfig(project, runs) {
  const runId = runs[0]?.id || ''
  return normalizeChartConfig({
    name: '',
    chartType: 'line',
    source: 'metrics',
    runId,
    metric: '',
    yAxis: '',
    xAxis: 'step',
    groupBy: 'run.name',
    filters: project?.name ? `project = ${project.name}` : '',
    title: '',
    subtitle: '',
    xAxisLabel: 'Step',
    yAxisLabel: 'Value',
    showLegend: false,
    showTooltip: true,
    color: '#2563eb',
    palette: '',
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

function selectTemplateMetric(templateId, metricNames, currentMetric) {
  const lowerNames = metricNames.map((name) => [name, name.toLowerCase()])
  if (templateId === 'training-loss') return lowerNames.find(([, name]) => name.includes('loss'))?.[0] || currentMetric
  if (templateId === 'accuracy') return lowerNames.find(([, name]) => name.includes('accuracy') || name.includes('acc'))?.[0] || currentMetric
  if (templateId === 'system') return lowerNames.find(([, name]) => name.includes('system') || name.includes('usage'))?.[0] || currentMetric
  return currentMetric
}

function Field({ label, children }) {
  return <label>{label}{children}</label>
}

export function ChartBuilder({
  project,
  runs,
  savedCharts = [],
  onSaveChart,
  onAddPanel,
  initialConfig,
  initialMetricSeries,
  mode = 'saved',
}) {
  const baseConfig = useMemo(() => defaultConfig(project, runs), [project, runs])
  const [config, setConfig] = useState(() => normalizeChartConfig(initialConfig || baseConfig, baseConfig))
  const [templateId, setTemplateId] = useState('custom')
  const [metricSeries, setMetricSeries] = useState(initialMetricSeries || {})
  const [preview, setPreview] = useState({ config: null, option: null })
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const previewChartRef = useRef(null)

  const metricNames = useMemo(() => Object.keys(metricSeries), [metricSeries])
  const selectedMetric = config.metric || config.yAxis
  const selectedSeries = useMemo(() => metricSeries[selectedMetric] || [], [metricSeries, selectedMetric])

  const updateConfig = useCallback((patch) => {
    setConfig((current) => ({ ...current, ...patch }))
  }, [])

  useEffect(() => {
    if (!runs.length || config.runId) return
    updateConfig({ runId: runs[0].id })
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
    return () => {
      cancelled = true
    }
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
      if (config.source !== 'metrics') throw new Error('Preview currently supports metrics data source.')
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

  function handleTemplateChange(nextTemplateId) {
    const template = chartTemplates.find((item) => item.id === nextTemplateId)
    setTemplateId(nextTemplateId)
    if (!template) return

    setConfig((current) => {
      const metric = selectTemplateMetric(nextTemplateId, metricNames, current.metric)
      return {
        ...current,
        ...template.config,
        metric: metric || template.config.metric || current.metric,
        yAxis: metric || template.config.yAxis || current.yAxis,
        name: current.name,
      }
    })
  }

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
      await onSaveChart({
        name: normalized.name.trim() || normalized.title || `${normalized.metric} ${normalized.chartType}`,
        chart_type: normalized.chartType,
        config: normalized,
      })
      updateConfig({ name: '' })
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

  function handleSavedChart(chart) {
    const restored = configForSavedChart(chart, baseConfig)
    setConfig(restored)
    setTemplateId('custom')
  }

  const saveLabel = mode === 'panel' || onAddPanel ? 'Add panel' : 'Save chart'

  return (
    <div className="chart-builder">
      <aside className="builder-panel panel">
        <h2>Chart builder</h2>

        <section className="builder-section">
          <h3>Data</h3>
          <Field label="Name">
            <input value={config.name} onChange={(event) => updateConfig({ name: event.target.value })} placeholder={selectedMetric ? `${selectedMetric} ${config.chartType}` : 'Chart name'} />
          </Field>
          <Field label="Source">
            <select value={config.source} onChange={(event) => updateConfig({ source: event.target.value })}>
              <option value="metrics">Metrics</option>
              <option value="tables">Tables</option>
              <option value="params">Params</option>
              <option value="metadata">Metadata</option>
              <option value="events">Events</option>
            </select>
          </Field>
          <Field label="Run">
            <select value={config.runId} onChange={(event) => updateConfig({ runId: event.target.value })}>
              {runs.map((run) => <option key={run.id} value={run.id}>{run.name}</option>)}
            </select>
          </Field>
          <Field label="Metric">
            <select value={selectedMetric} onChange={(event) => updateConfig({ metric: event.target.value, yAxis: event.target.value })}>
              <option value="">Choose metric</option>
              {metricNames.map((metric) => <option key={metric} value={metric}>{metric}</option>)}
            </select>
          </Field>
          <Field label="X-axis">
            <select value={config.xAxis} onChange={(event) => updateConfig({ xAxis: event.target.value })}>
              <option value="step">Step</option>
              <option value="timestamp">Timestamp</option>
              <option value="epoch">Epoch</option>
            </select>
          </Field>
          <Field label="Y-axis">
            <input value={config.yAxis} onChange={(event) => updateConfig({ yAxis: event.target.value })} placeholder={selectedMetric || 'value'} />
          </Field>
          <Field label="Group by">
            <select value={config.groupBy} onChange={(event) => updateConfig({ groupBy: event.target.value })}>
              <option value="run.name">run.name</option>
              <option value="worker">worker</option>
              <option value="tag">tag</option>
            </select>
          </Field>
          <Field label="Filters">
            <input value={config.filters} onChange={(event) => updateConfig({ filters: event.target.value })} />
          </Field>
        </section>

        <section className="builder-section">
          <h3>Chart</h3>
          <Field label="Template">
            <select value={templateId} onChange={(event) => handleTemplateChange(event.target.value)}>
              {chartTemplates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
            </select>
          </Field>
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
            <label><input checked={config.showLegend} onChange={(event) => updateConfig({ showLegend: event.target.checked })} type="checkbox" /> Legend</label>
            <label><input checked={config.showTooltip} onChange={(event) => updateConfig({ showTooltip: event.target.checked })} type="checkbox" /> Tooltip</label>
          </div>
        </section>

        <section className="builder-section">
          <h3>Style</h3>
          <div className="builder-field-row">
            <Field label="Color">
              <input value={config.color} onChange={(event) => updateConfig({ color: event.target.value })} type="color" />
            </Field>
            <Field label="Background">
              <input value={config.backgroundColor} onChange={(event) => updateConfig({ backgroundColor: event.target.value })} type="color" />
            </Field>
          </div>
          <Field label="Palette">
            <input value={config.palette} onChange={(event) => updateConfig({ palette: event.target.value })} placeholder="#2563eb, #16a34a" />
          </Field>
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
            <label><input checked={config.smooth} onChange={(event) => updateConfig({ smooth: event.target.checked })} type="checkbox" /> Smooth line</label>
            <label><input checked={config.area} onChange={(event) => updateConfig({ area: event.target.checked })} type="checkbox" /> Area fill</label>
          </div>
        </section>

        <section className="builder-section">
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
          <Field label="Raw ECharts override JSON">
            <textarea value={config.echartsOptionOverride} onChange={(event) => updateConfig({ echartsOptionOverride: event.target.value })} rows={6} />
          </Field>
        </section>

        {error ? <p className="form-error">{error}</p> : null}
        <div className="button-row">
          <Button onClick={() => buildPreview(true)} variant="secondary">Preview</Button>
          <Button disabled={!preview.option} onClick={() => handleExport('png')} variant="secondary">Export PNG</Button>
          <Button disabled={!preview.option} onClick={() => handleExport('svg')} variant="secondary">Export SVG</Button>
          <Button disabled={isSaving || (!onSaveChart && !onAddPanel)} onClick={handleSave}>{isSaving ? 'Saving...' : saveLabel}</Button>
        </div>
        {mode !== 'panel' && savedCharts?.length ? (
          <div className="saved-chart-list">
            <strong>Saved charts</strong>
            {savedCharts.map((chart) => (
              <button key={chart.id} onClick={() => handleSavedChart(chart)} type="button">{chart.name}</button>
            ))}
          </div>
        ) : null}
      </aside>

      <section className="builder-preview panel">
        <header className="section-header">
          <div>
            <h2>{project?.name || 'Run'} preview</h2>
            <p>{config.source} · x: {config.xAxis} · metric: {selectedMetric || 'none'} · group: {config.groupBy}</p>
          </div>
        </header>
        <PanelCard title="Preview">
          <MetricChart option={preview.option} onReady={(chart) => { previewChartRef.current = chart }} />
        </PanelCard>
      </section>
    </div>
  )
}
