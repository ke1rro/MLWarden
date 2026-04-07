import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function SortPopover({
  options,
  selected,
  onChange,
  labelPrefix = 'Sort by:',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handleClickOutside(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const activeOption = options.find((option) => option.value === selected) ?? options[0]

  return (
    <div className={`sort-popover ${className}`.trim()} ref={containerRef}>
      <button
        type="button"
        className="sort-btn"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {labelPrefix} {activeOption.label}
        <ChevronDown size={16} className={isOpen ? 'sort-btn-icon open' : 'sort-btn-icon'} />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <Motion.div
            className="sort-menu"
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {options.map((option, index) => {
              const isSelected = option.value === selected

              return (
                <Motion.button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  className={isSelected ? 'sort-menu-item selected' : 'sort-menu-item'}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.16, delay: index * 0.02, ease: 'easeOut' }}
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                >
                  <span>{option.label}</span>
                  {isSelected ? <Check size={14} /> : null}
                </Motion.button>
              )
            })}
          </Motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
