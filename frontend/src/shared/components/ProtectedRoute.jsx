import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/context/AuthContext'

const ProtectedRoute = ({ children, allowedRoles, allowedSessionRoles = null }) => {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    )
  }

  // Fallback to localStorage during mid-login state transitions
  const token = localStorage.getItem('access_token')
  const storedUserStr = localStorage.getItem('user')
  const localUser = storedUserStr
    ? (() => { try { return JSON.parse(storedUserStr) } catch { return null } })()
    : null

  const effectiveAuth = isAuthenticated || !!token
  const effectiveUser = user || localUser

  if (!effectiveAuth || !effectiveUser) {
    return <Navigate to="/login" replace />
  }

  const role = effectiveUser?.role?.toUpperCase()
  const sessionRole = (sessionStorage.getItem('role') || role || '').toUpperCase()

  const roleHome = () => {
    if (role === 'ADMIN') return '/admin'
    if (role === 'DEPARTMENT') return sessionRole === 'STAFF' ? '/staff' : '/department'
    if (role === 'STUDENT') return '/student'
    return '/login'
  }

  if (allowedRoles && !allowedRoles.map(r => r.toUpperCase()).includes(role)) {
    return <Navigate to={roleHome()} replace />
  }

  if (
    allowedSessionRoles &&
    role === 'DEPARTMENT' &&
    !allowedSessionRoles.map(r => r.toUpperCase()).includes(sessionRole)
  ) {
    return <Navigate to={roleHome()} replace />
  }

  return children
}

export default ProtectedRoute
