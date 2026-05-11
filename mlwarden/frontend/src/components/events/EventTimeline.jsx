import { EmptyState } from '@/components/common/EmptyState.jsx'
import { JsonPreview } from '@/components/common/JsonPreview.jsx'

export function EventTimeline({ events }) {
  if (!events.length) {
    return <EmptyState title="No run events yet." message="Timeline events will be recorded when workers report activity." />
  }

  return (
    <ol className="event-timeline">
      {events.map((event) => (
        <li key={event.id}>
          <span className="timeline-dot" />
          <time>{event.timestampLabel || event.timestamp}</time>
          <strong>{event.type}</strong>
          <JsonPreview value={event.payload} />
        </li>
      ))}
    </ol>
  )
}
