import { useEffect, useMemo, useRef, useState } from 'react'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { Button } from '@/components/common/Button.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { JsonPreview } from '@/components/common/JsonPreview.jsx'

export function LogViewer({ logs }) {
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const [clearedIds, setClearedIds] = useState(new Set())
  const viewerRef = useRef(null)

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        const logId = log.id || `${log.timestamp}-${log.message}`
        if (clearedIds.has(logId)) return false
        const logLevel = log.level || 'info'
        const matchesLevel = level === 'all' || logLevel === level
        const matchesQuery = `${log.timestampLabel} ${logLevel} ${log.message}`.toLowerCase().includes(query.toLowerCase())
        return matchesLevel && matchesQuery
      }),
    [clearedIds, level, logs, query],
  )

  useEffect(() => {
    if (autoScroll && viewerRef.current) {
      viewerRef.current.scrollTop = viewerRef.current.scrollHeight
    }
  }, [autoScroll, filteredLogs])

  function handleClear() {
    setClearedIds((current) => {
      const next = new Set(current)
      filteredLogs.forEach((log) => next.add(log.id || `${log.timestamp}-${log.message}`))
      return next
    })
  }

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
        <Button disabled={!filteredLogs.length} onClick={handleClear} variant="secondary">Clear</Button>
      </Toolbar>
      {!filteredLogs.length ? (
        <EmptyState title="No logs found." message="Worker log lines will appear here as they are appended." />
      ) : (
        <div className="log-viewer" data-autoscroll={autoScroll} ref={viewerRef}>
          {filteredLogs.map((log) => (
            <div className="log-row" data-search-text={`${log.timestampLabel} ${log.level} ${log.message}`} key={log.id || `${log.timestamp}-${log.message}`}>
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
