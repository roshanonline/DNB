/**
 * App Component - Main Application Entry Point
 * 
 * This is the root component of the Digital Notice Board application.
 * It sets up routing, authentication, and theme management for the entire app.
 */

import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { AuthProvider } from './providers/AuthProvider'
import { ThemeProvider } from './providers/ThemeProvider'
import AppRoutes from './routes'

/**
 * Main App Component
 * 
 * Wraps the entire application with:
 * - Router: Handles navigation and URL routing
 * - ThemeProvider: Manages light/dark theme across the app
 * - AuthProvider: Manages user authentication state and JWT tokens
 */
function App() {
  return (
    <Router>
      {/* ThemeProvider enables theme switching throughout the app */}
      <ThemeProvider>
        {/* AuthProvider manages authentication state and user info */}
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  )
}

export default App
