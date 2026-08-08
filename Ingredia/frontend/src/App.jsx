import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import LandingPage        from './pages/LandingPage'
import LoginPage          from './pages/LoginPage'
import SignupPage         from './pages/SignupPage'
import HomePage           from './pages/HomePage'
import SavedPage          from './pages/SavedPage'
import PantryPage         from './pages/PantryPage'
import ProfilePage        from './pages/ProfilePage'
import AdminPage          from './pages/AdminPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage  from './pages/ResetPasswordPage'

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted text-sm">Loading…</div>
  if (!isAuthenticated) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />
  return children
}

// User-only route: hidden from admins. Used for features that don't make sense in an
// admin context (e.g. personal Pantry).
function UserOnlyRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted text-sm">Loading…</div>
  if (!isAuthenticated) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  return children
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted text-sm">Loading…</div>
  if (!isAuthenticated) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />
  if (!isAdmin) return <Navigate to="/home" replace />
  return children
}

function GuestOnly({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (isAuthenticated) return <Navigate to="/home" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/"        element={<LandingPage />} />
            <Route path="/login"            element={<GuestOnly><LoginPage /></GuestOnly>} />
            <Route path="/signup"           element={<GuestOnly><SignupPage /></GuestOnly>} />
            <Route path="/forgot-password"  element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />
            <Route path="/reset-password"   element={<ResetPasswordPage />} />
            <Route path="/home"    element={<HomePage />} />
            <Route path="/saved"   element={<UserOnlyRoute><SavedPage /></UserOnlyRoute>} />
            <Route path="/pantry"  element={<UserOnlyRoute><PantryPage /></UserOnlyRoute>} />
            <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
            <Route path="/admin"   element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="*"        element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
