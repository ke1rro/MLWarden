import { Image as ImageIcon, Plus, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/common/Button.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { Modal } from '@/components/common/Modal.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { IconButton } from '@/components/common/IconButton.jsx'
import { ChartGrid } from '@/components/charts/ChartGrid.jsx'
import { dataUrlToBlob, saveBlob } from '@/shared/downloads.js'

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

export function RunChartsWorkspace({ metricSeries, run, images = [], getImageUrl }) {
  const [query, setQuery] = useState('')
  const [panelOverrides, setPanelOverrides] = useState(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [builderMetric, setBuilderMetric] = useState('')
  const [builderName, setBuilderName] = useState('')
  const [imageUrls, setImageUrls] = useState({})
  const chartRefs = useRef({})
  const metricNames = useMemo(() => Object.keys(metricSeries), [metricSeries])
  const sdkPanels = useMemo(() => normalizeSdkPanels(run, metricNames), [metricNames, run])
  const panels = useMemo(() => {
    const selectedPanels = panelOverrides ?? createDefaultPanels(metricNames, sdkPanels)
    return selectedPanels.filter((panel) => metricNames.includes(panel.metric))
  }, [metricNames, panelOverrides, sdkPanels])
  const visiblePanels = useMemo(
    () => panels.filter((panel) => metricNames.includes(panel.metric) && matchesPanelQuery(panel, query)),
    [metricNames, panels, query],
  )
  const availablePanels = metricNames.filter((metric) => !panels.some((panel) => panel.metric === metric))
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

  function handleAddPanel(event) {
    event.preventDefault()
    if (!builderMetric) return
    setPanelOverrides((current) => [
      ...(current ?? panels),
      {
        id: `${builderMetric}-${Date.now()}`,
        metric: builderMetric,
        title: builderName.trim() || builderMetric,
        size: 'md',
        type: inferChartType(builderMetric),
      },
    ])
    setBuilderMetric('')
    setBuilderName('')
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

  if (!metricNames.length) {
    return <EmptyState title="No metrics logged yet." message="Charts will appear after a worker logs metrics for this run." />
  }

  return (
    <section className="workspace-stack">
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search panels" />
        <IconButton label="Filter panels" icon={SlidersHorizontal} onClick={() => setIsFilterOpen(true)} />
        <Button disabled={!availablePanels.length} onClick={() => setIsAddOpen(true)}><Plus size={15} /> Add panel</Button>
      </Toolbar>
      {visiblePanels.length ? (
        <ChartGrid
          panels={visiblePanels}
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
      {mediaImages.length ? (
        <section className="media-panel-section">
          <header className="section-header">
            <div>
              <h2>Media panels</h2>
              <p>Images logged by the SDK for training samples, predictions, and artifacts.</p>
            </div>
          </header>
          <div className="chart-grid compact-grid">
            {mediaImages.map((image) => <MediaPanel image={image} imageUrl={imageUrls[image.id]} key={image.id} />)}
          </div>
        </section>
      ) : null}
      {isAddOpen ? (
        <Modal title="Chart builder" description="Create a local panel from SDK-logged metrics. Chart type is inferred from metric metadata/name." onClose={() => setIsAddOpen(false)}>
          <form className="settings-form-grid" onSubmit={handleAddPanel}>
            <label>
              Panel name
              <input value={builderName} onChange={(event) => setBuilderName(event.target.value)} placeholder={builderMetric || 'Validation loss'} />
            </label>
            <label>
              Metric
              <select value={builderMetric} onChange={(event) => setBuilderMetric(event.target.value)} required>
                <option value="">Choose metric</option>
                {availablePanels.map((metric) => <option key={metric} value={metric}>{metric}</option>)}
              </select>
            </label>
            <label>
              SDK-defined chart type
              <input readOnly value={builderMetric ? inferChartType(builderMetric) : 'Choose a metric'} />
            </label>
            <div className="button-row">
              <Button type="submit">Add chart panel</Button>
              <Button onClick={() => setIsAddOpen(false)} variant="secondary">Cancel</Button>
            </div>
          </form>
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
    </section>
  )
}
