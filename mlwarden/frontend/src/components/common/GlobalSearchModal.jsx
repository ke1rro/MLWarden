import { LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useGlobalSearchResults } from '@/hooks/useGlobalSearchResults.js'

const groups = [
  ['projects', 'Projects'],
  ['runs', 'Runs'],
  ['charts', 'Charts'],
  ['artifacts', 'Artifacts'],
]

function withHighlight(to, query) {
  const [path, search = ''] = to.split('?')
  const params = new URLSearchParams(search)
  params.set('highlight', query)
  return `${path}?${params.toString()}`
}

export function GlobalSearchModal({ query = '', onClose }) {
  const { error, isLoading, loadedQuery, results, trimmedQuery } = useGlobalSearchResults(query)
  const total = groups.reduce((sum, [key]) => sum + (results[key]?.length || 0), 0)

  return (
    <div className="global-search-dropdown" role="dialog" aria-label="Search results">
      {trimmedQuery.length < 2 ? <p className="muted-copy">Type at least two characters.</p> : null}
      {isLoading ? <p className="search-loading"><LoaderCircle size={16} /> Searching...</p> : null}
      {trimmedQuery.length >= 2 && loadedQuery === trimmedQuery && error ? <p className="form-error">{error}</p> : null}
      {!isLoading && trimmedQuery.length >= 2 && loadedQuery === trimmedQuery && !error && !total ? (
        <p className="muted-copy">No matching workspace items.</p>
      ) : null}
      <div className="global-search-results">
        {groups.map(([key, label]) => {
          const items = results[key] || []
          if (!items.length) return null
          return (
            <section className="search-result-group" key={key}>
              <h3>{label}</h3>
              {items.slice(0, 8).map((item) => (
                <Link
                  className="search-result-item"
                  data-search-text={`${item.title} ${item.detail}`}
                  key={item.id}
                  onClick={onClose}
                  to={withHighlight(item.to, trimmedQuery)}
                >
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </Link>
              ))}
            </section>
          )
        })}
      </div>
    </div>
  )
}
