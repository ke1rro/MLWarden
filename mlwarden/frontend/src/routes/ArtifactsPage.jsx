import { useEffect, useMemo, useState } from 'react'
import { downloadArtifact } from '@/api/artifacts.js'
import { loadAllArtifacts, loadAllRuns, loadProjects } from '@/api/workspace.js'
import { ArtifactTable } from '@/components/artifacts/ArtifactTable.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { MetadataModal } from '@/components/common/MetadataModal.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'

export default function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState([])
  const [selectedMetadata, setSelectedMetadata] = useState(null)
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    loadProjects()
      .then(async (projects) => {
        const runs = await loadAllRuns(projects)
        return loadAllArtifacts(projects, runs)
      })
      .then((nextArtifacts) => {
        if (!cancelled) setArtifacts(nextArtifacts)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load artifacts.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const filteredArtifacts = useMemo(
    () => artifacts.filter((artifact) => `${artifact.name} ${artifact.path} ${artifact.projectName} ${artifact.runName} ${artifact.contentType}`.toLowerCase().includes(query.toLowerCase())),
    [artifacts, query],
  )

  async function handleDownload(artifact) {
    await downloadArtifact(artifact.id, artifact.original_filename || artifact.name)
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: 'Artifacts' }]}>
      <PageHeader title="Artifacts" subtitle="All run artifacts across local projects." />
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search artifacts" />
      </Toolbar>
      {isLoading ? <LoadingState message="Loading artifacts..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!isLoading && !error && !artifacts.length ? <EmptyState title="No artifacts uploaded." message="Upload artifacts from a worker run or the run artifact tab." /> : null}
      {!isLoading && !error && artifacts.length ? (
        <ArtifactTable
          artifacts={filteredArtifacts}
          compactActions
          onDownload={handleDownload}
          onViewMetadata={(artifact) => setSelectedMetadata({ title: `${artifact.name} metadata`, value: artifact.metadata })}
          showProjectColumns
          showTechnicalColumns={false}
        />
      ) : null}
      {selectedMetadata ? (
        <MetadataModal title={selectedMetadata.title} value={selectedMetadata.value} onClose={() => setSelectedMetadata(null)} />
      ) : null}
    </AppLayout>
  )
}
