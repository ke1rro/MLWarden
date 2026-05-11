import {
  artifactsByRunId,
  eventsByRunId,
  getProject,
  getProjectStats,
  getRun,
  getRunsForProject,
  imagesByRunId,
  logsByRunId,
  metricSeriesByRunId,
  notifications,
  projects,
  runs,
  savedChartsByProjectId,
  tablesByRunId,
} from '@/mockData.js'

export class TrackerApi {
  listProjects() {
    return projects.map((project) => ({
      ...project,
      stats: getProjectStats(project.id),
    }))
  }

  getProject(projectId) {
    const project = getProject(projectId)
    return project ? { ...project, stats: getProjectStats(project.id) } : null
  }

  getProjectSummary() {
    const latestProject = [...projects].sort((left, right) => right.latestRun.localeCompare(left.latestRun))[0]

    return {
      totalProjects: projects.length,
      activeProjects: projects.filter((project) => !project.deletedAt).length,
      runningRuns: runs.filter((run) => run.status === 'running').length,
      failedRuns: runs.filter((run) => run.status === 'failed').length,
      latestActivity: latestProject?.latestRun?.split(' ').at(-1) || 'n/a',
      latestRunName: latestProject?.name || 'n/a',
    }
  }

  getProjectWorkspace(projectId) {
    const project = this.getProject(projectId)
    if (!project) return null

    const projectRuns = getRunsForProject(project.id)
    const savedCharts = savedChartsByProjectId[project.id] || []

    return {
      project,
      runs: projectRuns,
      savedCharts,
      previewSeries: metricSeriesByRunId[projectRuns[0]?.id] || {},
    }
  }

  getChartsWorkspace(projectId) {
    const project = this.getProject(projectId)
    if (!project) return null

    return {
      project,
      runs: getRunsForProject(project.id),
      metricSeries: metricSeriesByRunId,
    }
  }

  getRunWorkspace(runId) {
    const run = getRun(runId)
    if (!run) return null

    return {
      run,
      project: this.getProject(run.projectId),
      metricSeries: metricSeriesByRunId[run.id] || {},
      logs: logsByRunId[run.id] || [],
      tables: tablesByRunId[run.id] || [],
      images: imagesByRunId[run.id] || [],
      artifacts: artifactsByRunId[run.id] || [],
      events: eventsByRunId[run.id] || [],
    }
  }

  listNotifications() {
    return notifications
  }
}

export const trackerApi = new TrackerApi()
