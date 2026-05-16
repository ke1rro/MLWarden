export const AUTH_STORAGE_KEY = 'mlwarden.auth'

const DEV_FALLBACK_API = 'http://localhost:8000'
const DEV_FALLBACK_WS = 'ws://localhost:8000'

const hasApiEnv = Object.prototype.hasOwnProperty.call(import.meta.env, 'VITE_API_BASE_URL')
const hasWsEnv = Object.prototype.hasOwnProperty.call(import.meta.env, 'VITE_WS_BASE_URL')

export const API_BASE_URL = (hasApiEnv ? import.meta.env.VITE_API_BASE_URL : DEV_FALLBACK_API).replace(
  /\/$/,
  '',
)
export const WS_BASE_URL = (hasWsEnv ? import.meta.env.VITE_WS_BASE_URL : DEV_FALLBACK_WS).replace(
  /\/$/,
  '',
)

export class ApiClientError extends Error {
  constructor(message, { status = 0, code = 'request_error', details = {} } = {}) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function readAuthState() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeAuthState(value) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value))
}

export function clearAuthState() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getAccessToken() {
  return readAuthState()?.access_token || null
}

export function buildQuery(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value)
    }
  })
  const text = search.toString()
  return text ? `?${text}` : ''
}

function getFilename(response) {
  const disposition = response.headers.get('content-disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/i)
  return match?.[1] || null
}

async function parseError(response) {
  try {
    const data = await response.json()
    const error = data.error || {}
    return new ApiClientError(error.message || response.statusText, {
      status: response.status,
      code: error.code || 'http_error',
      details: error.details || {},
    })
  } catch {
    return new ApiClientError(response.statusText || 'Request failed', {
      status: response.status,
      code: 'http_error',
    })
  }
}

export async function apiRequest(path, options = {}) {
  const { body, formData, headers = {}, method = body || formData ? 'POST' : 'GET' } = options
  const requestHeaders = new Headers(headers)
  const token = getAccessToken()

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  let requestBody
  if (formData) {
    requestBody = formData
  } else if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json')
    requestBody = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: requestBody,
    })
  } catch (error) {
    throw new ApiClientError(error.message || 'Network request failed', { code: 'network_error' })
  }

  if (!response.ok) {
    const error = await parseError(response)
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('mlwarden:unauthorized'))
    }
    throw error
  }

  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') || ''
  return contentType.includes('application/json') ? response.json() : response.text()
}

export async function downloadBlob(path) {
  const token = getAccessToken()
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE_URL}${path}`, { headers })
  if (!response.ok) {
    const error = await parseError(response)
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('mlwarden:unauthorized'))
    }
    throw error
  }

  return {
    blob: await response.blob(),
    filename: getFilename(response),
  }
}

export async function downloadToFile(path, fallbackName) {
  const { blob, filename } = await downloadBlob(path)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || fallbackName || 'download'
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function fileObjectUrl(path) {
  const { blob } = await downloadBlob(path)
  return URL.createObjectURL(blob)
}
