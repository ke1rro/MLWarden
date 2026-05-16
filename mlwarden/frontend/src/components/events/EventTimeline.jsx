import { EmptyState } from '@/components/common/EmptyState.jsx'
import { JsonPreview } from '@/components/common/JsonPreview.jsx'

export function EventTimeline({ events }) {
  if (!events.length) {
    return <EmptyState title="No run events yet." message="Timeline events will be recorded when workers report activity." />
  }
  const newestFirst = [...events].reverse()

  return (
    <ol className="event-timeline">
      {newestFirst.map((event) => (
        <li data-search-text={`${event.type} ${JSON.stringify(event.payload)}`} key={event.id}>
          <span className="timeline-dot" />
          <time>{event.timestampLabel || event.timestamp}</time>
          <strong>{event.type}</strong>
          <JsonPreview value={event.payload} />
        </li>
      ))}
    </ol>
  )
}
