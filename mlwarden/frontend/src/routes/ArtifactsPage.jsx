import { ArtifactTable } from '@/components/artifacts/ArtifactTable.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { MetadataModal } from '@/components/common/MetadataModal.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { useArtifactsWorkspace } from '@/hooks/useArtifactsWorkspace.js'

export default function ArtifactsPage() {
  const workspace = useArtifactsWorkspace()

  return (
    <AppLayout
      breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: 'Artifacts' }]}
      title="Artifacts"
      subtitle="All run artifacts across local projects."
    >
      <Toolbar>
        <SearchInput value={workspace.query} onChange={workspace.setQuery} placeholder="Search artifacts" />
      </Toolbar>
      {workspace.isLoading ? <LoadingState message="Loading artifacts..." /> : null}
      {workspace.error ? <ErrorState message={workspace.error} /> : null}
      {!workspace.isLoading && !workspace.error && !workspace.artifacts.length ? <EmptyState title="No artifacts uploaded." message="Upload artifacts from a worker run or the run artifact tab." /> : null}
      {!workspace.isLoading && !workspace.error && workspace.artifacts.length ? (
        <ArtifactTable
          artifacts={workspace.filteredArtifacts}
          compactActions
          onDownload={workspace.download}
          onViewMetadata={workspace.viewMetadata}
          showProjectColumns
          showTechnicalColumns={false}
        />
      ) : null}
      {workspace.selectedMetadata ? (
        <MetadataModal title={workspace.selectedMetadata.title} value={workspace.selectedMetadata.value} onClose={() => workspace.setSelectedMetadata(null)} />
      ) : null}
    </AppLayout>
  )
}
