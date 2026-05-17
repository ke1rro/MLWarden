import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { Button } from '@/components/common/Button.jsx'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { LoadingState } from '@/components/common/LoadingState.jsx'
import { Modal } from '@/components/common/Modal.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { ProjectSummaryCards } from '@/components/projects/ProjectSummaryCards.jsx'
import { ProjectTable } from '@/components/projects/ProjectTable.jsx'
import { useProjectsWorkspace } from '@/hooks/useProjectsWorkspace.js'

function ProjectEditDialog({ editForm, editProject, isEditing, onChange, onClose, onSave }) {
  if (!editProject) return null

  return (
    <Modal
      title={`Edit ${editProject.name}`}
      description="Update project name, description, and tags."
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={isEditing} onClick={onSave}>{isEditing ? 'Saving...' : 'Save changes'}</Button>
        </>
      )}
    >
      <form className="settings-form-grid" onSubmit={onSave}>
        <label>
          Project name
          <input value={editForm.name} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} required />
        </label>
        <label>
          Description
          <input value={editForm.description} onChange={(event) => onChange((current) => ({ ...current, description: event.target.value }))} />
        </label>
        <label>
          Tags
          <input placeholder="vision, compression" value={editForm.tags} onChange={(event) => onChange((current) => ({ ...current, tags: event.target.value }))} />
        </label>
      </form>
    </Modal>
  )
}

function ProjectDialogs({ workspace }) {
  return (
    <>
      <ProjectEditDialog
        editForm={workspace.editForm}
        editProject={workspace.editProject}
        isEditing={workspace.isEditing}
        onChange={workspace.setEditForm}
        onClose={() => workspace.setEditProject(null)}
        onSave={workspace.saveEdit}
      />
      {workspace.deleteTarget ? (
        <ConfirmDialog
          title={`Delete "${workspace.deleteTarget.name}"?`}
          message="This will soft-delete the project. This action may be irreversible depending on server configuration."
          confirmLabel={workspace.isDeleting ? 'Deleting...' : 'Delete'}
          cancelLabel="Cancel"
          onCancel={() => workspace.setDeleteTarget(null)}
          onConfirm={workspace.confirmDelete}
        />
      ) : null}
    </>
  )
}

export default function ProjectsPage() {
  const workspace = useProjectsWorkspace()

  return (
    <AppLayout
      breadcrumbs={[{ label: 'MLWarden', to: '/workspace' }, { label: 'Projects' }]}
      title="Projects"
      subtitle="Track experiment runs, metrics, artifacts, and workflow outputs."
    >
      <ProjectSummaryCards summary={workspace.summary} />
      <Toolbar>
        <SearchInput value={workspace.query} onChange={workspace.setQuery} placeholder="Search projects" />
      </Toolbar>
      {workspace.isLoading ? <LoadingState message="Loading projects..." /> : null}
      {workspace.error ? <ErrorState message={workspace.error} /> : null}
      {!workspace.isLoading && !workspace.error ? (
        <ProjectTable
          projects={workspace.filteredProjects}
          onEditProject={workspace.edit}
          onDeleteProject={workspace.setDeleteTarget}
        />
      ) : null}
      <ProjectDialogs workspace={workspace} />
    </AppLayout>
  )
}
