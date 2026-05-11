import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './app/AuthContext.jsx'
import { NotificationsProvider } from './app/NotificationsProvider.jsx'
import { router } from './app/router.jsx'

function App() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <RouterProvider router={router} />
      </NotificationsProvider>
    </AuthProvider>
  )
}

export default App
