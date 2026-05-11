import { useMemo, useState } from 'react'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { Button } from '@/components/common/Button.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { JsonPreview } from '@/components/common/JsonPreview.jsx'

export function LogViewer({ logs }) {
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('all')
  const [autoScroll, setAutoScroll] = useState(true)

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        const logLevel = log.level || 'info'
        const matchesLevel = level === 'all' || logLevel === level
        const matchesQuery = `${log.timestampLabel} ${logLevel} ${log.message}`.toLowerCase().includes(query.toLowerCase())
        return matchesLevel && matchesQuery
      }),
    [level, logs, query],
  )

  return (
    <section className="workspace-stack">
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search logs" />
        <select value={level} onChange={(event) => setLevel(event.target.value)}>
          <option value="all">All levels</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
        <label className="toggle-control">
          <input checked={autoScroll} onChange={(event) => setAutoScroll(event.target.checked)} type="checkbox" />
          Auto-scroll
        </label>
        <Button variant="secondary">Clear</Button>
      </Toolbar>
      {!filteredLogs.length ? (
        <EmptyState title="No logs found." message="Worker log lines will appear here as they are appended." />
      ) : (
        <div className="log-viewer" data-autoscroll={autoScroll}>
          {filteredLogs.map((log) => (
            <div className="log-row" key={log.id || `${log.timestamp}-${log.message}`}>
              <time>{log.timestampLabel}</time>
              <span className={`log-level ${log.level}`}>{log.level.toUpperCase()}</span>
              <span>{log.message}</span>
              <JsonPreview value={log.context} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}