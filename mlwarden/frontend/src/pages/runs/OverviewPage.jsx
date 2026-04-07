import { useParams } from 'react-router-dom'
import { PageLayout } from '../../shared/ui/PageLayout'

export function OverviewPage() {
  const { projectId = 'my_cnn', runId = 'test_run' } = useParams()

  return (
    <PageLayout>
      <section className="overview-panel">
        <h1>{`/${projectId}/${runId}`}</h1>
        <p>Overview в роботі. Тут зʼявляться метрики, графіки й артефакти запуску.</p>

        <div className="overview-grid overview-grid-a">
          <article className="card" />
          <article className="card dark" />
          <article className="card darker" />
        </div>

        <div className="overview-grid overview-grid-b">
          <article className="card darker" />
          <article className="card dark" />
          <article className="card" />
          <article className="card mid" />
        </div>
      </section>
    </PageLayout>
  )
}
