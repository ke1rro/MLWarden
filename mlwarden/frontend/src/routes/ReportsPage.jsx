import { FileText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadWorkspaceSnapshot } from '@/api/workspace.js'
import { Button } from '@/components/common/Button.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { saveTextFile } from '@/shared/downloads.js'

export default function ReportsPage() {
  const [snapshot, setSnapshot] = useState(null)
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    loadWorkspaceSnapshot({ includeArtifacts: true })
      .then((data) => {
        if (!cancelled) setSnapshot(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load reports.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const reports = useMemo(() => snapshot?.reports || [], [snapshot])
  const filteredReports = useMemo(
    () => reports.filter((report) => `${report.title} ${report.description} ${report.projectName} ${report.runName || ''}`.toLowerCase().includes(query.toLowerCase())),
    [query, reports],
  )

  function handleDownloadWorkspaceReport() {
    const body = {
      generated_at: new Date().toISOString(),
      projects: snapshot?.projects?.length || 0,
      runs: snapshot?.runs?.length || 0,
      charts: snapshot?.charts?.length || 0,
      artifacts: snapshot?.artifacts?.length || 0,
      reports,
    }
    saveTextFile(JSON.stringify(body, null, 2), 'mlwarden-workspace-report.json', 'application/json')
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'MLWarden', to: '/projects' }, { label: 'Reports' }]}>
      <PageHeader
        title="Reports"
        subtitle="Generated frontend reports from existing projects, runs, metrics, charts, and artifacts."
        actions={<Button disabled={!snapshot} onClick={handleDownloadWorkspaceReport} variant="secondary">Download workspace report</Button>}
      />
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search reports" />
      </Toolbar>
      {isLoading ? <LoadingState message="Loading reports..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!isLoading && !error && !reports.length ? <EmptyState title="No report data yet." message="Create projects and runs to generate reports." /> : null}
      {!isLoading && !error && reports.length ? (
        <div className="card-grid">
          {filteredReports.map((report) => (
            <Link
              className="summary-card report-card"
              data-search-text={`${report.title} ${report.description} ${report.projectName} ${report.runName || ''}`}
              key={report.id}
              to={report.to}
            >
              <FileText size={18} />
              <strong>{report.title}</strong>
              <span>{report.description}</span>
              <div className="mini-metric-row">
                {report.metrics.map(([label, value]) => (
                  <small key={label}><b>{value}</b> {label}</small>
                ))}
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </AppLayout>
  )
}
