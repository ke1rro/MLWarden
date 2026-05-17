function formatDate(value) {
  if (!value) return 'n/a'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatTime(value) {
  if (!value) return 'not started'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function formatDuration(start, end, status) {
  if (!start) return status === 'created' ? 'queued' : 'n/a'
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : new Date()
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 'n/a'
  const seconds = Math.max(0, Math.round((endDate - startDate) / 1000))
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours) return `${hours}h ${minutes % 60}m`
  if (minutes) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

function formatBytes(value) {
  if (value === null || value === undefined) return 'n/a'
  const units = ['B', 'KB', 'MB', 'GB']
  let amount = Number(value)
  let unit = 0
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024
    unit += 1
  }
  return `${amount.toFixed(unit ? 1 : 0)} ${units[unit]}`
}

function summaryValue(summary, keys) {
  for (const key of keys) {
    if (summary?.[key] !== undefined && summary?.[key] !== null) return summary[key]
  }
  return null
}

export function adaptProject(project = {}) {
  return {
    ...project,
    stats: {
      runs: project.run_count ?? 0,
      running: project.running_run_count ?? 0,
      finished: project.finished_run_count ?? 0,
      failed: project.failed_run_count ?? 0,
    },
    latestRun: formatDate(project.latest_run_at),
    tags: project.tags || [],
  }
}

export function summarizeProjects(projects = []) {
  const latest = projects.find((project) => project.latest_run_at)
  return {
    totalProjects: projects.length,
    activeProjects: projects.filter((project) => !project.deleted_at).length,
    runningRuns: projects.reduce((sum, project) => sum + Number(project.running_run_count || 0), 0),
    failedRuns: projects.reduce((sum, project) => sum + Number(project.failed_run_count || 0), 0),
    latestActivity: latest?.latestRun || 'n/a',
    latestRunName: latest?.name || 'No runs yet',
  }
}

export function adaptRun(run = {}, params = {}) {
  const metadata = run.metadata || {}
  const summary = run.summary || {}
  return {
    ...run,
    projectId: run.project_id,
    tags: run.tags || [],
    params,
    created: formatDate(run.created_at),
    started: formatTime(run.started_at),
    finished: formatTime(run.finished_at),
    duration: formatDuration(run.started_at, run.finished_at, run.status),
    worker: metadata.hostname || metadata.worker || metadata.worker_id || 'n/a',
    notes: run.description || summary.notes || '',
    bestPsnr: summaryValue(summary, ['best_psnr', 'bestPsnr', 'val.psnr']),
    finalLoss: summaryValue(summary, ['final_loss', 'finalLoss', 'loss']),
  }
}

export function adaptParams(response = {}) {
  return Object.fromEntries(
    Object.entries(response.params || {}).map(([key, value]) => [key, value.value_json ?? value.value]),
  )
}

export function adaptMetricSummary(items = []) {
  return items.map((item) => ({
    ...item,
    latest: item.latest_value,
    min: item.min_value,
    max: item.max_value,
  }))
}

export function adaptLog(log = {}) {
  return {
    ...log,
    timestampLabel: formatTime(log.timestamp),
    level: log.level || 'info',
    context: log.context || {},
  }
}

export function adaptTableMeta(table = {}) {
  return {
    ...table,
    rows: [],
    rowCount: table.row_count ?? table.total ?? 0,
    metadata: table.metadata || {},
    columns: table.columns || [],
  }
}

export function adaptTableRows(rows = []) {
  return rows.map((row) => row.data || row)
}

export function adaptImage(image = {}) {
  return {
    ...image,
    group: image.metadata?.group || image.name?.split('/')[0] || 'default',
    split: image.metadata?.split || '',
    size: image.width && image.height ? `${image.width}x${image.height}` : formatBytes(image.size_bytes),
    created: formatDate(image.created_at),
    metadata: image.metadata || {},
  }
}

export function adaptArtifact(artifact = {}) {
  return {
    ...artifact,
    path: artifact.artifact_path || artifact.original_filename || artifact.name,
    contentType: artifact.content_type || 'application/octet-stream',
    size: formatBytes(artifact.size_bytes),
    created: formatDate(artifact.created_at),
    metadata: artifact.metadata || {},
  }
}

export function adaptEvent(event = {}) {
  return {
    ...event,
    timestamp: event.timestamp || event.created_at,
    timestampLabel: formatDate(event.timestamp || event.created_at),
    payload: event.payload || {},
  }
}

export function eventToNotification(event = {}) {
  const payload = event.payload || {}
  const type = event.type || 'notification.created'
  const runName = payload.run_name || payload.name || event.run_id || 'Run'
  const projectName = payload.project_name || event.project_id || 'Project'
  const titleByType = {
    'run.finished': 'Run finished',
    'run.failed': 'Run failed',
    'run.cancelled': 'Run cancelled',
    'artifact.uploaded': 'Artifact uploaded',
    'image.uploaded': 'Image uploaded',
    'backend.disconnected': 'Backend connection lost',
    'backend.connected': 'Backend reconnected',
  }

  return {
    id: event.id || `${type}-${event.timestamp || Date.now()}`,
    type,
    title: titleByType[type] || type,
    message: type.startsWith('backend.')
      ? (payload.message || titleByType[type])
      : `${projectName}: ${runName}`,
    timestamp: event.timestamp || event.created_at || new Date().toISOString(),
    readAt: null,
    dismissedAt: null,
    runId: event.run_id,
    projectId: event.project_id,
  }
}
