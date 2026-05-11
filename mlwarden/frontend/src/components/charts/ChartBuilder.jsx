import { useMemo, useState } from 'react'
import { Button } from '../common/Button.jsx'
import { MetricChart } from './MetricChart.jsx'
import { PanelCard } from './PanelCard.jsx'

export function ChartBuilder({ project, runs, metricSeries }) {
  const [chartType, setChartType] = useState('line')
  const [selectedRunId, setSelectedRunId] = useState(runs[0]?.id || '')
  const [source, setSource] = useState('metrics')
  const [xAxis, setXAxis] = useState('step')
  const [yAxis, setYAxis] = useState('val.psnr')
  const [groupBy, setGroupBy] = useState('run.name')
  const [overrideJson, setOverrideJson] = useState('{\n  "grid": { "left": 48, "right": 18 }\n}')
  const selectedSeries = metricSeries[selectedRunId]?.[yAxis] || []

  const metricNames = useMemo(() => Object.keys(metricSeries[selectedRunId] || {}), [metricSeries, selectedRunId])

  return (
    <div className="chart-builder">
      <aside className="builder-panel panel">
        <h2>Chart builder</h2>
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
        <label>Filters<input defaultValue={`project = ${project.name}`} /></label>
        <label>Advanced ECharts override<textarea value={overrideJson} onChange={(event) => setOverrideJson(event.target.value)} rows={6} /></label>
        <div className="button-row">
          <Button variant="secondary">Preview</Button>
          <Button>Save chart</Button>
        </div>
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
