import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout.jsx'
import { Button } from '@/components/common/Button.jsx'
import { PageHeader } from '@/components/common/PageHeader.jsx'
import { SearchInput } from '@/components/common/SearchInput.jsx'
import { Toolbar } from '@/components/common/Toolbar.jsx'
import { ProjectSummaryCards } from '@/components/projects/ProjectSummaryCards.jsx'
import { ProjectTable } from '@/components/projects/ProjectTable.jsx'
import { trackerApi } from '@/api/TrackerApi.js'

export default function ProjectsPage() {
  const [query, setQuery] = useState('')
  const projects = useMemo(() => trackerApi.listProjects(), [])
  const summary = useMemo(() => trackerApi.getProjectSummary(), [])
  const filteredProjects = useMemo(
    () => projects.filter((project) => `${project.name} ${project.description} ${project.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())),
    [projects, query],
  )

  return (
    <AppLayout breadcrumbs={['MLWarden', 'Projects']}>
      <PageHeader
        title="Projects"
        subtitle="Track experiment runs, metrics, artifacts, and workflow outputs."
        actions={<Button><Plus size={15} /> New project</Button>}
      />
      <ProjectSummaryCards summary={summary} />
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search projects" />
      </Toolbar>
      <ProjectTable projects={filteredProjects} />
    </AppLayout>
  )
}
