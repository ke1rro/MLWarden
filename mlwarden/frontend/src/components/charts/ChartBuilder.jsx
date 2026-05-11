import { useEffect, useMemo, useState } from 'react'
import { getMetricSummary, getMetrics } from '@/api/metrics.js'
import { Button } from '@/components/common/Button.jsx'
import { MetricChart } from './MetricChart.jsx'
import { PanelCard } from './PanelCard.jsx'

export function ChartBuilder({ project, runs, savedCharts, onSaveChart }) {
  const [name, setName] = useState('')
  const [chartType, setChartType] = useState('line')
  const [selectedRunId, setSelectedRunId] = useState(runs[0]?.id || '')
  const [source, setSource] = useState('metrics')
  const [xAxis, setXAxis] = useState('step')
  const [yAxis, setYAxis] = useState('val.psnr')
  const [groupBy, setGroupBy] = useState('run.name')
  const [filters, setFilters] = useState(`project = ${project.name}`)
  const [overrideJson, setOverrideJson] = useState('{\n  "grid": { "left": 48, "right": 18 }\n}')
  const [metricSeries, setMetricSeries] = useState({})
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const selectedSeries = metricSeries[yAxis] || []

  const metricNames = useMemo(() => Object.keys(metricSeries), [metricSeries])

  useEffect(() => {
    if (!runs.length) return
    if (!selectedRunId) setSelectedRunId(runs[0].id)
  }, [runs, selectedRunId])

  useEffect(() => {
    if (!selectedRunId) {
      setMetricSeries({})
      return undefined
    }

    let cancelled = false

    async function loadRunMetrics() {
      setError('')
      try {
        const summary = await getMetricSummary(selectedRunId)
        const names = (summary.items || []).map((item) => item.name)
        const response = names.length ? await getMetrics(selectedRunId, names) : { series: {} }
        if (!cancelled) {
          setMetricSeries(response.series || {})
          if (names.length && !names.includes(yAxis)) setYAxis(names[0])
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load metrics.')
      }
    }

    loadRunMetrics()
    return () => {
      cancelled = true
    }
  }, [selectedRunId, yAxis])

  async function handleSave() {
    setError('')
    setIsSaving(true)
    try {
      const override = overrideJson.trim() ? JSON.parse(overrideJson) : {}
      await onSaveChart({
        name: name.trim() || `${yAxis} ${chartType}`,
        chart_type: chartType,
        config: {
          source,
          run_id: selectedRunId,
          x_axis: xAxis,
          y_axis: yAxis,
          group_by: groupBy,
          filters,
          echarts_option_override: override,
        },
      })
      setName('')
    } catch (err) {
      setError(err.message || 'Failed to save chart.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="chart-builder">
      <aside className="builder-panel panel">
        <h2>Chart builder</h2>
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder={`${yAxis} ${chartType}`} /></label>
        <label>Chart type<select value={chartType} onChange={(event) => setChartType(event.target.value)}>
          <option value="line">Line</option>
          <option value="scatter">Scatter</option>
          <option value="bar">Bar</option>
          <option value="area">Area</option>
        </select></label>
        <label>Run<select value={selectedRunId} onChange={(event) => setSelectedRunId(event.target.value)}>
          {runs.map((run) => <option key={run.id} value={run.id}>{run.name}</option>)}
        </select></label>
        <label>Data source<select value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="metrics">Metrics</option>
          <option value="parameters">Parameters</option>
          <option value="run_metadata">Run metadata</option>
          <option value="table_columns">Table columns</option>
          <option value="events">Events</option>
        </select></label>
        <label>X-axis<select value={xAxis} onChange={(event) => setXAxis(event.target.value)}>
          <option value="step">Step</option>
          <option value="timestamp">Timestamp</option>
          <option value="epoch">Epoch</option>
        </select></label>
        <label>Y-axis<select value={yAxis} onChange={(event) => setYAxis(event.target.value)}>
          {metricNames.map((metric) => <option key={metric} value={metric}>{metric}</option>)}
        </select></label>
        <label>Group by<select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
          <option value="run.name">run.name</option>
          <option value="worker">worker</option>
          <option value="tag">tag</option>
        </select></label>
        <label>Filters<input value={filters} onChange={(event) => setFilters(event.target.value)} /></label>
        <label>Advanced ECharts override<textarea value={overrideJson} onChange={(event) => setOverrideJson(event.target.value)} rows={6} /></label>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="button-row">
          <Button variant="secondary">Preview</Button>
          <Button disabled={isSaving || !onSaveChart} onClick={handleSave}>{isSaving ? 'Saving...' : 'Save chart'}</Button>
        </div>
        {savedCharts?.length ? (
          <div className="saved-chart-list">
            <strong>Saved charts</strong>
            {savedCharts.map((chart) => <span key={chart.id}>{chart.name}</span>)}
          </div>
        ) : null}
      </aside>
      <section className="builder-preview panel">
        <header className="section-header">
          <div>
            <h2>{project.name} preview</h2>
            <p>{source} · x: {xAxis} · y: {yAxis} · group: {groupBy}</p>
          </div>
        </header>
        <PanelCard title={yAxis}>
          <MetricChart title={yAxis} series={selectedSeries} type={chartType} area={chartType === 'area'} />
        </PanelCard>
      </section>
    </div>
  )
}
