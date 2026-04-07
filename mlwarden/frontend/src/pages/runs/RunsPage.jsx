import { Star, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageLayout } from '../../shared/ui/PageLayout'
import { GlassPanel } from '../../shared/ui/GlassPanel'
import { SortPopover } from '../../shared/ui/SortPopover'

const initialRuns = [
  { id: '3456-789', name: 'run1', date: '27.04.2025', isFavorite: false },
  { id: '3457-281', name: 'test_run', date: '18.04.2025', isFavorite: true },
  { id: '7436-420', name: 'time', date: '29.03.2025', isFavorite: false },
]

export function RunsPage() {
  const navigate = useNavigate()
  const { projectId = 'my_cnn' } = useParams()
  const [runs, setRuns] = useState(initialRuns)
  const [sortBy, setSortBy] = useState('dateDesc')

  const toggleFavorite = (runId) => {
    setRuns((previousRuns) =>
      previousRuns.map((run) =>
        run.id === runId ? { ...run, isFavorite: !run.isFavorite } : run,
      ),
    )
  }

  const sortedRuns = useMemo(() => {
    const parseDate = (date) => {
      const [day, month, year] = date.split('.').map(Number)
      return new Date(year, month - 1, day).getTime()
    }

    if (sortBy === 'nameAsc') {
      return [...runs].sort((first, second) => first.name.localeCompare(second.name))
    }

    if (sortBy === 'nameDesc') {
      return [...runs].sort((first, second) => second.name.localeCompare(first.name))
    }

    if (sortBy === 'dateAsc') {
      return [...runs].sort((first, second) => parseDate(first.date) - parseDate(second.date))
    }

    return [...runs].sort((first, second) => parseDate(second.date) - parseDate(first.date))
  }, [runs, sortBy])

  return (
    <PageLayout>
      <GlassPanel
        title={`/${projectId}`}
        actions={
          <SortPopover
            options={[
              { value: 'dateDesc', label: 'Date (newest)' },
              { value: 'dateAsc', label: 'Date (oldest)' },
              { value: 'nameAsc', label: 'Name A-Z' },
              { value: 'nameDesc', label: 'Name Z-A' },
            ]}
            selected={sortBy}
            onChange={setSortBy}
          />
        }
      >
        <div className="runs-list">
          {sortedRuns.map((run) => (
            <div className="run-line" key={run.id}>
              <button
                className="flat-icon-btn"
                type="button"
                aria-label={`Toggle favorite run ${run.name}`}
                onClick={() => toggleFavorite(run.id)}
              >
                <Star size={24} fill={run.isFavorite ? '#f4b400' : 'none'} color={run.isFavorite ? '#f4b400' : '#272727'} />
              </button>

              <button
                type="button"
                className="run-row"
                onClick={() =>
                  navigate(`/projects/${projectId}/runs/${run.id}/overview`)
                }
              >
                <span>{run.name}</span>
                <span className="muted">id: {run.id.replace('-', ' ')}</span>
                <span className="date">{run.date}</span>
              </button>

              <button className="flat-icon-btn danger" type="button" aria-label="Delete run">
                <Trash2 size={22} />
              </button>
            </div>
          ))}
        </div>
      </GlassPanel>
    </PageLayout>
  )
}
