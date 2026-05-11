import { useState } from 'react'
import { Button } from '../common/Button.jsx'
import { JsonPreview } from '../common/JsonPreview.jsx'
import { EmptyState } from '../common/EmptyState.jsx'

const pageSize = 3

export function DataTable({ tables }) {
  const [selectedName, setSelectedName] = useState(tables[0]?.name || '')
  const [page, setPage] = useState(0)
  const selectedTable = tables.find((table) => table.name === selectedName)

  const rows = selectedTable?.rows || []
  const columns = Object.keys(rows[0] || {})
  const pageRows = rows.slice(page * pageSize, page * pageSize + pageSize)
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))

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
            <span>{table.rows.length} rows</span>
          </button>
        ))}
      </aside>
      <div className="panel table-panel">
        <header className="section-header">
          <div>
            <h2>{selectedTable.name}</h2>
            <p>Columns are inferred from mock worker-reported JSON rows.</p>
          </div>
          <Button variant="secondary">Download CSV</Button>
        </header>
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
