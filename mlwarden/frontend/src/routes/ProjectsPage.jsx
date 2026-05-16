import { Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { adaptProject, summarizeProjects } from '@/api/adapters.js'
import { createProject, deleteProject, listProjects, updateProject } from '@/api/projects.js'
import { useNotifications } from '@/app/useNotifications.js'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { Button } from '@/components/common/Button.jsx'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { Modal } from '@/components/common/Modal.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { ProjectSummaryCards } from '@/components/projects/ProjectSummaryCards.jsx'
import { ProjectTable } from '@/components/projects/ProjectTable.jsx'

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

export default function ProjectsPage() {
  const [query, setQuery] = useState('')
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', tags: '' })
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
      const response = await listProjects()
      setProjects((response.items || []).map(adaptProject))
    } catch (err) {
      setError(err.message || 'Failed to load projects.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => subscribe((message) => {
    if (refreshEvents.has(message.type)) loadProjects()
  }), [loadProjects, subscribe])

  async function handleCreateProject(event) {
    event.preventDefault()
    setIsCreating(true)
    setError('')
    try {
      await createProject({
        name: form.name.trim(),
        description: form.description.trim() || null,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        metadata: {},
      })
      setForm({ name: '', description: '', tags: '' })
      setIsCreateOpen(false)
      await loadProjects()
    } catch (err) {
      setError(err.message || 'Failed to create project.')
    } finally {
      setIsCreating(false)
    }
  }

  function handleEditProject(project) {
    setEditProject(project)
    setEditForm({
      name: project.name || '',
      description: project.description || '',
      tags: (project.tags || []).join(', '),
    })
  }

  async function handleSaveEdit(event) {
    event.preventDefault()
    setIsEditing(true)
    setError('')
    try {
      await updateProject(editProject.id, {
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

  async function handleConfirmDelete() {
    setIsDeleting(true)
    setError('')
    try {
      await deleteProject(deleteTarget.id)
      setDeleteTarget(null)
      await loadProjects()
    } catch (err) {
      setError(err.message || 'Failed to delete project.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: 'Projects' }]}>
      <PageHeader
        title="Projects"
        subtitle="Track experiment runs, metrics, artifacts, and workflow outputs."
        actions={<Button onClick={() => setIsCreateOpen((current) => !current)}><Plus size={15} /> New project</Button>}
      />
      {isCreateOpen ? (
        <form className="panel inline-form" onSubmit={handleCreateProject}>
          <label>
            Project name
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          </label>
          <label>
            Description
            <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <label>
            Tags
            <input placeholder="vision, compression" value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} />
          </label>
          <div className="button-row">
            <Button disabled={isCreating} type="submit">{isCreating ? 'Creating...' : 'Create project'}</Button>
            <Button onClick={() => setIsCreateOpen(false)} variant="secondary">Cancel</Button>
          </div>
        </form>
      ) : null}
      <ProjectSummaryCards summary={summary} />
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search projects" />
      </Toolbar>
      {isLoading ? <LoadingState message="Loading projects..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!isLoading && !error ? (
        <ProjectTable
          projects={filteredProjects}
          onEditProject={handleEditProject}
          onDeleteProject={(project) => setDeleteTarget(project)}
        />
      ) : null}
      {editProject ? (
        <Modal
          title={`Edit ${editProject.name}`}
          description="Update project name, description, and tags."
          onClose={() => setEditProject(null)}
          footer={(
            <>
              <Button variant="secondary" onClick={() => setEditProject(null)}>Cancel</Button>
              <Button disabled={isEditing} onClick={handleSaveEdit}>{isEditing ? 'Saving...' : 'Save changes'}</Button>
            </>
          )}
        >
          <form className="settings-form-grid" onSubmit={handleSaveEdit}>
            <label>
              Project name
              <input value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} required />
            </label>
            <label>
              Description
              <input value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label>
              Tags
              <input placeholder="vision, compression" value={editForm.tags} onChange={(event) => setEditForm((current) => ({ ...current, tags: event.target.value }))} />
            </label>
          </form>
        </Modal>
      ) : null}
      {deleteTarget ? (
        <ConfirmDialog
          title={`Delete "${deleteTarget.name}"?`}
          message="This will soft-delete the project. This action may be irreversible depending on server configuration."
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
          cancelLabel="Cancel"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
    </AppLayout>
  )
}
