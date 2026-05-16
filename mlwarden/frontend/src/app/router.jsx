import { createBrowserRouter } from 'react-router-dom'
import HomePage from '@/routes/HomePage.jsx'
import LoginPage from '@/routes/LoginPage.jsx'
import ProjectsPage from '@/routes/ProjectsPage.jsx'
import ProjectDetailPage from '@/routes/ProjectDetailPage.jsx'
import RunDetailPage from '@/routes/RunDetailPage.jsx'
import ChartsPage from '@/routes/ChartsPage.jsx'
import ChartsIndexPage from '@/routes/ChartsIndexPage.jsx'
import RunsPage from '@/routes/RunsPage.jsx'
import WorkspacePage from '@/routes/WorkspacePage.jsx'
import ArtifactsPage from '@/routes/ArtifactsPage.jsx'
import SystemPage from '@/routes/SystemPage.jsx'
import FaqPage from '@/routes/FaqPage.jsx'
import NotFoundPage from '@/routes/NotFoundPage.jsx'
import OfflinePage from '@/routes/OfflinePage.jsx'
import RouteErrorPage from '@/routes/RouteErrorPage.jsx'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute.jsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/faq',
    element: <FaqPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: '/workspace',
        element: <WorkspacePage />,
      },
      {
        path: '/projects',
        element: <ProjectsPage />,
      },
      {
        path: '/runs',
        element: <RunsPage />,
      },
      {
        path: '/charts',
        element: <ChartsIndexPage />,
      },
      {
        path: '/artifacts',
        element: <ArtifactsPage />,
      },
      {
        path: '/system',
        element: <SystemPage />,
      },
      {
        path: '/projects/:projectId',
        element: <ProjectDetailPage />,
      },
      {
        path: '/projects/:projectId/charts',
        element: <ChartsPage />,
      },
      {
        path: '/runs/:runId',
        element: <RunDetailPage />,
      },
      {
        path: '/offline',
        element: <OfflinePage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
    errorElement: <RouteErrorPage />,
  },
])
