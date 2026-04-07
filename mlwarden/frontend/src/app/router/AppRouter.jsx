import { AnimatePresence, motion as Motion } from 'framer-motion'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { ProjectsPage } from '@/pages/dashboard/ProjectsPage'
import { NewProjectPage } from '@/pages/dashboard/NewProjectPage'
import { RunsPage } from '@/pages/runs/RunsPage'
import { OverviewPage } from '@/pages/runs/OverviewPage'
import { NotFoundPage } from '@/pages/not-found/NotFoundPage'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Motion.div
        key={location.pathname}
        className="page-transition-layer"
        initial={{ opacity: 0, y: 8, scale: 0.9985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.9985 }}
        transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<NewProjectPage />} />
          <Route path="/projects/:projectId/runs" element={<RunsPage />} />
          <Route
            path="/projects/:projectId/runs/:runId/overview"
            element={<OverviewPage />}
          />
          <Route
            path="/runs"
            element={<Navigate to="/projects/my_cnn/runs" replace />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Motion.div>
    </AnimatePresence>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  )
}
