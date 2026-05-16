import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function useSearchHighlight() {
  const location = useLocation()

  useEffect(() => {
    const keyword = new URLSearchParams(location.search).get('highlight')?.trim().toLowerCase()
    if (!keyword) return undefined

    let timeoutId
    const frameId = window.requestAnimationFrame(() => {
      const matches = [...document.querySelectorAll('[data-search-text]')]
        .filter((element) => element.dataset.searchText?.toLowerCase().includes(keyword))

      matches.forEach((element) => element.classList.add('is-search-highlighted'))
      matches[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' })

      timeoutId = window.setTimeout(() => {
        matches.forEach((element) => element.classList.remove('is-search-highlighted'))
      }, 5000)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
      document
        .querySelectorAll('.is-search-highlighted')
        .forEach((element) => element.classList.remove('is-search-highlighted'))
    }
  }, [location.search])
}
