import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Building2, 
  Download, 
  Bookmark,
  Clock,
  Eye,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Share2,
  Printer,
  BookmarkCheck,
  Bell,
  X,
  Mail as MailIcon,
  Plus,
  FileText,
  Image,
  Music,
  Video,
  Table2,
  Presentation,
  File,
  Paperclip
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../shared/components/Navbar'
import api, { downloadFile } from '../../../shared/services/api'
import { useAuth } from '../../auth/context/AuthContext'

const NoticeDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [viewStartTime] = useState(Date.now())
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [reminderData, setReminderData] = useState({
    reminderDate: '',
    reminderTime: '',
    email: user?.email || '',
    notificationMethod: 'email'
  })
  const [reminderSuccess, setReminderSuccess] = useState(false)

  useEffect(() => {
    fetchNotice()
    // Log engagement (viewed) when leaving page
    return () => {
      const viewTime = (Date.now() - viewStartTime) / 1000
      if (id) {
        api.post(`/notices/${id}/engage/`, { viewed: true, view_time: viewTime }).catch(() => {})
      }
    }
  }, [id])

  const fetchNotice = async () => {
    try {
      setLoading(true)
      const { data } = await api.get(`/notices/${id}/`)
      setNotice(data)
      setIsSaved(data.is_saved || false)
      setIsBookmarked(data.is_bookmarked || false)
    } catch (error) {
      console.error('Error fetching notice:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      if (isSaved) {
        await api.delete(`/notices/${id}/save/`)
        setIsSaved(false)
      } else {
        await api.post(`/notices/${id}/save/`)
        setIsSaved(true)
      }
    } catch (error) {
      console.error('Error saving notice:', error)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleBookmark = async () => {
    try {
      if (isBookmarked) {
        await api.delete(`/notices/${id}/bookmark/`)
        setIsBookmarked(false)
      } else {
        await api.post(`/notices/${id}/bookmark/`)
        setIsBookmarked(true)
      }
    } catch (error) {
      console.error('Error bookmarking notice:', error)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: notice.title,
          text: notice.description,
          url: window.location.href
        })
      } catch (error) {
        console.log('Share cancelled')
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const handleSetReminder = async () => {
    if (!reminderData.reminderDate || !reminderData.reminderTime) {
      alert('Please select date and time for reminder')
      return
    }
    if (!reminderData.email) {
      alert('Please enter an email address')
      return
    }
    try {
      const reminderDatetime = `${reminderData.reminderDate}T${reminderData.reminderTime}:00`
      await api.post('/reminders/', {
        notice_id: parseInt(id),
        reminder_datetime: reminderDatetime,
        email: reminderData.email,
        message: reminderData.message || '',
      })
      setReminderSuccess(true)
      setTimeout(() => {
        setShowReminderModal(false)
        setReminderSuccess(false)
        setReminderData({ reminderDate: '', reminderTime: '', email: user?.email || '', notificationMethod: 'email' })
      }, 2000)
    } catch (error) {
      console.error('Error setting reminder:', error)
      alert('Failed to set reminder. Make sure you are logged in.')
    }
  }

  const getDeadlineStatus = () => {
    if (!notice?.deadline) return null
    const deadline = new Date(notice.deadline)
    const now = new Date()
    const diffTime = deadline - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return { text: 'Expired', color: 'text-red-600 bg-red-50 dark:bg-red-900/30', icon: AlertCircle }
    } else if (diffDays === 0) {
      return { text: 'Today', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30', icon: Clock }
    } else if (diffDays <= 3) {
      return { text: `${diffDays} days left`, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30', icon: Clock }
    } else {
      return { text: `${diffDays} days left`, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30', icon: CheckCircle }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-16 w-16 border-t-4 border-blue-500"
          />
        </div>
      </div>
    )
  }

  if (!notice) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[80vh]">
          <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
          <p className="text-xl text-gray-600 dark:text-gray-400">Notice not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH': return 'bg-gradient-to-r from-red-500 to-red-600'
      case 'MEDIUM': return 'bg-gradient-to-r from-orange-500 to-orange-600'
      default: return 'bg-gradient-to-r from-blue-500 to-blue-600'
    }
  }

  const getCategoryColor = (category) => {
    const colors = {
      'EXAM': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'SCHOLARSHIP': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'WORKSHOP': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'EVENT': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      'PLACEMENT': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'GENERAL': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    }
    return colors[category] || colors['GENERAL']
  }

  const deadlineStatus = getDeadlineStatus()
  const DeadlineIcon = deadlineStatus?.icon

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="inline-flex items-center space-x-2 rounded-xl px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-white hover:text-blue-600 dark:hover:bg-gray-800/80 dark:hover:text-blue-400 mb-5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </motion.button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-8"
          >
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-200/70 dark:border-gray-700/80 overflow-hidden">
              {/* Priority Badge Header */}
              <div className={`${getPriorityColor(notice.priority)} px-6 py-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-bold text-sm uppercase tracking-wider">
                      {notice.priority} Priority
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(notice.category)}`}>
                      {notice.category}
                    </span>
                  </div>
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* Title Section */}
              <div className="px-8 py-6 border-b dark:border-gray-700">
                <h1 className="text-3xl lg:text-[42px] font-bold text-gray-900 dark:text-white mb-4 leading-tight tracking-tight">
                  {notice.title}
                </h1>
                
                {/* Meta Information */}
                <div className="flex flex-wrap gap-4">
                  {notice.department_name && (
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <Building2 className="w-4 h-4" />
                      <span className="text-sm font-medium">{notice.department_name}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <User className="w-4 h-4" />
                    <span className="text-sm">{notice.created_by_name || 'Admin User'}</span>
                  </div>
                  {notice.deadline && deadlineStatus && (
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${deadlineStatus.color}`}>
                      <DeadlineIcon className="w-4 h-4" />
                      <span className="text-sm font-semibold">{deadlineStatus.text}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="px-8 py-6">
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed whitespace-pre-wrap break-words">
                    {notice.description}
                  </p>
                </div>
              </div>

              {/* Attachments Section */}
              {(notice.attachments?.length > 0 || notice.attachment) && (
                <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 border-t dark:border-gray-600">
                  <div className="flex items-center space-x-2 mb-4">
                    <Paperclip className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Attachments {notice.attachments?.length > 0 && `(${notice.attachments.length})`}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {/* New-style multiple attachments */}
                    {notice.attachments?.map((att) => {
                      const iconMap = {
                        PDF: { Icon: FileText, color: 'text-red-600 bg-red-100 dark:bg-red-900/30', label: 'PDF' },
                        IMAGE: { Icon: Image, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', label: 'Image' },
                        AUDIO: { Icon: Music, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30', label: 'Audio' },
                        VIDEO: { Icon: Video, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30', label: 'Video' },
                        CSV: { Icon: Table2, color: 'text-green-600 bg-green-100 dark:bg-green-900/30', label: 'CSV' },
                        EXCEL: { Icon: Table2, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30', label: 'Excel' },
                        PPT: { Icon: Presentation, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30', label: 'PPT' },
                        OTHER: { Icon: File, color: 'text-gray-600 bg-gray-100 dark:bg-gray-700', label: 'File' },
                      }
                      const { Icon, color, label } = iconMap[att.file_type] || iconMap['OTHER']
                      return (
                        <div key={att.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-4 py-3 shadow-sm">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className={`p-2 rounded-lg ${color}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{att.file_name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{label} • {att.file_size_display}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => downloadFile(`http://localhost:8000${att.file_url}`, att.file_name)}
                            className="flex-shrink-0 ml-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center space-x-1.5"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                          </button>
                        </div>
                      )
                    })}

                    {/* Legacy single attachment fallback */}
                    {!notice.attachments?.length && notice.attachment && (
                      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-4 py-3 shadow-sm">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg text-blue-600 bg-blue-100 dark:bg-blue-900/30">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Attachment</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Document</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadFile(`http://localhost:8000${notice.attachment}`, 'attachment')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center space-x-1.5"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer Stats */}
              <div className="px-8 py-4 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-600">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                  <div className="flex items-center space-x-6 flex-wrap">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        ML Score: <span className="font-bold text-gray-900 dark:text-white">{Math.round(notice.ml_score * 100)}%</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Views: <span className="font-bold text-gray-900 dark:text-white">{notice.view_count || 1}</span>
                      </span>
                    </div>
                  </div>
                  <span className="text-gray-500 dark:text-gray-400">
                    Posted: {new Date(notice.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Sidebar ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-4 space-y-5 lg:sticky lg:top-24"
          >
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-200/70 dark:border-gray-700/80 overflow-hidden">
              <div className="px-6 py-4 border-b dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Quick Actions</h3>
              </div>
              <div className="p-4 space-y-3">
                {/* Save */}
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                    isSaved
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/30'
                      : 'bg-slate-100 dark:bg-slate-700 text-blue-700 dark:text-blue-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                  <span>{isSaved ? 'Saved!' : 'Save Notice'}</span>
                </motion.button>

                {/* Bookmark */}
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleBookmark}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                    isBookmarked
                      ? 'bg-violet-500 text-white shadow-md shadow-violet-200 dark:shadow-violet-900/30'
                      : 'bg-violet-100/70 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200/80 dark:hover:bg-violet-900/50'
                  }`}
                >
                  <Bookmark className="w-5 h-5" />
                  <span>{isBookmarked ? 'Bookmarked!' : 'Bookmark'}</span>
                </motion.button>

                {/* Set Reminder */}
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setShowReminderModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-all"
                >
                  <Bell className="w-5 h-5" />
                  <span>Set Reminder</span>
                </motion.button>

                {/* Share */}
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleShare}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-indigo-100/70 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200/80 dark:hover:bg-indigo-900/50 transition-all"
                >
                  <Share2 className="w-5 h-5" />
                  <span>Share</span>
                </motion.button>

                {/* Print */}
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handlePrint}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  <Printer className="w-5 h-5" />
                  <span>Print</span>
                </motion.button>
              </div>
            </div>

            {/* Deadline Card */}
            {notice.deadline && (
              <div className="bg-[#f4efe3] dark:bg-amber-900/20 rounded-3xl shadow-lg p-6 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-xl">
                    <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Deadline</h3>
                </div>
                <p className="text-2xl font-black text-orange-600 dark:text-orange-400 mb-1">
                  {new Date(notice.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {new Date(notice.deadline).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {deadlineStatus && (
                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${deadlineStatus.color}`}>
                    <DeadlineIcon className="w-4 h-4" />
                    {deadlineStatus.text}
                  </div>
                )}
              </div>
            )}

            {/* Notice Info */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-200/70 dark:border-gray-700/80 p-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Notice Info</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b dark:border-gray-700">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    notice.is_active
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {notice.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b dark:border-gray-700">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Scope</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {notice.is_global ? 'Institution-wide' : 'Department'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Priority</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getPriorityColor(notice.priority)}`}>
                    {notice.priority}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Reminder Modal */}
      <AnimatePresence>
        {showReminderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReminderModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-6 relative overflow-hidden"
            >
              {/* Header with gradient background */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 opacity-10"></div>
              
              <div className="relative z-10">
                {/* Close button */}
                <button
                  onClick={() => setShowReminderModal(false)}
                  className="absolute top-0 right-0 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Icon and Title */}
                <div className="flex flex-col items-center mb-6">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                    className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                  >
                    <Bell className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Set Reminder</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                    Get notified about this notice at your preferred time
                  </p>
                </div>

                {reminderSuccess ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex flex-col items-center py-8"
                  >
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">Reminder Set!</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">You'll be notified at the scheduled time</p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {/* Date Input */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Reminder Date
                      </label>
                      <input
                        type="date"
                        value={reminderData.reminderDate}
                        onChange={(e) => setReminderData({ ...reminderData, reminderDate: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 dark:text-white transition-all"
                      />
                    </div>

                    {/* Time Input */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Reminder Time
                      </label>
                      <input
                        type="time"
                        value={reminderData.reminderTime}
                        onChange={(e) => setReminderData({ ...reminderData, reminderTime: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 dark:text-white transition-all"
                      />
                    </div>

                    {/* Email Input */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={reminderData.email}
                          onChange={(e) => setReminderData({ ...reminderData, email: e.target.value })}
                          placeholder="your.email@example.com"
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 dark:text-white transition-all"
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Reminder will be sent to this email address</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowReminderModal(false)}
                        className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSetReminder}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg"
                      >
                        Set Reminder
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NoticeDetail
