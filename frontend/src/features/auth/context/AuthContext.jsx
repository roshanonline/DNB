import React, { createContext, useState, useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../../shared/services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const getSessionRole = (currentUser) => {
    const stored = sessionStorage.getItem('role')
    if (stored) return stored.toUpperCase()
    return currentUser?.role?.toUpperCase() || null
  }

  const getHomePath = (currentUser, sessionRole = null) => {
    const userRole = currentUser?.role?.toUpperCase()
    const effectiveSessionRole = (sessionRole || getSessionRole(currentUser) || '').toUpperCase()

    if (userRole === 'ADMIN') return '/admin'
    if (userRole === 'DEPARTMENT') {
      return effectiveSessionRole === 'STAFF' ? '/staff' : '/department'
    }
    if (userRole === 'STUDENT') return '/student'
    return '/login'
  }

  // On mount — restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const storedUser = localStorage.getItem('user')
    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        const sessionRole = getSessionRole(parsedUser)
        setUser(parsedUser)
        if (sessionRole) {
          sessionStorage.setItem('role', sessionRole)
        }
        setIsAuthenticated(true)
      } catch {
        localStorage.clear()
        sessionStorage.removeItem('role')
      }
    }
    setLoading(false)
  }, [])

  // ── DEMO CREDENTIALS ──────────────────────────────────
  //  Student    → username: student  | password: student123
  //  Department → username: cse_dept | password: dept123
  //  Admin      → username: admin    | password: admin123
  // ────────────────────────────────────────────────────

  const login = async (username, password, selectedRole, portalRole = null) => {
    try {
      const { data } = await api.post('/token/', {
        username,
        password,
        portal_role: portalRole,
      })
      const { access, refresh, user: userData } = data

      // Validate that user role matches selected role if provided
      if (selectedRole && userData.role?.toUpperCase() !== selectedRole?.toUpperCase()) {
        return { success: false, error: `This account is a ${userData.role} account, not a ${selectedRole} account. Please select the correct role or use a different account.` }
      }

      // Persist tokens + user
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      localStorage.setItem('user', JSON.stringify(userData))

      const sessionRole = (data.session_role || portalRole || userData.role || '').toUpperCase()
      if (sessionRole) {
        sessionStorage.setItem('role', sessionRole)
      }

      // Commit state
      setUser(userData)
      setIsAuthenticated(true)

      // Navigate directly — localStorage is already written so ProtectedRoute passes
      navigate(getHomePath(userData, sessionRole), { replace: true })

      return { success: true }
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Invalid credentials. Please check username and password.'
      return { success: false, error: detail }
    }
  }

  const register = async (userData) => {
    try {
      const { data } = await api.post('/accounts/register/', userData)
      return { success: true, data }
    } catch (err) {
      const errors = err.response?.data
      const message = typeof errors === 'object'
        ? Object.values(errors).flat().join(' ')
        : 'Registration failed.'
      return { success: false, error: message }
    }
  }

  const logout = () => {
    localStorage.clear()
    sessionStorage.removeItem('role')
    setUser(null)
    setIsAuthenticated(false)
    navigate('/login')
  }

  const updateUser = (updates) => {
    const updated = { ...user, ...updates }
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
  }

  const value = {
    user,
    sessionRole: getSessionRole(user),
    getHomePath,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated,
    loading,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
