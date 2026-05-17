import { Download, Eye, EyeOff, Settings, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/common/Button.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { IconButton } from '@/components/common/IconButton.jsx'
import { Modal } from '@/components/common/Modal.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { PanelCard } from '@/components/charts/PanelCard.jsx'
import { MetricChart } from '@/components/charts/MetricChart.jsx'
import { useRunComparisonWorkspace } from '@/hooks/useRunComparisonWorkspace.js'

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
  const comparison = useRunComparisonWorkspace({
    activeComparison,
    onSaved,
    project,
    selectedRunIds,
    sharedMetrics,
  })

  if (selectedRunIds.length < 2) {
    return <EmptyState title="Select at least two runs to create a comparison." message="Use the run selector to build a combined view." />
  }

  return (
    <section className="run-comparison-workspace">
      <ComparisonHeader
        bestRunName={comparison.bestRunName}
        bestValue={comparison.bestValue}
        canSave={Boolean(comparison.config.metrics.length)}
        isSaving={comparison.isSaving}
        onExportCharts={comparison.openExportModal}
        onExportJson={comparison.exportJson}
        onReset={onReset}
        onSave={comparison.saveComparison}
        primaryMetric={comparison.primaryMetric}
        selectedRunCount={selectedRunIds.length}
      />
      <ComparisonToolbar
        onOpenMetricPicker={() => comparison.setIsMetricPickerOpen(true)}
        onOpenSettings={() => comparison.setIsSettingsOpen(true)}
        onQueryChange={comparison.setQuery}
        query={comparison.query}
      />
      <ComparisonStatusMessages error={comparison.error} isLoading={comparison.isLoading} sharedMetrics={sharedMetrics} />
      <ComparisonChartGrid
        getOption={comparison.optionForMetric}
        onChartReady={comparison.chartReady}
        onExportMetric={comparison.exportMetric}
        onReorderPanel={comparison.reorderPanel}
        onResizePanel={comparison.resizePanel}
        onToggleAxisLabel={comparison.toggleAxisLabel}
        panelAxisLabels={comparison.panelAxisLabels}
        panelSizes={comparison.panelSizes}
        primaryMetric={comparison.primaryMetric}
        visibleMetrics={comparison.visibleMetrics}
      />
      {comparison.visibleMetrics.length ? null : <EmptyState title="No panels match this filter." message="Clear the panel search or enable another comparison metric." />}

      {comparison.isSettingsOpen ? (
        <ComparisonSettingsDialog
          config={comparison.config}
          onApplyComparison={onApplyComparison}
          onChange={comparison.updateConfig}
          onClose={() => comparison.setIsSettingsOpen(false)}
          primaryMetric={comparison.primaryMetric}
          savedComparisons={savedComparisons}
          sharedMetrics={sharedMetrics}
        />
      ) : null}

      {comparison.isMetricPickerOpen ? (
        <MetricPickerDialog
          config={comparison.config}
          onClose={() => comparison.setIsMetricPickerOpen(false)}
          onToggleMetric={comparison.toggleMetric}
          selectedMetricSet={comparison.selectedMetricSet}
          sharedMetrics={sharedMetrics}
        />
      ) : null}

      {comparison.isExportOpen ? (
        <ExportDialog
          exportSelection={comparison.exportSelection}
          isExporting={comparison.isExporting}
          onBulkExport={comparison.bulkExport}
          onClose={() => comparison.setIsExportOpen(false)}
          onSelectionChange={comparison.setExportSelection}
          visibleMetrics={comparison.visibleMetrics}
        />
      ) : null}
    </section>
  )
}
