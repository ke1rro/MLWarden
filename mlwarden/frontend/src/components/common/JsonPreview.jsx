import { useState } from 'react'

export function JsonPreview({ value }) {
  const [expanded, setExpanded] = useState(false)
  const json = JSON.stringify(value ?? {}, null, 2)

  return (
    <button className="json-preview" type="button" onClick={() => setExpanded((current) => !current)}>
      <span>{expanded ? json : json.replace(/\s+/g, ' ').slice(0, 64)}</span>
    </button>
  )
}
