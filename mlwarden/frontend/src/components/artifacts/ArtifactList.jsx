import { useMemo, useState } from 'react'
import { AssetUploadForm } from '@/components/common/AssetUploadForm.jsx'
import { Button } from '@/components/common/Button.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { MetadataModal } from '@/components/common/MetadataModal.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { ArtifactTable } from './ArtifactTable.jsx'

const artifactUploadFields = [
  { name: 'name', label: 'Name' },
  { name: 'artifactPath', label: 'Artifact path', placeholder: 'checkpoints/model.pt' },
]

export function ArtifactList({ artifacts, onUpload, onDownload }) {
  const [query, setQuery] = useState('')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedMetadata, setSelectedMetadata] = useState(null)
  const filteredArtifacts = useMemo(
    () => artifacts.filter((artifact) => `${artifact.name} ${artifact.path} ${artifact.contentType}`.toLowerCase().includes(query.toLowerCase())),
    [artifacts, query],
  )

  return (
    <section className="workspace-stack">
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search artifacts" />
        {onUpload ? <Button onClick={() => setIsUploadOpen((current) => !current)} variant="secondary">Upload artifact</Button> : null}
      </Toolbar>
      {isUploadOpen ? (
        <AssetUploadForm
          fields={artifactUploadFields}
          fileLabel="Artifact file"
          metadataPlaceholder='{"epoch": 3}'
          onUpload={onUpload}
          submitLabel="Upload artifact"
        />
      ) : null}
      {!artifacts.length ? <EmptyState title="No artifacts uploaded." message="Checkpoints, reports, CSV files, and ZIP bundles will appear here." /> : null}
      <ArtifactTable
        artifacts={filteredArtifacts}
        onDownload={onDownload}
        onViewMetadata={(artifact) => setSelectedMetadata({ title: `${artifact.name} metadata`, value: artifact.metadata })}
      />
      {selectedMetadata ? (
        <MetadataModal title={selectedMetadata.title} value={selectedMetadata.value} onClose={() => setSelectedMetadata(null)} />
      ) : null}
    </section>
  )
}
