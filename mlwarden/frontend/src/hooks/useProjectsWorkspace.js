import { useCallback, useEffect, useMemo, useState } from 'react'
import { adaptProject, summarizeProjects } from '@/api/adapters.js'
import { projectsApi } from '@/api/projects.js'
import { useNotifications } from '@/app/useNotifications.js'

const refreshEvents = new Set([
  'backend.connected',
  'project.created',
  'project.updated',
  'project.deleted',
  'run.created',
  'run.started',
  'run.finished',
  'run.failed',
  'run.cancelled',
])

export function useProjectsWorkspace({ api = projectsApi } = {}) {
  const [query, setQuery] = useState('')
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [editProject, setEditProject] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', tags: '' })
  const [isEditing, setIsEditing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { subscribe } = useNotifications()

  const summary = useMemo(() => summarizeProjects(projects), [projects])
  const filteredProjects = useMemo(
    () => projects.filter((project) => `${project.name} ${project.description} ${project.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())),
    [projects, query],
  )

  const loadProjects = useCallback(async () => {
    setError('')
    try {
      const response = await api.list()
      setProjects((response.items || []).map(adaptProject))
    } catch (err) {
      setError(err.message || 'Failed to load projects.')
    } finally {
      setIsLoading(false)
    }
  }, [api])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => subscribe((message) => {
    if (refreshEvents.has(message.type)) loadProjects()
  }), [loadProjects, subscribe])

  function edit(project) {
    setEditProject(project)
    setEditForm({
      name: project.name || '',
      description: project.description || '',
      tags: (project.tags || []).join(', '),
    })
  }

  async function saveEdit(event) {
    event.preventDefault()
    setIsEditing(true)
    setError('')
    try {
      await api.update(editProject.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        tags: editForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      })
      setEditProject(null)
      await loadProjects()
    } catch (err) {
      setError(err.message || 'Failed to update project.')
    } finally {
      setIsEditing(false)
    }
  }

  async function confirmDelete() {
    setIsDeleting(true)
    setError('')
    try {
      await api.delete(deleteTarget.id)
      setDeleteTarget(null)
      await loadProjects()
    } catch (err) {
      setError(err.message || 'Failed to delete project.')
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    deleteTarget,
    editForm,
    editProject,
    error,
    filteredProjects,
    isDeleting,
    isEditing,
    isLoading,
    query,
    saveEdit,
    setDeleteTarget,
    setEditForm,
    setEditProject,
    setQuery,
    summary,
    edit,
    confirmDelete,
  }
}
