function formatMetricValue(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value
  if (Number.isInteger(value)) return value
  if (Math.abs(value) >= 100) return value.toFixed(1)
  if (Math.abs(value) >= 10) return value.toFixed(2)
  if (Math.abs(value) >= 1) return value.toFixed(3)
  return value.toFixed(4)
}

export function MetricCard({ label, value, detail }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong title={typeof value === 'number' ? String(value) : undefined}>{formatMetricValue(value)}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  )
}
