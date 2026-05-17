export const AUTH_STORAGE_KEY = 'mlwarden.auth'

function defaultApiBaseUrl() {
  if (typeof window === 'undefined') return 'http://localhost:8000'
  const { hostname, origin, protocol } = window.location
  const isViteDevServer = /^517\d$/.test(window.location.port)
  if (!isViteDevServer) return origin
  return `${protocol}//${hostname || 'localhost'}:8000`
}

function defaultWsBaseUrl() {
  const apiUrl = new URL(defaultApiBaseUrl())
  apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  return apiUrl.toString().replace(/\/$/, '')
}

const DEV_FALLBACK_API = defaultApiBaseUrl()
const DEV_FALLBACK_WS = defaultWsBaseUrl()

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

function dispatchUnauthorized() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mlwarden:unauthorized'))
  }
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

export class ApiClient {
  constructor({ baseUrl = API_BASE_URL, tokenProvider = getAccessToken, onUnauthorized = dispatchUnauthorized } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.tokenProvider = tokenProvider
    this.onUnauthorized = onUnauthorized
  }

  async request(path, options = {}) {
    const { body, formData, headers = {}, method = body || formData ? 'POST' : 'GET' } = options
    const requestHeaders = new Headers(headers)
    const token = this.tokenProvider?.()

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
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: requestHeaders,
        body: requestBody,
      })
    } catch (error) {
      throw new ApiClientError(`Cannot reach MLWarden API at ${this.baseUrl}. Start the backend server and retry.`, {
        code: 'network_error',
        details: { cause: error.message || 'Network request failed' },
      })
    }

    if (!response.ok) {
      const error = await parseError(response)
      if (response.status === 401) {
        this.onUnauthorized?.()
      }
      throw error
    }

    if (response.status === 204) return null
    const contentType = response.headers.get('content-type') || ''
    return contentType.includes('application/json') ? response.json() : response.text()
  }

  async downloadBlob(path) {
    const token = this.tokenProvider?.()
    const headers = new Headers()
    if (token) headers.set('Authorization', `Bearer ${token}`)

    const response = await fetch(`${this.baseUrl}${path}`, { headers })
    if (!response.ok) {
      const error = await parseError(response)
      if (response.status === 401) {
        this.onUnauthorized?.()
      }
      throw error
    }

    return {
      blob: await response.blob(),
      filename: getFilename(response),
    }
  }

  async downloadToFile(path, fallbackName) {
    const { blob, filename } = await this.downloadBlob(path)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || fallbackName || 'download'
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async fileObjectUrl(path) {
    const { blob } = await this.downloadBlob(path)
    return URL.createObjectURL(blob)
  }
}

export const apiClient = new ApiClient()

export function apiRequest(path, options = {}) {
  return apiClient.request(path, options)
}

export function downloadBlob(path) {
  return apiClient.downloadBlob(path)
}

export function downloadToFile(path, fallbackName) {
  return apiClient.downloadToFile(path, fallbackName)
}

export function fileObjectUrl(path) {
  return apiClient.fileObjectUrl(path)
}
