import { MetricCard } from '@/components/common/MetricCard.jsx'
import { JsonPreview } from '@/components/common/JsonPreview.jsx'

function formatTableNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value
  if (Number.isInteger(value)) return value
  return Number(value.toPrecision(6))
}

export function RunOverview({ run, metricSummaries }) {
  const primarySummary = metricSummaries.find((summary) => summary.name.toLowerCase().includes('best')) || metricSummaries[0]
  const primaryValue = primarySummary ? (primarySummary.max ?? primarySummary.latest ?? 'n/a') : 'n/a'

  return (
    <div className="overview-grid">
      <section className="panel">
        <h2>Run summary</h2>
        <div className="metric-grid compact">
          <MetricCard label="Status" value={run.status} detail={run.duration} />
          <MetricCard label={primarySummary?.name || 'Metric'} value={primaryValue} detail={primarySummary ? 'best observed' : 'not logged'} />
          <MetricCard label="Final loss" value={run.finalLoss ?? 'n/a'} detail="latest" />
        </div>
        <h3>Parameters</h3>
        <dl className="kv-list">
          {Object.entries(run.params).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <h3>Tags</h3>
        <div className="tag-row">
          {run.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
        </div>
      </section>
      <section className="panel">
        <h2>Metric summary</h2>
        <div className="table-shell tight">
          <table className="data-table">
            <thead>
              <tr><th>Metric</th><th>Latest</th><th>Min</th><th>Max</th><th>Count</th></tr>
            </thead>
            <tbody>
              {metricSummaries.map((summary) => (
                <tr key={summary.name}>
                  <td>{summary.name}</td>
                  <td title={String(summary.latest)}>{formatTableNumber(summary.latest)}</td>
                  <td title={String(summary.min)}>{formatTableNumber(summary.min)}</td>
                  <td title={String(summary.max)}>{formatTableNumber(summary.max)}</td>
                  <td>{summary.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>Notes</h3>
        <p className="notes">{run.notes}</p>
        <h3>Worker metadata</h3>
        <JsonPreview value={run.metadata} />
      </section>
    </div>
  )
}
