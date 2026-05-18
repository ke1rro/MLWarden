import { adaptArtifact, adaptProject, adaptRun } from '@/api/adapters.js'
import { artifactsApi } from '@/api/artifacts.js'
import { chartsApi } from '@/api/charts.js'
import { projectsApi } from '@/api/projects.js'
import { runsApi } from '@/api/runs.js'

class WorkspaceApi {
  constructor({
    artifacts = artifactsApi,
    charts = chartsApi,
    projects = projectsApi,
    runs = runsApi,
  } = {}) {
    this.artifacts = artifacts
    this.charts = charts
    this.projects = projects
    this.runs = runs
  }

  async loadProjects() {
    const response = await this.projects.list()
    return (response.items || []).map(adaptProject)
  }

  async loadAllRuns(projectsInput) {
    const projects = projectsInput || await this.loadProjects()
    const runGroups = await Promise.all(
      projects.map(async (project) => {
        const response = await this.runs.list(project.id, { limit: 500 })
        return (response.items || []).map((run) => ({
          ...adaptRun(run),
          projectId: project.id,
          projectName: project.name,
        }))
      }),
    )
    return runGroups.flat()
  }

  async loadAllCharts(projectsInput) {
    const projects = projectsInput || await this.loadProjects()
    const chartGroups = await Promise.all(
      projects.map(async (project) => {
        const response = await this.charts.list(project.id)
        return (response.items || []).map((chart) => ({
          ...chart,
          projectId: project.id,
          projectName: project.name,
        }))
      }),
    )
    return chartGroups.flat()
  }

  async loadAllArtifacts(projectsInput, runsInput) {
    const projects = projectsInput || await this.loadProjects()
    const runs = runsInput || await this.loadAllRuns(projects)
    const artifactGroups = await Promise.all(
      runs.map(async (run) => {
        const response = await this.artifacts.list(run.id, { limit: 500 })
        return (response.items || []).map((artifact) => ({
          ...adaptArtifact(artifact),
          runId: run.id,
          runName: run.name,
          projectId: run.projectId,
          projectName: run.projectName,
        }))
      }),
    )
    return artifactGroups.flat()
  }

  async loadSnapshot({ includeArtifacts = false } = {}) {
    const projects = await this.loadProjects()
    const [runs, charts] = await Promise.all([
      this.loadAllRuns(projects),
      this.loadAllCharts(projects),
    ])
    const artifacts = includeArtifacts ? await this.loadAllArtifacts(projects, runs) : []

    return { projects, runs, charts, artifacts }
  }
}

export const workspaceApi = new WorkspaceApi()
