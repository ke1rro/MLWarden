import { createBrowserRouter, Navigate } from 'react-router-dom'
import LoginPage from '../routes/LoginPage.jsx'
import ProjectsPage from '../routes/ProjectsPage.jsx'
import ProjectDetailPage from '../routes/ProjectDetailPage.jsx'
import RunDetailPage from '../routes/RunDetailPage.jsx'
import ChartsPage from '../routes/ChartsPage.jsx'
import SettingsPage from '../routes/SettingsPage.jsx'
import NotFoundPage from '../routes/NotFoundPage.jsx'
import { ProtectedRoute } from '../components/layout/ProtectedRoute.jsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/projects" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
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
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
