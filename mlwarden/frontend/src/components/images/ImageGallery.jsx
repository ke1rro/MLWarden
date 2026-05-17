import { useEffect, useMemo, useState } from 'react'
import { AssetUploadForm } from '@/components/common/AssetUploadForm.jsx'
import { Button } from '@/components/common/Button.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { JsonPreview } from '@/components/common/JsonPreview.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'

const imageUploadFields = [
  { name: 'name', label: 'Name' },
  { name: 'step', label: 'Step', min: '0', type: 'number' },
  { name: 'caption', label: 'Caption' },
]

export function ImageGallery({ images, getImageUrl, onUpload }) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('all')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imageUrls, setImageUrls] = useState({})
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  const groups = ['all', ...new Set(images.map((image) => image.group))]
  const filteredImages = useMemo(
    () =>
      images.filter((image) => {
        const matchesGroup = group === 'all' || image.group === group
        const matchesQuery = `${image.name} ${image.caption} ${image.step} ${image.split}`.toLowerCase().includes(query.toLowerCase())
        return matchesGroup && matchesQuery
      }),
    [group, images, query],
  )

  useEffect(() => {
    if (!getImageUrl || !images.length) {
      return undefined
    }

    let cancelled = false
    const objectUrls = []

    Promise.all(
      images.map(async (image) => {
        const url = await getImageUrl(image.id)
        objectUrls.push(url)
        return [image.id, url]
      }),
    )
      .then((entries) => {
        if (!cancelled) setImageUrls(Object.fromEntries(entries))
      })
      .catch(() => {
        if (!cancelled) setImageUrls({})
      })

    return () => {
      cancelled = true
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [getImageUrl, images])

  return (
    <section className="workspace-stack">
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Filter by image name, step, or split" />
        <select value={group} onChange={(event) => setGroup(event.target.value)}>
          {groups.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        {onUpload ? <Button onClick={() => setIsUploadOpen((current) => !current)} variant="secondary">Upload image</Button> : null}
      </Toolbar>
      {isUploadOpen ? (
        <AssetUploadForm
          fields={imageUploadFields}
          fileAccept="image/png,image/jpeg,image/webp"
          fileLabel="Image file"
          metadataPlaceholder='{"split": "validation"}'
          onUpload={onUpload}
          submitLabel="Upload image"
        />
      ) : null}
      {!images.length ? <EmptyState title="No images uploaded." message="Input previews, reconstructions, and masks will appear here." /> : null}
      <div className="image-grid">
        {filteredImages.map((image, index) => (
          <button className="image-card" data-search-text={`${image.name} ${image.caption} ${image.step} ${image.split}`} key={image.id} onClick={() => setSelectedImage(image)} type="button">
            {imageUrls[image.id] ? <img alt={image.name} src={imageUrls[image.id]} /> : <span className={`image-placeholder image-${index % 4}`} />}
            <strong>{image.name}</strong>
            <small>step {image.step} · {image.size}</small>
            <p>{image.caption}</p>
          </button>
        ))}
      </div>
      {selectedImage ? (
        <div className="modal-backdrop" onClick={() => setSelectedImage(null)} role="presentation">
          <div className="image-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            {imageUrls[selectedImage.id] ? <img alt={selectedImage.name} src={imageUrls[selectedImage.id]} /> : <span className="image-placeholder image-large" />}
            <h2>{selectedImage.name}</h2>
            <p>{selectedImage.caption}</p>
            <JsonPreview value={selectedImage.metadata} />
            <Button onClick={() => setSelectedImage(null)} variant="secondary">Close</Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
