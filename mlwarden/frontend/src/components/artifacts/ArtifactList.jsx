import { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/common/Button.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { MetadataModal } from '@/components/common/MetadataModal.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { ArtifactTable } from './ArtifactTable.jsx'

function ArtifactUploadForm({ onUpload }) {
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [artifactPath, setArtifactPath] = useState('')
  const [metadata, setMetadata] = useState('')
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  async function handleSubmit(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    setError('')
    if (!file) {
      setError('Choose an artifact file.')
      return
    }

    let parsedMetadata
    try {
      parsedMetadata = metadata.trim() ? JSON.parse(metadata) : undefined
    } catch {
      setError('Metadata is not valid JSON.')
      return
    }

    try {
      setIsUploading(true)
      await onUpload({
        file,
        name,
        artifactPath,
        metadata: parsedMetadata,
      })
      setFile(null)
      setName('')
      setArtifactPath('')
      setMetadata('')
      formElement.reset()
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError(err.message || 'Artifact upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form className="panel inline-form" onSubmit={handleSubmit}>
      <label>
        File
        <input ref={fileInputRef} onChange={(event) => setFile(event.target.files?.[0] || null)} type="file" />
      </label>
      <label>
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Artifact path
        <input placeholder="checkpoints/model.pt" value={artifactPath} onChange={(event) => setArtifactPath(event.target.value)} />
      </label>
      <label>
        Metadata JSON
        <input placeholder='{"epoch": 3}' value={metadata} onChange={(event) => setMetadata(event.target.value)} />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <Button disabled={isUploading} type="submit">{isUploading ? 'Uploading...' : 'Upload artifact'}</Button>
    </form>
  )
}

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
      {isUploadOpen ? <ArtifactUploadForm onUpload={onUpload} /> : null}
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
