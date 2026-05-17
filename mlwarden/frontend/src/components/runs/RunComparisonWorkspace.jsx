import { Download, Eye, EyeOff, Settings, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { compareRuns, createRunComparison } from '@/api/runComparisons.js'
import { Button } from '@/components/common/Button.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { IconButton } from '@/components/common/IconButton.jsx'
import { Modal } from '@/components/common/Modal.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { PanelCard } from '@/components/charts/PanelCard.jsx'
import { MetricChart } from '@/components/charts/MetricChart.jsx'
import { buildChartOption } from '@/components/charts/chartOptions.js'
import { exportChart } from '@/components/charts/chartExport.js'
import { runPaletteForRuns } from '@/components/charts/runColors.js'
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

function ComparisonHeader({
  bestRunName,
  bestValue,
  isSaving,
  onExportCharts,
  onExportJson,
  onReset,
  onSave,
  primaryMetric,
  selectedRunCount,
  canSave,
}) {
  return (
    <header className="combined-run-header panel">
      <div className="combined-run-title">
        <h2>Comparison</h2>
        <span>{selectedRunCount} runs</span>
        {primaryMetric ? <span>{primaryMetric}</span> : null}
        {bestRunName !== 'n/a' ? <span>Best: {bestRunName}{bestValue === null || bestValue === undefined ? '' : ` (${Number(bestValue).toPrecision(4)})`}</span> : null}
      </div>
      <div className="button-row">
        <Button disabled={isSaving || !canSave} onClick={onSave}>{isSaving ? 'Saving...' : 'Save comparison'}</Button>
        <Button onClick={onExportCharts} variant="secondary"><Download size={14} /> Export charts</Button>
        <Button onClick={onExportJson} variant="secondary">Export JSON</Button>
        <Button onClick={onReset} variant="secondary">Reset selection</Button>
      </div>
    </header>
  )
}

function ComparisonToolbar({ onOpenMetricPicker, onOpenSettings, onQueryChange, query }) {
  return (
    <Toolbar>
      <SearchInput value={query} onChange={onQueryChange} placeholder="Search panels" />
      <IconButton label="Comparison settings" icon={Settings} onClick={onOpenSettings} />
      <IconButton label="Filter panels" icon={SlidersHorizontal} onClick={onOpenMetricPicker} />
    </Toolbar>
  )
}

function ComparisonStatusMessages({ error, isLoading, sharedMetrics }) {
  return (
    <>
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p className="muted-copy">Loading comparison...</p> : null}
      {!sharedMetrics.length ? <EmptyState title="Selected runs have no shared metrics." message="Choose runs that logged at least one metric with the same name." /> : null}
    </>
  )
}

function ComparisonChartGrid({
  getOption,
  onChartReady,
  onExportMetric,
  onReorderPanel,
  onResizePanel,
  onToggleAxisLabel,
  panelAxisLabels,
  panelSizes,
  primaryMetric,
  visibleMetrics,
}) {
  return (
    <div className="chart-grid comparison-chart-grid">
      {visibleMetrics.map((metric) => {
        const panelSize = panelSizes[metric] || (metric === primaryMetric ? 'lg' : 'md')
        const axisLabels = panelAxisLabels[metric] || {}
        const showXAxisLabel = axisLabels.showXAxisLabel ?? false
        const showYAxisLabel = axisLabels.showYAxisLabel ?? false

        return (
          <PanelCard
            actions={[
              {
                label: showXAxisLabel ? 'Hide x-axis label' : 'Show x-axis label',
                icon: showXAxisLabel ? EyeOff : Eye,
                onSelect: () => onToggleAxisLabel(metric, 'showXAxisLabel', !showXAxisLabel),
              },
              {
                label: showYAxisLabel ? 'Hide y-axis label' : 'Show y-axis label',
                icon: showYAxisLabel ? EyeOff : Eye,
                onSelect: () => onToggleAxisLabel(metric, 'showYAxisLabel', !showYAxisLabel),
              },
              { label: 'Export PNG', icon: Download, onSelect: () => onExportMetric(metric, 'png') },
              { label: 'Export SVG', icon: Download, onSelect: () => onExportMetric(metric, 'svg') },
            ]}
            className="comparison-chart-panel"
            draggable
            key={metric}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', metric)
            }}
            onDrop={(event) => {
              event.preventDefault()
              onReorderPanel(event.dataTransfer.getData('text/plain'), metric)
            }}
            onRemove={null}
            onResize={(size) => onResizePanel(metric, size)}
            size={panelSize}
            title={metric}
          >
            <MetricChart
              option={getOption(metric)}
              onReady={(chart) => onChartReady(metric, chart)}
            />
          </PanelCard>
        )
      })}
    </div>
  )
}

function ComparisonSettingsDialog({
  config,
  onApplyComparison,
  onChange,
  onClose,
  primaryMetric,
  savedComparisons,
  sharedMetrics,
}) {
  return (
    <Modal title="Comparison settings" description="Adjust how the selected runs are compared." onClose={onClose} size="lg">
      <div className="comparison-settings-grid">
        <label>
          Rename comparison
          <input value={config.name} onChange={(event) => onChange({ name: event.target.value })} />
        </label>
        <label>
          Primary metric
          <select value={primaryMetric} onChange={(event) => onChange({ primaryMetric: event.target.value, metrics: [event.target.value, ...config.metrics.filter((metric) => metric !== event.target.value)] })}>
            {sharedMetrics.map((metric) => <option key={metric} value={metric}>{metric}</option>)}
          </select>
        </label>
        <label>
          X-axis
          <select value={config.xAxis} onChange={(event) => onChange({ xAxis: event.target.value })}>
            <option value="step">step</option>
            <option value="epoch">epoch</option>
            <option value="timestamp">timestamp</option>
          </select>
        </label>
        <label>
          Chart type
          <select value={config.chartType} onChange={(event) => onChange({ chartType: event.target.value })}>
            <option value="line">line</option>
            <option value="scatter">scatter</option>
            <option value="bar">bar</option>
          </select>
        </label>
        <label>
          Aggregation
          <select value={config.aggregation} onChange={(event) => onChange({ aggregation: event.target.value })}>
            <option value="none">none</option>
            <option value="mean">mean</option>
            <option value="median">median</option>
            <option value="min">min</option>
            <option value="max">max</option>
          </select>
        </label>
        <label>
          Smoothing
          <input max="0.95" min="0" onChange={(event) => onChange({ smoothing: event.target.value })} step="0.05" type="number" value={config.smoothing} />
        </label>
        <label>
          Best value
          <select value={config.metricDirection} onChange={(event) => onChange({ metricDirection: event.target.value })}>
            <option value="auto">auto</option>
            <option value="maximize">maximize</option>
            <option value="minimize">minimize</option>
          </select>
        </label>
        <div className="comparison-toggle-row">
          <label className="toggle-control"><input checked={config.showLegend} onChange={(event) => onChange({ showLegend: event.target.checked })} type="checkbox" /> Legend</label>
          <label className="toggle-control"><input checked={config.showTooltip} onChange={(event) => onChange({ showTooltip: event.target.checked })} type="checkbox" /> Tooltip</label>
          <label className="toggle-control"><input checked={config.highlightBestRun} onChange={(event) => onChange({ highlightBestRun: event.target.checked })} type="checkbox" /> Highlight best</label>
        </div>
      </div>
      {savedComparisons.length ? (
        <div className="saved-comparisons comparison-modal-section">
          <strong>Saved comparisons</strong>
          {savedComparisons.map((comparisonItem) => (
            <button key={comparisonItem.id} onClick={() => onApplyComparison?.(comparisonItem)} type="button">{comparisonItem.name}</button>
          ))}
        </div>
      ) : null}
    </Modal>
  )
}

function MetricPickerDialog({ config, onClose, onToggleMetric, selectedMetricSet, sharedMetrics }) {
  return (
    <Modal title={`Charts ${config.metrics.length}`} description="Choose which shared metrics are visible as panels." onClose={onClose}>
      <div className="comparison-metric-picker">
        {sharedMetrics.map((metric) => (
          <label className="toggle-control" key={metric}>
            <input checked={selectedMetricSet.has(metric)} onChange={() => onToggleMetric(metric)} type="checkbox" />
            {metric}
          </label>
        ))}
      </div>
    </Modal>
  )
}

function ExportDialog({
  exportSelection,
  isExporting,
  onBulkExport,
  onClose,
  onSelectionChange,
  visibleMetrics,
}) {
  return (
    <Modal
      title="Export charts"
      description="Select which metric panels to export."
      onClose={onClose}
    >
      <div className="comparison-export-modal">
        <div className="comparison-export-actions">
          <button
            className="button button-secondary button-sm"
            type="button"
            onClick={() => onSelectionChange(new Set(visibleMetrics))}
          >
            Select all
          </button>
          <button
            className="button button-secondary button-sm"
            type="button"
            onClick={() => onSelectionChange(new Set())}
          >
            Clear
          </button>
        </div>
        <div className="comparison-metric-picker">
          {visibleMetrics.map((metric) => (
            <label className="toggle-control" key={metric}>
              <input
                checked={exportSelection.has(metric)}
                type="checkbox"
                onChange={() => {
                  onSelectionChange((prev) => {
                    const next = new Set(prev)
                    if (next.has(metric)) next.delete(metric)
                    else next.add(metric)
                    return next
                  })
                }}
              />
              {metric}
            </label>
          ))}
        </div>
        <div className="button-row comparison-export-footer">
          <Button
            disabled={!exportSelection.size || isExporting}
            onClick={() => onBulkExport('png')}
          >
            {isExporting ? 'Exporting…' : 'Export PNG'}
          </Button>
          <Button
            disabled={!exportSelection.size || isExporting}
            onClick={() => onBulkExport('svg')}
            variant="secondary"
          >
            {isExporting ? 'Exporting…' : 'Export SVG'}
          </Button>
        </div>
      </div>
    </Modal>
  )
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
  const [query, setQuery] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isMetricPickerOpen, setIsMetricPickerOpen] = useState(false)
  const [metricOrder, setMetricOrder] = useState([])
  const [panelSizes, setPanelSizes] = useState({})
  const [panelAxisLabels, setPanelAxisLabels] = useState({})
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [exportSelection, setExportSelection] = useState(new Set())
  const [isExporting, setIsExporting] = useState(false)

  const chartRefs = useRef({})

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

  // Keep metricOrder in sync with config.metrics when it changes externally
  useEffect(() => {
    setMetricOrder((prev) => {
      const prevSet = new Set(prev)
      const nextMetrics = config.metrics
      // Keep existing order for already-present metrics, append new ones
      const kept = prev.filter((m) => nextMetrics.includes(m))
      const added = nextMetrics.filter((m) => !prevSet.has(m))
      return [...kept, ...added]
    })
  }, [config.metrics])

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
  const orderedMetrics = metricOrder.length
    ? metricOrder.filter((m) => config.metrics.includes(m))
    : config.metrics
  const visibleMetrics = orderedMetrics.filter((metric) => metric.toLowerCase().includes(query.toLowerCase()))
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

  function handleReorderPanel(sourceMetric, targetMetric) {
    if (!sourceMetric || sourceMetric === targetMetric) return
    setMetricOrder((prev) => {
      const list = prev.length ? prev : [...config.metrics]
      const sourceIndex = list.indexOf(sourceMetric)
      const targetIndex = list.indexOf(targetMetric)
      if (sourceIndex < 0 || targetIndex < 0) return list
      const next = [...list]
      const [item] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, item)
      return next
    })
  }

  function handleResizePanel(metric, size) {
    setPanelSizes((prev) => ({ ...prev, [metric]: size }))
  }

  function handleToggleAxisLabel(metric, key, value) {
    setPanelAxisLabels((prev) => ({
      ...prev,
      [metric]: {
        ...(prev[metric] || {}),
        [key]: value,
      },
    }))
  }

  function handleChartReady(metric, chart) {
    if (chart) chartRefs.current[metric] = chart
    else delete chartRefs.current[metric]
  }

  function optionForMetric(metric) {
    const axisLabels = panelAxisLabels[metric] || {}
    const comparisonRuns = comparison?.runs || []
    const palette = runPaletteForRuns(comparisonRuns)
    const colorByRunId = new Map(comparisonRuns.map((run, index) => [run.id, palette[index]]))
    const series = buildMetricSeries(comparison, metric).map((item) => ({
      ...item,
      color: colorByRunId.get(item.runId),
    }))
    return buildChartOption({
      chartType: config.chartType,
      metric,
      yAxis: metric,
      xAxis: config.xAxis,
      title: metric,
      subtitle: `Showing ${series.length} of ${selectedRunIds.length} runs`,
      showTitle: false,
      xAxisLabel: metricLabel(config.xAxis),
      yAxisLabel: metric,
      showXAxisLabel: axisLabels.showXAxisLabel ?? false,
      showYAxisLabel: axisLabels.showYAxisLabel ?? false,
      showLegend: config.showLegend,
      showTooltip: config.showTooltip,
      smooth: Number(config.smoothing) > 0,
      lineWidth: 2,
      pointSize: config.chartType === 'scatter' ? 5 : 3,
      grid: { left: 56, right: 24, top: config.showLegend ? 42 : 18, bottom: 50 },
      palette,
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

  async function handleExportMetric(metric, format) {
    const chart = chartRefs.current[metric]
    const option = optionForMetric(metric)
    if (!chart || !option) return
    await exportChart({
      chart,
      option,
      format,
      filename: `${config.name || project.name}-${metric}`,
    })
  }

  async function handleBulkExport(format) {
    if (!exportSelection.size) return
    setIsExporting(true)
    const metrics = [...exportSelection]
    try {
      for (const metric of metrics) {
        await handleExportMetric(metric, format)
      }
    } catch (err) {
      setError(err.message || `Failed to export ${format.toUpperCase()}.`)
    } finally {
      setIsExporting(false)
    }
  }

  function openExportModal() {
    setExportSelection(new Set(visibleMetrics))
    setIsExportOpen(true)
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
      <ComparisonHeader
        bestRunName={bestRunName}
        bestValue={bestValue}
        canSave={Boolean(config.metrics.length)}
        isSaving={isSaving}
        onExportCharts={openExportModal}
        onExportJson={handleExportJson}
        onReset={onReset}
        onSave={handleSaveComparison}
        primaryMetric={primaryMetric}
        selectedRunCount={selectedRunIds.length}
      />
      <ComparisonToolbar
        onOpenMetricPicker={() => setIsMetricPickerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onQueryChange={setQuery}
        query={query}
      />
      <ComparisonStatusMessages error={error} isLoading={isLoading} sharedMetrics={sharedMetrics} />
      <ComparisonChartGrid
        getOption={optionForMetric}
        onChartReady={handleChartReady}
        onExportMetric={handleExportMetric}
        onReorderPanel={handleReorderPanel}
        onResizePanel={handleResizePanel}
        onToggleAxisLabel={handleToggleAxisLabel}
        panelAxisLabels={panelAxisLabels}
        panelSizes={panelSizes}
        primaryMetric={primaryMetric}
        visibleMetrics={visibleMetrics}
      />
      {visibleMetrics.length ? null : <EmptyState title="No panels match this filter." message="Clear the panel search or enable another comparison metric." />}

      {isSettingsOpen ? (
        <ComparisonSettingsDialog
          config={config}
          onApplyComparison={onApplyComparison}
          onChange={updateConfig}
          onClose={() => setIsSettingsOpen(false)}
          primaryMetric={primaryMetric}
          savedComparisons={savedComparisons}
          sharedMetrics={sharedMetrics}
        />
      ) : null}

      {isMetricPickerOpen ? (
        <MetricPickerDialog
          config={config}
          onClose={() => setIsMetricPickerOpen(false)}
          onToggleMetric={toggleMetric}
          selectedMetricSet={selectedMetricSet}
          sharedMetrics={sharedMetrics}
        />
      ) : null}

      {isExportOpen ? (
        <ExportDialog
          exportSelection={exportSelection}
          isExporting={isExporting}
          onBulkExport={handleBulkExport}
          onClose={() => setIsExportOpen(false)}
          onSelectionChange={setExportSelection}
          visibleMetrics={visibleMetrics}
        />
      ) : null}
    </section>
  )
}
