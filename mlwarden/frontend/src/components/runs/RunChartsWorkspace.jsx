import { Plus, Settings, SlidersHorizontal } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/common/Button.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { Modal } from '@/components/common/Modal.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { IconButton } from '@/components/common/IconButton.jsx'
import { ChartGrid } from '@/components/charts/ChartGrid.jsx'
import { dataUrlToBlob, saveBlob, saveTextFile } from '@/shared/downloads.js'

function matchesPanelQuery(panel, query) {
  if (!query.trim()) return true
  try {
    return new RegExp(query, 'i').test(panel.metric)
  } catch {
    return panel.metric.toLowerCase().includes(query.toLowerCase())
  }
}

function createDefaultPanels(metricNames) {
  return metricNames.slice(0, 4).map((metric) => ({ id: metric, metric, size: 'md' }))
}

export function RunChartsWorkspace({ metricSeries, metricSummaries = [], project, run }) {
  const [query, setQuery] = useState('')
  const [panelOverrides, setPanelOverrides] = useState(null)
  const [chartType, setChartType] = useState('line')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const chartRefs = useRef({})
  const metricNames = useMemo(() => Object.keys(metricSeries), [metricSeries])
  const panels = useMemo(() => {
    const selectedPanels = panelOverrides ?? createDefaultPanels(metricNames)
    return selectedPanels.filter((panel) => metricNames.includes(panel.metric))
  }, [metricNames, panelOverrides])
  const visiblePanels = useMemo(
    () => panels.filter((panel) => metricNames.includes(panel.metric) && matchesPanelQuery(panel, query)),
    [metricNames, panels, query],
  )
  const availablePanels = metricNames.filter((metric) => !panels.some((panel) => panel.metric === metric))

  const handleChartReady = useCallback((panelId, chart) => {
    if (chart) chartRefs.current[panelId] = chart
    else delete chartRefs.current[panelId]
  }, [])

  function handleAddPanel(metric) {
    setPanelOverrides((current) => [...(current ?? panels), { id: metric, metric, size: 'md' }])
    setIsAddOpen(false)
  }

  function handleReorderPanel(sourceId, targetId) {
    if (!sourceId || sourceId === targetId) return
    setPanelOverrides((current) => {
      const sourcePanels = current ?? panels
      const sourceIndex = sourcePanels.findIndex((panel) => panel.id === sourceId)
      const targetIndex = sourcePanels.findIndex((panel) => panel.id === targetId)
      if (sourceIndex < 0 || targetIndex < 0) return sourcePanels
      const next = [...sourcePanels]
      const [source] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, source)
      return next
    })
  }

  function handleResizePanel(panelId, requestedSize) {
    setPanelOverrides((current) =>
      (current ?? panels).map((panel) => {
        if (panel.id !== panelId) return panel
        const nextSize = panel.size === requestedSize ? 'md' : requestedSize
        return { ...panel, size: nextSize }
      }),
    )
  }

  async function handleExportPanel(panelId, format) {
    const chart = chartRefs.current[panelId]
    const panel = panels.find((item) => item.id === panelId)
    if (!chart || !panel) return
    const dataUrl = chart.getDataURL({
      type: format,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    })
    const mimeType = format === 'svg' ? 'image/svg+xml' : 'image/png'
    await saveBlob(dataUrlToBlob(dataUrl), `${panel.metric}.${format}`, mimeType)
  }

  function handleDownloadReport() {
    const report = {
      generated_at: new Date().toISOString(),
      project: project?.name,
      run: run?.name,
      status: run?.status,
      metrics: metricSummaries,
      panels: panels.map((panel) => panel.metric),
    }
    saveTextFile(JSON.stringify(report, null, 2), `${run?.name || 'run'}-report.json`, 'application/json')
  }

  if (!metricNames.length) {
    return <EmptyState title="No metrics logged yet." message="Charts will appear after a worker logs metrics for this run." />
  }

  return (
    <section className="workspace-stack">
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search panels with regex" />
        <IconButton label="Panel settings" icon={Settings} onClick={() => setIsSettingsOpen(true)} />
        <IconButton label="Filter panels" icon={SlidersHorizontal} onClick={() => setIsFilterOpen(true)} />
        <Button onClick={() => setIsReportOpen(true)} variant="secondary">New report</Button>
        <Button disabled={!availablePanels.length} onClick={() => setIsAddOpen(true)}><Plus size={15} /> Add panel</Button>
      </Toolbar>
      {visiblePanels.length ? (
        <ChartGrid
          panels={visiblePanels.map((panel) => ({ ...panel, type: chartType }))}
          metricSeries={metricSeries}
          onChartReady={handleChartReady}
          onExportPanel={handleExportPanel}
          onRemovePanel={(panelId) => setPanelOverrides((current) => (current ?? panels).filter((item) => item.id !== panelId))}
          onReorderPanel={handleReorderPanel}
          onResizePanel={handleResizePanel}
        />
      ) : (
        <EmptyState title="No panels match this filter." message="Clear the panel search or add another metric panel." />
      )}
      {isAddOpen ? (
        <Modal title="Add panel" description="Choose a metric to add to the grid." onClose={() => setIsAddOpen(false)}>
          <div className="option-list">
            {availablePanels.map((metric) => (
              <button data-search-text={metric} key={metric} onClick={() => handleAddPanel(metric)} type="button">
                {metric}
              </button>
            ))}
          </div>
        </Modal>
      ) : null}
      {isSettingsOpen ? (
        <Modal title="Panel settings" description="Apply display preferences to the chart workspace." onClose={() => setIsSettingsOpen(false)}>
          <div className="settings-form-grid">
            <label>
              Chart type
              <select value={chartType} onChange={(event) => setChartType(event.target.value)}>
                <option value="line">Line</option>
                <option value="area">Area</option>
                <option value="bar">Bar</option>
                <option value="scatter">Scatter</option>
              </select>
            </label>
          </div>
        </Modal>
      ) : null}
      {isFilterOpen ? (
        <Modal title="Filter panels" description="Toggle visible metric panels in the grid." onClose={() => setIsFilterOpen(false)}>
          <div className="option-list">
            {metricNames.map((metric) => {
              const active = panels.some((panel) => panel.metric === metric)
              return (
                <button
                  className={active ? 'is-selected' : ''}
                  key={metric}
                  onClick={() => {
                    setPanelOverrides((current) =>
                      active
                        ? (current ?? panels).filter((panel) => panel.metric !== metric)
                        : [...(current ?? panels), { id: metric, metric, size: 'md' }],
                    )
                  }}
                  type="button"
                >
                  {metric}
                </button>
              )
            })}
          </div>
        </Modal>
      ) : null}
      {isReportOpen ? (
        <Modal
          title={`${run?.name || 'Run'} report`}
          description="Generated from the current run metrics and visible panels."
          onClose={() => setIsReportOpen(false)}
          footer={(
            <>
              <Button variant="secondary" onClick={() => setIsReportOpen(false)}>Close</Button>
              <Button onClick={handleDownloadReport}>Download JSON</Button>
            </>
          )}
          size="lg"
        >
          <div className="report-summary">
            <div className="mini-metric-row">
              <small><b>{run?.status || 'n/a'}</b> Status</small>
              <small><b>{metricSummaries.length}</b> Metrics</small>
              <small><b>{panels.length}</b> Panels</small>
            </div>
            <div className="table-shell tight">
              <table className="data-table">
                <thead>
                  <tr><th>Metric</th><th>Latest</th><th>Min</th><th>Max</th><th>Count</th></tr>
                </thead>
                <tbody>
                  {metricSummaries.slice(0, 10).map((summary) => (
                    <tr key={summary.name}>
                      <td>{summary.name}</td>
                      <td>{summary.latest}</td>
                      <td>{summary.min}</td>
                      <td>{summary.max}</td>
                      <td>{summary.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  )
}
