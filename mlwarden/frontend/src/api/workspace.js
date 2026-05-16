import { adaptArtifact, adaptProject, adaptRun } from '@/api/adapters.js'
import { listArtifacts } from '@/api/artifacts.js'
import { listCharts } from '@/api/charts.js'
import { listProjects } from '@/api/projects.js'
import { listRuns } from '@/api/runs.js'

export async function loadProjects() {
  const response = await listProjects()
  return (response.items || []).map(adaptProject)
}

export async function loadAllRuns(projectsInput) {
  const projects = projectsInput || await loadProjects()
  const runGroups = await Promise.all(
    projects.map(async (project) => {
      const response = await listRuns(project.id, { limit: 500 })
      return (response.items || []).map((run) => ({
        ...adaptRun(run),
        projectId: project.id,
        projectName: project.name,
      }))
    }),
  )
  return runGroups.flat()
}

export async function loadAllCharts(projectsInput) {
  const projects = projectsInput || await loadProjects()
  const chartGroups = await Promise.all(
    projects.map(async (project) => {
      const response = await listCharts(project.id)
      return (response.items || []).map((chart) => ({
        ...chart,
        projectId: project.id,
        projectName: project.name,
      }))
    }),
  )
  return chartGroups.flat()
}

export async function loadAllArtifacts(projectsInput, runsInput) {
  const projects = projectsInput || await loadProjects()
  const runs = runsInput || await loadAllRuns(projects)
  const artifactGroups = await Promise.all(
    runs.map(async (run) => {
      const response = await listArtifacts(run.id, { limit: 500 })
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

export function buildReports({ projects = [], runs = [], charts = [], artifacts = [] }) {
  const projectReports = projects.map((project) => {
    const projectRuns = runs.filter((run) => run.projectId === project.id)
    const projectCharts = charts.filter((chart) => chart.projectId === project.id)
    const projectArtifacts = artifacts.filter((artifact) => artifact.projectId === project.id)
    return {
      id: `project-${project.id}`,
      kind: 'Project report',
      title: `${project.name} summary report`,
      description: `${projectRuns.length} runs, ${projectCharts.length} saved charts, ${projectArtifacts.length} artifacts.`,
      projectId: project.id,
      projectName: project.name,
      to: `/projects/${project.id}`,
      metrics: [
        ['Runs', projectRuns.length],
        ['Running', projectRuns.filter((run) => run.status === 'running').length],
        ['Failed', projectRuns.filter((run) => run.status === 'failed').length],
      ],
    }
  })

  const runReports = runs.map((run) => ({
    id: `run-${run.id}`,
    kind: 'Run report',
    title: `${run.name} run report`,
    description: `${run.status} run in ${run.projectName}. Duration ${run.duration}.`,
    projectId: run.projectId,
    projectName: run.projectName,
    runId: run.id,
    runName: run.name,
    to: `/runs/${run.id}`,
    metrics: [
      ['Status', run.status],
      ['Duration', run.duration],
      ['Final loss', run.finalLoss ?? 'n/a'],
    ],
  }))

  return [...projectReports, ...runReports]
}

export async function loadWorkspaceSnapshot({ includeArtifacts = false } = {}) {
  const projects = await loadProjects()
  const [runs, charts] = await Promise.all([
    loadAllRuns(projects),
    loadAllCharts(projects),
  ])
  const artifacts = includeArtifacts ? await loadAllArtifacts(projects, runs) : []
  const reports = buildReports({ projects, runs, charts, artifacts })

  return { projects, runs, charts, artifacts, reports }
}
