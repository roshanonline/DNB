import React, { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import ProtectedRoute from '../shared/components/ProtectedRoute'

import Login from '../features/auth/pages/Login'
const StudentDashboard = lazy(() => import('../features/student/pages/StudentDashboard'))
const StudentProfile = lazy(() => import('../features/student/pages/StudentProfile'))
const StudentLoginHistory = lazy(() => import('../features/student/pages/LoginHistory'))
const DepartmentDashboard = lazy(() => import('../features/department/pages/DepartmentDashboard'))
const DepartmentProfile = lazy(() => import('../features/department/pages/DepartmentProfile'))
const HodAccess = lazy(() => import('../features/department/pages/HodAccess'))
const TimetableGenerator = lazy(() => import('../features/department/pages/TimetableGenerator'))
const AdminDashboard = lazy(() => import('../features/admin/pages/AdminDashboard'))
const AdminLoginHistory = lazy(() => import('../features/admin/pages/LoginHistory'))
const NoticeDetail = lazy(() => import('../features/notice/pages/NoticeDetail'))
const StaffDashboard = lazy(() => import('../features/staff/pages/StaffDashboard'))

const AppRoutes = () => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-sky-50 text-sky-900">
          Loading...
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/profile"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/login-history"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentLoginHistory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/department"
          element={
            <ProtectedRoute allowedRoles={['DEPARTMENT']} allowedSessionRoles={['DEPARTMENT']}>
              <DepartmentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/department/profile"
          element={
            <ProtectedRoute allowedRoles={['DEPARTMENT']} allowedSessionRoles={['DEPARTMENT']}>
              <DepartmentProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/department/hod-access"
          element={
            <ProtectedRoute allowedRoles={['DEPARTMENT']} allowedSessionRoles={['DEPARTMENT']}>
              <HodAccess />
            </ProtectedRoute>
          }
        />

        <Route
          path="/department/timetable"
          element={
            <ProtectedRoute allowedRoles={['DEPARTMENT']} allowedSessionRoles={['DEPARTMENT']}>
              <TimetableGenerator />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={['DEPARTMENT']} allowedSessionRoles={['STAFF']}>
              <DepartmentProfile />
            </ProtectedRoute>
          }
        />

        <Route path="/staff-dashboard" element={<StaffDashboard />} />

        <Route
          path="/staff/profile"
          element={
            <ProtectedRoute allowedRoles={['DEPARTMENT']} allowedSessionRoles={['STAFF']}>
              <DepartmentProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/login-history"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminLoginHistory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notice/:id"
          element={
            <ProtectedRoute allowedRoles={['STUDENT', 'DEPARTMENT', 'ADMIN']}>
              <NoticeDetail />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
