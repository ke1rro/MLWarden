export function GlassPanel({ title, titleActions, actions, children, className = '' }) {
  return (
    <section className={`glass-panel-wrap ${className}`.trim()}>
      <section className="glass-panel">
        <div className="glass-panel-head">
          <div className="glass-panel-title-row">
            <h1>{title}</h1>
            {titleActions}
          </div>
          {actions}
        </div>
        {children}
      </section>
    </section>
  )
}
