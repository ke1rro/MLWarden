import { ChevronDown, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../../shared/ui/PageLayout'
import { GlassPanel } from '../../shared/ui/GlassPanel'

export function NewProjectPage() {
  const navigate = useNavigate()
  const [projectName, setProjectName] = useState('new_project')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('Private')
  const displayProjectName = projectName.trim() || 'new_project'

  const handleCreate = () => {
    const targetProject = displayProjectName
    navigate(`/projects/${targetProject}/runs`)
  }

  return (
    <PageLayout>
      <GlassPanel title={`/${displayProjectName}`} className="new-project-panel">
        <div className="new-project-form">
          <label>
            <span>Project name</span>
            <input
              type="text"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
            />
          </label>

          <label>
            <span>Description</span>
            <input
              type="text"
              placeholder="Your description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <div className="visibility-row">
            <label>
              <span>Visibility</span>
              <div className="select-wrap">
                <EyeOff size={22} />
                <select
                  value={visibility}
                  onChange={(event) => setVisibility(event.target.value)}
                >
                  <option>Private</option>
                  <option>Team</option>
                  <option>Public</option>
                </select>
                <ChevronDown size={16} />
              </div>
            </label>

            <button type="button" className="create-btn" onClick={handleCreate}>
              Create
            </button>
          </div>
        </div>
      </GlassPanel>
    </PageLayout>
  )
}
