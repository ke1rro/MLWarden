import { Image as ImageIcon, Plus, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/common/Button.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { Modal } from '@/components/common/Modal.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { IconButton } from '@/components/common/IconButton.jsx'
import { ChartBuilder } from '@/components/charts/ChartBuilder.jsx'
import { ChartGrid } from '@/components/charts/ChartGrid.jsx'
import { exportChart } from '@/components/charts/chartExport.js'
import { runColorForRun } from '@/components/charts/runColors.js'

function matchesPanelQuery(panel, query) {
  if (!query.trim()) return true
  return `${panel.metric || panel.title || ''}`.toLowerCase().includes(query.toLowerCase())
}

function inferChartType(metric) {
  const normalized = metric.toLowerCase()
  if (normalized.includes('count') || normalized.includes('histogram')) return 'bar'
  if (normalized.includes('scatter')) return 'scatter'
  if (normalized.includes('loss') || normalized.includes('usage')) return 'area'
  return 'line'
}

function createDefaultPanels(metricNames, sdkPanels = []) {
  if (sdkPanels.length) return sdkPanels
  return metricNames.slice(0, 4).map((metric) => ({ id: metric, metric, size: 'md', type: inferChartType(metric) }))
}

function normalizeSdkPanels(run, metricNames) {
  const rawPanels = run?.metadata?.mlwarden_panels || run?.metadata?.panels || []
  if (!Array.isArray(rawPanels)) return []
  return rawPanels
    .map((panel, index) => {
      const metric = panel.metric || panel.y_axis || panel.name
      if (!metric || !metricNames.includes(metric)) return null
      return {
        id: panel.id || `${metric}-${index}`,
        metric,
        title: panel.title || panel.name || metric,
        size: panel.size || 'md',
        type: panel.type || panel.chart_type || inferChartType(metric),
        area: panel.area,
      }
    })
    .filter(Boolean)
}

function MediaPanel({ image, imageUrl }) {
  return (
    <article className="chart-panel media-panel" data-search-text={`${image.name} ${image.caption}`}>
      <header className="chart-panel-header">
        <h3>{image.name}</h3>
        <ImageIcon size={16} />
      </header>
      {imageUrl ? <img alt={image.name} src={imageUrl} /> : <span className="image-placeholder" />}
      <p>{image.caption || `step ${image.step}`}</p>
    </article>
  )
}

function RunChartToolbar({ metricCount, onAddPanel, onFilterPanels, onQueryChange, query }) {
  return (
    <Toolbar>
      <SearchInput value={query} onChange={onQueryChange} placeholder="Search panels" />
      <IconButton label="Filter panels" icon={SlidersHorizontal} onClick={onFilterPanels} />
      <Button disabled={!metricCount} onClick={onAddPanel}><Plus size={15} /> Add panel</Button>
    </Toolbar>
  )
}

function RunMetricPanelSection({
  metricSeries,
  onChartReady,
  onExportPanel,
  onRemovePanel,
  onReorderPanel,
  onResizePanel,
  onUpdatePanelConfig,
  panels,
  runColor,
}) {
  if (!panels.length) {
    return <EmptyState title="No panels match this filter." message="Clear the panel search or add another metric panel." />
  }

  return (
    <ChartGrid
      defaultColor={runColor}
      panels={panels}
      metricSeries={metricSeries}
      onChartReady={onChartReady}
      onExportPanel={onExportPanel}
      onRemovePanel={onRemovePanel}
      onReorderPanel={onReorderPanel}
      onResizePanel={onResizePanel}
      onUpdatePanelConfig={onUpdatePanelConfig}
    />
  )
}

function RunMediaPanelSection({ imageUrls, images }) {
  if (!images.length) return null

  return (
    <section className="media-panel-section">
      <header className="section-header">
        <div>
          <h2>Media panels</h2>
        </div>
      </header>
      <div className="chart-grid compact-grid">
        {images.map((image) => <MediaPanel image={image} imageUrl={imageUrls[image.id]} key={image.id} />)}
      </div>
    </section>
  )
}

function AddPanelDialog({ isOpen, metricSeries, onAddPanel, onClose, project, runColor, runs }) {
  if (!isOpen) return null

  return (
    <Modal title="Chart builder" description="Create a local run panel from SDK-logged metrics." onClose={onClose} size="lg">
      <ChartBuilder
        project={project}
        runs={runs}
        initialMetricSeries={metricSeries}
        initialConfig={{ color: runColor }}
        mode="panel"
        onAddPanel={onAddPanel}
      />
    </Modal>
  )
}

function PanelFilterDialog({ isOpen, metrics, onClose, onToggleMetric, panels }) {
  if (!isOpen) return null

  return (
    <Modal title="Filter panels" description="Toggle visible metric panels in the grid." onClose={onClose}>
      <div className="option-list">
        {metrics.map((metric) => {
          const active = panels.some((panel) => panel.metric === metric)
          return (
            <button
              className={active ? 'is-selected' : ''}
              key={metric}
              onClick={() => onToggleMetric(metric, active)}
              type="button"
            >
              {metric}
            </button>
          )
        })}
      </div>
    </Modal>
  )
}

function RunChartDialogs({
  isAddOpen,
  isFilterOpen,
  metricNames,
  metricSeries,
  onAddPanel,
  onCloseAdd,
  onCloseFilter,
  onToggleMetric,
  panels,
  project,
  runColor,
  runs,
}) {
  return (
    <>
      <AddPanelDialog
        isOpen={isAddOpen}
        metricSeries={metricSeries}
        onAddPanel={onAddPanel}
        onClose={onCloseAdd}
        project={project}
        runColor={runColor}
        runs={runs}
      />
      <PanelFilterDialog
        isOpen={isFilterOpen}
        metrics={metricNames}
        onClose={onCloseFilter}
        onToggleMetric={onToggleMetric}
        panels={panels}
      />
    </>
  )
}

export function RunChartsWorkspace({ metricSeries, project, run, images = [], getImageUrl }) {
  const [query, setQuery] = useState('')
  const [panelOverrides, setPanelOverrides] = useState(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [imageUrls, setImageUrls] = useState({})
  const chartRefs = useRef({})
  const runColor = useMemo(() => runColorForRun(run), [run])
  const metricNames = useMemo(() => Object.keys(metricSeries), [metricSeries])
  const sdkPanels = useMemo(() => normalizeSdkPanels(run, metricNames), [metricNames, run])
  const builderRuns = useMemo(() => [run], [run])
  const panels = useMemo(() => {
    const selectedPanels = panelOverrides ?? createDefaultPanels(metricNames, sdkPanels)
    return selectedPanels.filter((panel) => metricNames.includes(panel.metric))
  }, [metricNames, panelOverrides, sdkPanels])
  const visiblePanels = useMemo(
    () => panels.filter((panel) => metricNames.includes(panel.metric) && matchesPanelQuery(panel, query)),
    [metricNames, panels, query],
  )
  const mediaImages = useMemo(() => images.slice(0, 4), [images])

  useEffect(() => {
    if (!getImageUrl || !mediaImages.length) return undefined
    let cancelled = false
    const objectUrls = []
    Promise.all(
      mediaImages.map(async (image) => {
        const url = await getImageUrl(image.id)
        objectUrls.push(url)
        return [image.id, url]
      }),
    ).then((entries) => {
      if (!cancelled) setImageUrls(Object.fromEntries(entries))
    }).catch(() => {
      if (!cancelled) setImageUrls({})
    })
    return () => {
      cancelled = true
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [getImageUrl, mediaImages])

  const handleChartReady = useCallback((panelId, chart) => {
    if (chart) chartRefs.current[panelId] = chart
    else delete chartRefs.current[panelId]
  }, [])

  function handleAddPanel(chartConfig) {
    const metric = chartConfig.metric || chartConfig.yAxis
    if (!metric) return
    setPanelOverrides((current) => [
      ...(current ?? panels),
      {
        id: `${metric}-${Date.now()}`,
        metric,
        title: chartConfig.name || chartConfig.title || metric,
        size: 'md',
        type: chartConfig.chartType || inferChartType(metric),
        area: chartConfig.area,
        config: chartConfig,
      },
    ])
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
        return { ...panel, size: requestedSize }
      }),
    )
  }

  function handleUpdatePanelConfig(panelId, patch) {
    setPanelOverrides((current) =>
      (current ?? panels).map((panel) => {
        if (panel.id !== panelId) return panel
        return { ...panel, config: { ...(panel.config || {}), ...patch } }
      }),
    )
  }

  async function handleExportPanel(panelId, format) {
    const chart = chartRefs.current[panelId]
    const panel = panels.find((item) => item.id === panelId)
    if (!chart || !panel) return
    await exportChart({
      chart,
      option: chart.getOption(),
      format,
      filename: panel.title || panel.metric,
      backgroundColor: panel.config?.backgroundColor || '#ffffff',
    })
  }

  function handleToggleMetric(metric, active) {
    setPanelOverrides((current) =>
      active
        ? (current ?? panels).filter((panel) => panel.metric !== metric)
        : [...(current ?? panels), { id: metric, metric, size: 'md' }],
    )
  }

  if (!metricNames.length) {
    return <EmptyState title="No metrics logged yet." message="Charts will appear after a worker logs metrics for this run." />
  }

  return (
    <section className="workspace-stack">
      <RunChartToolbar
        metricCount={metricNames.length}
        onAddPanel={() => setIsAddOpen(true)}
        onFilterPanels={() => setIsFilterOpen(true)}
        onQueryChange={setQuery}
        query={query}
      />
      <RunMetricPanelSection
        metricSeries={metricSeries}
        onChartReady={handleChartReady}
        onExportPanel={handleExportPanel}
        onRemovePanel={(panelId) => setPanelOverrides((current) => (current ?? panels).filter((item) => item.id !== panelId))}
        onReorderPanel={handleReorderPanel}
        onResizePanel={handleResizePanel}
        onUpdatePanelConfig={handleUpdatePanelConfig}
        panels={visiblePanels}
        runColor={runColor}
      />
      <RunMediaPanelSection imageUrls={imageUrls} images={mediaImages} />
      <RunChartDialogs
        isAddOpen={isAddOpen}
        isFilterOpen={isFilterOpen}
        metricNames={metricNames}
        metricSeries={metricSeries}
        onAddPanel={handleAddPanel}
        onCloseAdd={() => setIsAddOpen(false)}
        onCloseFilter={() => setIsFilterOpen(false)}
        onToggleMetric={handleToggleMetric}
        panels={panels}
        project={project}
        runColor={runColor}
        runs={builderRuns}
      />
    </section>
  )
}
