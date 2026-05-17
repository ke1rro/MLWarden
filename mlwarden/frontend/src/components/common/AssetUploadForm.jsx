import { useRef, useState } from 'react'
import { Button } from '@/components/common/Button.jsx'

function initialValues(fields) {
  return Object.fromEntries(fields.map((field) => [field.name, field.defaultValue || '']))
}

export function AssetUploadForm({
  fields,
  fileAccept,
  fileLabel = 'File',
  metadataPlaceholder = '{"key": "value"}',
  onUpload,
  submitLabel,
}) {
  const [file, setFile] = useState(null)
  const [values, setValues] = useState(() => initialValues(fields))
  const [metadata, setMetadata] = useState('')
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  function updateValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    setError('')
    if (!file) {
      setError(`Choose ${fileLabel.toLowerCase()}.`)
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
        ...values,
        file,
        metadata: parsedMetadata,
      })
      setFile(null)
      setValues(initialValues(fields))
      setMetadata('')
      formElement.reset()
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError(err.message || 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form className="panel inline-form" onSubmit={handleSubmit}>
      <label>
        {fileLabel}
        <input ref={fileInputRef} accept={fileAccept} onChange={(event) => setFile(event.target.files?.[0] || null)} type="file" />
      </label>
      {fields.map((field) => (
        <label key={field.name}>
          {field.label}
          <input
            min={field.min}
            placeholder={field.placeholder}
            type={field.type || 'text'}
            value={values[field.name] || ''}
            onChange={(event) => updateValue(field.name, event.target.value)}
          />
        </label>
      ))}
      <label>
        Metadata JSON
        <input placeholder={metadataPlaceholder} value={metadata} onChange={(event) => setMetadata(event.target.value)} />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <Button disabled={isUploading} type="submit">{isUploading ? 'Uploading...' : submitLabel}</Button>
    </form>
  )
}
