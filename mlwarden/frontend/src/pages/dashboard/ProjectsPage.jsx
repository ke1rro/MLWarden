import { Folder, FolderPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../../shared/ui/PageLayout'
import { GlassPanel } from '../../shared/ui/GlassPanel'
import { SortPopover } from '../../shared/ui/SortPopover'

const projects = ['test', 'my_cnn', 'alpha_v', 'gpt6o', 'test2', 'asdfghjk', 'frefdfhjk']

export function ProjectsPage() {
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState('createdDesc')

  const sortedProjects = useMemo(() => {
    if (sortBy === 'nameAsc') {
      return [...projects].sort((first, second) => first.localeCompare(second))
    }

    if (sortBy === 'nameDesc') {
      return [...projects].sort((first, second) => second.localeCompare(first))
    }

    return projects
  }, [sortBy])

  return (
    <PageLayout>
      <GlassPanel
        title="projects"
        titleActions={
          <button
            type="button"
            className="icon-btn"
            onClick={() => navigate('/projects/new')}
            aria-label="Create new project"
          >
            <FolderPlus size={22} />
          </button>
        }
        actions={
          <div className="panel-actions">
            <SortPopover
              options={[
                { value: 'createdDesc', label: 'Recent' },
                { value: 'nameAsc', label: 'Name A-Z' },
                { value: 'nameDesc', label: 'Name Z-A' },
              ]}
              selected={sortBy}
              onChange={setSortBy}
            />
          </div>
        }
      >
        <div className="project-grid">
          {sortedProjects.map((projectName) => (
            <button
              key={projectName}
              type="button"
              className="project-item"
              onClick={() => navigate(`/projects/${projectName}/runs`)}
            >
              <Folder size={86} className="folder-icon" />
              <span>{projectName}</span>
            </button>
          ))}
        </div>
      </GlassPanel>
    </PageLayout>
  )
}
