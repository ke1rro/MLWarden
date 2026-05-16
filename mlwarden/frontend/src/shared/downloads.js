function getExtension(filename) {
  const match = filename.match(/\.([^.]+)$/)
  return match?.[1] || ''
}

function buildPickerTypes(filename, mimeType) {
  const extension = getExtension(filename)
  if (!extension || !mimeType) return []
  return [
    {
      description: `${extension.toUpperCase()} file`,
      accept: { [mimeType]: [`.${extension}`] },
    },
  ]
}

export async function saveBlob(blob, filename, mimeType = blob.type || 'application/octet-stream') {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: buildPickerTypes(filename, mimeType),
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (error) {
      if (error?.name === 'AbortError') return
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',')
  const mimeType = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream'
  if (!header.includes(';base64')) {
    return new Blob([decodeURIComponent(data)], { type: mimeType })
  }
  const binary = atob(data)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new Blob([bytes], { type: mimeType })
}

export function saveTextFile(text, filename, mimeType = 'text/plain;charset=utf-8') {
  return saveBlob(new Blob([text], { type: mimeType }), filename, mimeType)
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function rowsToCsv(rows) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row || {})))]
  if (!columns.length) return ''
  return [
    columns.map(escapeCsvValue).join(','),
    ...rows.map((row) => columns.map((column) => escapeCsvValue(row?.[column])).join(',')),
  ].join('\n')
}
