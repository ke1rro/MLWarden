import { Download } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { MetricChart } from './MetricChart.jsx'
import { PanelCard } from './PanelCard.jsx'
import { buildChartOption } from './chartOptions.js'

function normalizePanel(panel) {
  return typeof panel === 'string' ? { id: panel, metric: panel, size: 'md', type: 'line' } : panel
}

function ChartGridPanel({ panel, metricSeries, onChartReady, onExportPanel, onRemovePanel, onReorderPanel, onResizePanel }) {
  const metric = panel.metric || panel.config?.metric || panel.config?.yAxis
  const series = metricSeries[metric]
  const option = useMemo(() => buildChartOption({
    chartType: panel.type || panel.chartType || panel.config?.chartType || 'line',
    title: panel.title || metric,
    yAxis: panel.config?.yAxis || metric,
    yAxisLabel: panel.config?.yAxisLabel || metric,
    area: panel.area ?? panel.config?.area ?? metric?.includes('loss'),
    ...(panel.config || {}),
    showTitle: false,
  }, series), [metric, panel, series])

  const handleChartReady = useCallback((chart) => {
    onChartReady?.(panel.id, chart)
  }, [onChartReady, panel.id])

  return (
    <PanelCard
      actions={[
        { label: 'Export PNG', icon: Download, onSelect: () => onExportPanel?.(panel.id, 'png') },
        { label: 'Export SVG', icon: Download, onSelect: () => onExportPanel?.(panel.id, 'svg') },
      ]}
      draggable={Boolean(onReorderPanel)}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', panel.id)
      }}
      onDrop={(event) => {
        event.preventDefault()
        onReorderPanel?.(event.dataTransfer.getData('text/plain'), panel.id)
      }}
      onRemove={() => onRemovePanel(panel.id)}
      onResize={(size) => onResizePanel?.(panel.id, size)}
      size={panel.size || 'md'}
      title={panel.title || metric}
    >
      <MetricChart
        option={option}
        onReady={handleChartReady}
      />
    </PanelCard>
  )
}

export function ChartGrid({
  panels,
  metricSeries,
  onRemovePanel,
  onReorderPanel,
  onResizePanel,
  onExportPanel,
  onChartReady,
}) {
  return (
    <div className="chart-grid">
      {panels.map((panelConfig) => {
        const panel = normalizePanel(panelConfig)
        return (
          <ChartGridPanel
            key={panel.id}
            metricSeries={metricSeries}
            onChartReady={onChartReady}
            onExportPanel={onExportPanel}
            onRemovePanel={onRemovePanel}
            onReorderPanel={onReorderPanel}
            onResizePanel={onResizePanel}
            panel={panel}
          />
        )
      })}
    </div>
  )
}
