import React, { useEffect, useState } from 'react'
import Navbar from '../../../shared/components/Navbar'
import { getAdminLoginActivity, getAdminLoginHistoryByRole } from '../../auth/api/loginHistoryApi'

const formatTime = (value) => (value ? new Date(value).toLocaleString('en-IN') : '—')

const statusClass = (status) => (
  status === 'FAILED'
    ? 'bg-red-100 text-red-700'
    : 'bg-emerald-100 text-emerald-700'
)

const ROLE_OPTIONS = ['ALL', 'STUDENT', 'DEPARTMENT', 'ADMIN', 'STAFF']

const AdminLoginHistory = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [role, setRole] = useState('ALL')

  const loadData = async (nextRole = role) => {
    setLoading(true)
    setError('')
    try {
      const response = nextRole === 'ALL'
        ? await getAdminLoginActivity({ limit: 200 })
        : await getAdminLoginHistoryByRole(nextRole, { limit: 200 })
      setItems(response.data || [])
    } catch (err) {
      setError('Unable to load login history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData('ALL')
  }, [])

  const handleRoleChange = (nextRole) => {
    setRole(nextRole)
    loadData(nextRole)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Login Activity</h1>
            <p className="text-sm text-slate-500">Audit log across all user types.</p>
          </div>
          <button
            type="button"
            onClick={() => loadData(role)}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold"
          >
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleRoleChange(opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${role === opt ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
            >
              {opt}
            </button>
          ))}
        </div>

        {loading && <div className="text-slate-500">Loading...</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}

        {!loading && !error && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Login Time</th>
                  <th className="text-left px-4 py-3">Logout Time</th>
                  <th className="text-left px-4 py-3">IP</th>
                  <th className="text-left px-4 py-3">Device</th>
                  <th className="text-left px-4 py-3">Browser</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan="9" className="px-4 py-6 text-center text-slate-500">
                      No login activity found.
                    </td>
                  </tr>
                )}
                {items.map((row) => (
                  <tr key={`${row.role}-${row.id}`} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-700">{row.role}</td>
                    <td className="px-4 py-3">{row.username || row.login_identifier || '—'}</td>
                    <td className="px-4 py-3">{formatTime(row.login_time)}</td>
                    <td className="px-4 py-3">{formatTime(row.logout_time)}</td>
                    <td className="px-4 py-3">{row.ip_address || '—'}</td>
                    <td className="px-4 py-3">{row.device_type || '—'}</td>
                    <td className="px-4 py-3">{row.browser || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass(row.login_status)}`}>
                        {row.login_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{row.failure_reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminLoginHistory
