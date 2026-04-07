import React from 'react'
import './aurora-background.css'

export function AuroraBackground({
  className = '',
  children,
  showRadialGradient = true,
  backgroundOnly = false,
  ...props
}) {
  const beamClass = `aurora-beam ${showRadialGradient ? 'masked' : ''}`.trim()
  const mainClass = `aurora-main ${backgroundOnly ? 'aurora-main-backdrop' : ''}`.trim()
  const rootClass = `aurora-root ${backgroundOnly ? 'aurora-backdrop' : ''} ${className}`.trim()

  return (
    <main className={mainClass}>
      <div className={rootClass} {...props}>
        <div className="aurora-overlay">
          <div className={beamClass} />
        </div>
        {!backgroundOnly ? <div className="aurora-content">{children}</div> : null}
      </div>
    </main>
  )
}
