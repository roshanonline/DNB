import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Search, Menu, Moon, Sun, User, LogOut, Check, CheckCheck, FileText, Image, Music, Video, Table2, Presentation, X } from 'lucide-react'
import { useAuth } from '../../features/auth/context/AuthContext'
import { useTheme } from '../../app/providers/ThemeProvider'
import api from '../services/api'

const Navbar = ({ onMenuClick, onNotificationClick }) => {
  const { user, sessionRole, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const notifRef = useRef(null)

  // Close notification panel when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifPanel(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch notifications on mount and every 60s
  useEffect(() => {
    if (!user) return
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [user])

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notices/my-notifications/')
      setNotifications(data.notifications || data || [])
      setUnreadCount((data.unread_count !== undefined ? data.unread_count : (data.notifications || data || []).filter(n => !n.is_read).length))
    } catch {
      // silently ignore if endpoint not available
    }
  }

  const markAllRead = async () => {
    try {
      await api.post('/notices/my-notifications/mark-read/')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {}
  }

  const markOneRead = async (notif) => {
    try {
      await api.post(`/notices/my-notifications/${notif.id}/read/`)
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {}
    if (notif.notice_id && onNotificationClick) {
      // Call the callback to open modal instead of navigating
      onNotificationClick(notif.notice_id)
      setShowNotifPanel(false)
    }
  }

  return (
    <nav className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-violet-100 dark:border-violet-900/30 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left - Logo & Menu */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
            >
              <Menu className="w-6 h-6 text-gray-700 dark:text-gray-200" />
            </button>
            
            <Link to="/" className="flex items-center space-x-2">
              <img
                src="/logo.png"
                alt="SmartBoard 360"
                className="w-10 h-10 object-contain rounded-lg"
                onError={(e) => {
                  e.target.onerror = null
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg items-center justify-center hidden">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="text-xl font-bold text-gray-800 dark:text-white hidden sm:block">
                SmartBoard 360
              </span>
            </Link>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifPanel(!showNotifPanel)}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Bell className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifPanel && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border dark:border-gray-700 z-50 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                    <div className="flex items-center space-x-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center space-x-1"
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>Mark all read</span>
                        </button>
                      )}
                      <button onClick={() => setShowNotifPanel(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-[420px] overflow-y-auto divide-y dark:divide-gray-700">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <Bell className="w-10 h-10 mb-2 opacity-30" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.slice(0, 50).map(notif => (
                        <button
                          key={notif.id}
                          onClick={() => markOneRead(notif)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                            !notif.is_read ? 'bg-violet-50/50 dark:bg-violet-900/10' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notif.is_read ? 'bg-violet-500' : 'bg-transparent'}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${!notif.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                {notif.title}
                              </p>
                              {notif.notice_title && (
                                <p className="text-xs text-violet-600 dark:text-violet-400 truncate mt-0.5">{notif.notice_title}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(notif.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {notif.is_read && <Check className="w-3 h-3 text-gray-300 flex-shrink-0 mt-1" />}
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="px-4 py-2 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{notifications.length} total • {unreadCount} unread</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {theme === 'dark' ? (
                <Sun className="w-6 h-6 text-yellow-400" />
              ) : (
                <Moon className="w-6 h-6 text-gray-700" />
              )}
            </button>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white font-semibold text-sm">
                    {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                  </span>
                </div>
                <span className="hidden sm:block text-gray-700 dark:text-gray-200 font-medium">
                  {user?.first_name || user?.username}
                </span>
              </button>

              {/* Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 border dark:border-gray-700">
                  {user?.role === 'STUDENT' && (
                    <Link
                      to="/student/profile"
                      className="flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </Link>
                  )}
                  {user?.role === 'DEPARTMENT' && (
                    <Link
                      to={sessionRole === 'STAFF' ? '/staff/profile' : '/department/profile'}
                      className="flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
