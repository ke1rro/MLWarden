import { MetricCard } from '@/components/common/MetricCard.jsx'
import { JsonPreview } from '@/components/common/JsonPreview.jsx'

export function RunOverview({ run, metricSeries }) {
  const summaries = Object.entries(metricSeries).slice(0, 5).map(([name, points]) => {
    const values = points.map((point) => point.value)
    return {
      name,
      latest: values.at(-1),
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    }
  })

  return (
    <div className="overview-grid">
      <section className="panel">
        <h2>Run summary</h2>
        <div className="metric-grid compact">
          <MetricCard label="Status" value={run.status} detail={run.duration} />
          <MetricCard label="Best PSNR" value={run.bestPsnr ?? 'n/a'} detail="validation" />
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
              {summaries.map((summary) => (
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
        <h3>Notes</h3>
        <p className="notes">{run.notes}</p>
        <h3>Worker metadata</h3>
        <JsonPreview value={run.metadata} />
      </section>
    </div>
  )
}
