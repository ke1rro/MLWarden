import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/common/Button.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { JsonPreview } from '@/components/common/JsonPreview.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'

function ImageUploadForm({ onUpload }) {
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [step, setStep] = useState('')
  const [caption, setCaption] = useState('')
  const [metadata, setMetadata] = useState('')
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!file) {
      setError('Choose an image file.')
      return
    }

    try {
      setIsUploading(true)
      await onUpload({
        file,
        name,
        step,
        caption,
        metadata: metadata.trim() ? JSON.parse(metadata) : undefined,
      })
      setFile(null)
      setName('')
      setStep('')
      setCaption('')
      setMetadata('')
      event.currentTarget.reset()
    } catch (err) {
      setError(err.message || 'Image upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form className="panel inline-form" onSubmit={handleSubmit}>
      <label>
        File
        <input accept="image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} type="file" />
      </label>
      <label>
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Step
        <input min="0" value={step} onChange={(event) => setStep(event.target.value)} type="number" />
      </label>
      <label>
        Caption
        <input value={caption} onChange={(event) => setCaption(event.target.value)} />
      </label>
      <label>
        Metadata JSON
        <input placeholder='{"split": "validation"}' value={metadata} onChange={(event) => setMetadata(event.target.value)} />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <Button disabled={isUploading} type="submit">{isUploading ? 'Uploading...' : 'Upload image'}</Button>
    </form>
  )
}

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
      {isUploadOpen ? <ImageUploadForm onUpload={onUpload} /> : null}
      {!images.length ? <EmptyState title="No images uploaded." message="Input previews, reconstructions, and masks will appear here." /> : null}
      <div className="image-grid">
        {filteredImages.map((image, index) => (
          <button className="image-card" key={image.id} onClick={() => setSelectedImage(image)} type="button">
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
