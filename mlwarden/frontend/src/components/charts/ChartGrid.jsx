import { Download, Eye, EyeOff } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { MetricChart } from './MetricChart.jsx'
import { PanelCard } from './PanelCard.jsx'
import { buildChartOption } from './chartOptions.js'

function normalizePanel(panel) {
  return typeof panel === 'string' ? { id: panel, metric: panel, size: 'md', type: 'line' } : panel
}

function ChartGridPanel({ panel, metricSeries, defaultColor, onChartReady, onExportPanel, onRemovePanel, onReorderPanel, onResizePanel, onUpdatePanelConfig }) {
  const metric = panel.metric || panel.config?.metric || panel.config?.yAxis
  const series = metricSeries[metric]
  const showXAxisLabel = panel.config?.showXAxisLabel ?? panel.config?.showXAxis ?? false
  const showYAxisLabel = panel.config?.showYAxisLabel ?? panel.config?.showYAxis ?? false
  const option = useMemo(() => buildChartOption({
    chartType: panel.type || panel.chartType || panel.config?.chartType || 'line',
    title: panel.title || metric,
    yAxis: panel.config?.yAxis || metric,
    yAxisLabel: panel.config?.yAxisLabel || metric,
    area: panel.area ?? panel.config?.area ?? metric?.includes('loss'),
    color: panel.config?.color || defaultColor,
    ...(panel.config || {}),
    showTitle: false,
  }, series), [defaultColor, metric, panel, series])

  const handleChartReady = useCallback((chart) => {
    onChartReady?.(panel.id, chart)
  }, [onChartReady, panel.id])

  return (
    <PanelCard
      actions={[
        {
          label: showXAxisLabel ? 'Hide x-axis label' : 'Show x-axis label',
          icon: showXAxisLabel ? EyeOff : Eye,
          onSelect: () => onUpdatePanelConfig?.(panel.id, { showXAxisLabel: !showXAxisLabel }),
        },
        {
          label: showYAxisLabel ? 'Hide y-axis label' : 'Show y-axis label',
          icon: showYAxisLabel ? EyeOff : Eye,
          onSelect: () => onUpdatePanelConfig?.(panel.id, { showYAxisLabel: !showYAxisLabel }),
        },
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
  defaultColor,
  onRemovePanel,
  onReorderPanel,
  onResizePanel,
  onUpdatePanelConfig,
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
            defaultColor={defaultColor}
            metricSeries={metricSeries}
            onChartReady={onChartReady}
            onExportPanel={onExportPanel}
            onRemovePanel={onRemovePanel}
            onReorderPanel={onReorderPanel}
            onResizePanel={onResizePanel}
            onUpdatePanelConfig={onUpdatePanelConfig}
            panel={panel}
          />
        )
      })}
    </div>
  )
}
