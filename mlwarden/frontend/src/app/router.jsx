import { createBrowserRouter } from 'react-router-dom'
import HomePage from '@/routes/HomePage.jsx'
import LoginPage from '@/routes/LoginPage.jsx'
import ProjectsPage from '@/routes/ProjectsPage.jsx'
import ProjectDetailPage from '@/routes/ProjectDetailPage.jsx'
import RunDetailPage from '@/routes/RunDetailPage.jsx'
import ChartsPage from '@/routes/ChartsPage.jsx'
import SettingsPage from '@/routes/SettingsPage.jsx'
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
    element: <ProtectedRoute />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: '/projects',
        element: <ProjectsPage />,
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
        path: '/settings',
        element: <SettingsPage />,
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
