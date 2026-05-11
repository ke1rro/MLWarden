import { Search } from 'lucide-react'

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <label className="search-input">
      <Search size={15} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type="search" />
    </label>
  )
}
