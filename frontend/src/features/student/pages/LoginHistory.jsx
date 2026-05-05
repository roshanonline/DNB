import React, { useEffect, useState } from 'react'
import Navbar from '../../../shared/components/Navbar'
import { getMyLoginHistory } from '../../auth/api/loginHistoryApi'

const formatTime = (value) => (value ? new Date(value).toLocaleString('en-IN') : '—')

const statusClass = (status) => (
  status === 'FAILED'
    ? 'bg-red-100 text-red-700'
    : 'bg-emerald-100 text-emerald-700'
)

const StudentLoginHistory = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getMyLoginHistory({ limit: 100 })
      setItems(data || [])
    } catch (err) {
      setError('Unable to load login history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Login History</h1>
            <p className="text-sm text-slate-500">Your recent login activity.</p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold"
          >
            Refresh
          </button>
        </div>

        {loading && <div className="text-slate-500">Loading...</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}

        {!loading && !error && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
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
                    <td colSpan="7" className="px-4 py-6 text-center text-slate-500">
                      No login activity found.
                    </td>
                  </tr>
                )}
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
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

export default StudentLoginHistory
