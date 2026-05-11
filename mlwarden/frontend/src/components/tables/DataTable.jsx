import { useEffect, useState } from 'react'
import { Button } from '@/components/common/Button.jsx'
import { JsonPreview } from '@/components/common/JsonPreview.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'

const pageSize = 3

export function DataTable({ tables, loadTableRows }) {
  const [selectedName, setSelectedName] = useState(tables[0]?.name || '')
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState([])
  const [totalRows, setTotalRows] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const selectedTable = tables.find((table) => table.name === selectedName)

  const columns = Object.keys(rows[0] || {})
  const pageRows = loadTableRows ? rows : rows.slice(page * pageSize, page * pageSize + pageSize)
  const pageCount = Math.max(1, Math.ceil((loadTableRows ? totalRows : rows.length) / pageSize))

  useEffect(() => {
    if (!selectedName && tables[0]?.name) {
      setSelectedName(tables[0].name)
    }
  }, [selectedName, tables])

  useEffect(() => {
    if (!selectedTable) return undefined
    let cancelled = false

    async function loadRows() {
      setIsLoading(Boolean(loadTableRows))
      setError('')
      try {
        if (loadTableRows) {
          const result = await loadTableRows(selectedTable.name, { limit: pageSize, offset: page * pageSize })
          if (!cancelled) {
            setRows(result.rows)
            setTotalRows(result.total)
          }
        } else {
          setRows(selectedTable.rows || [])
          setTotalRows((selectedTable.rows || []).length)
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load table rows.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadRows()
    return () => {
      cancelled = true
    }
  }, [loadTableRows, page, selectedName, selectedTable])

  if (!tables.length) {
    return <EmptyState title="No tables logged yet." message="Validation results and workflow tables will appear here." />
  }

  return (
    <section className="table-workspace">
      <aside className="table-selector">
        <strong>Tables</strong>
        {tables.map((table) => (
          <button className={table.name === selectedName ? 'is-active' : ''} key={table.name} onClick={() => { setSelectedName(table.name); setPage(0) }} type="button">
            {table.name}
            <span>{table.rowCount ?? table.rows?.length ?? 0} rows</span>
          </button>
        ))}
      </aside>
      <div className="panel table-panel">
        <header className="section-header">
          <div>
            <h2>{selectedTable?.name}</h2>
            <p>Rows are loaded from backend worker-reported JSON data.</p>
          </div>
          <Button variant="secondary">Download CSV</Button>
        </header>
        {isLoading ? <LoadingState message="Loading table rows..." /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!isLoading && !error && !rows.length ? <EmptyState title="No rows in this table." message="Append rows from a worker to populate this table." /> : null}
        <div className="table-shell">
          <table className="data-table sticky">
            <thead>
              <tr>
                {columns.map((column) => <th key={column}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, rowIndex) => (
                <tr key={`${selectedName}-${rowIndex}`}>
                  {columns.map((column) => (
                    <td className="truncate-cell" key={column}>
                      {typeof row[column] === 'object' ? <JsonPreview value={row[column]} /> : row[column]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="pagination">
          <Button disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} variant="secondary">Previous</Button>
          <span>Page {page + 1} of {pageCount}</span>
          <Button disabled={page + 1 >= pageCount} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} variant="secondary">Next</Button>
        </footer>
      </div>
    </section>
  )
}
