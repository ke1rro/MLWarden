import { MetricChart } from './MetricChart.jsx'
import { PanelCard } from './PanelCard.jsx'

export function ChartGrid({ panels, metricSeries, onRemovePanel }) {
  return (
    <div className="chart-grid">
      {panels.map((panel) => (
        <PanelCard key={panel} title={panel} onRemove={() => onRemovePanel(panel)}>
          <MetricChart title={panel} series={metricSeries[panel]} area={panel.includes('loss')} />
        </PanelCard>
      ))}
    </div>
  )
}
