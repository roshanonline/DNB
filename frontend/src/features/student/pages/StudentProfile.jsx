import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../../shared/components/Navbar'
import { useAuth } from '../../auth/context/AuthContext'
import api from '../../../shared/services/api'
import wsService from '../../../shared/services/socket'
import {
  User,
  Mail,
  Building2,
  Calendar,
  Award,
  TrendingUp,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Activity,
  BarChart3,
  PieChart,
  Trophy,
  Bookmark,
  Bell,
  X,
  Phone,
  Hash,
  Cake,
  GraduationCap,
  Shield,
} from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend
} from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

const DEPT_NAMES = {
  CSE: 'Computer Science',
  ECE: 'Electronics & Comm.',
  EEE: 'Electrical & Electronics',
  MECH: 'Mechanical Engg.',
  CIVIL: 'Civil Engineering',
  ALL: 'All Departments',
}

const YEAR_MAP = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': 'Final Year' }
const YEAR_COLORS = {
  '1': 'bg-sky-400/90 text-sky-900',
  '2': 'bg-emerald-400/90 text-emerald-900',
  '3': 'bg-violet-400/90 text-violet-900',
  '4': 'bg-amber-400/90 text-amber-900',
}

const AnimatedStatCard = ({
  icon: Icon,
  trendIcon: TrendIcon,
  value,
  title,
  subtitle,
  gradient,
  accentText,
  delay,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 24, scale: 0.96 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, type: 'spring', stiffness: 260, damping: 20 }}
    whileHover={{ y: -8, scale: 1.025 }}
    className={`group relative overflow-hidden rounded-2xl shadow-lg p-6 text-white bg-gradient-to-br ${gradient}`}
  >
    <motion.div
      className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-white/15"
      animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.35, 0.2] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute -bottom-10 -left-8 h-24 w-24 rounded-full bg-black/10"
      animate={{ scale: [1, 1.12, 1], opacity: [0.25, 0.4, 0.25] }}
      transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
    />
    <motion.div
      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
      initial={{ x: '-140%', opacity: 0 }}
      whileHover={{ x: '140%', opacity: 1 }}
      transition={{ duration: 0.65, ease: 'easeInOut' }}
    />

    <div className="relative z-10">
      <div className="mb-4 flex items-center justify-between">
        <motion.div
          animate={{ y: [0, -2, 0], rotate: [0, -4, 4, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon className="h-10 w-10" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <TrendIcon className="h-6 w-6 opacity-80" />
        </motion.div>
      </div>

      <motion.div
        key={value}
        initial={{ opacity: 0.4, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-1 text-3xl font-bold"
      >
        {value}
      </motion.div>
      <p className="text-sm font-semibold text-white/90">{title}</p>
      <p className={`mt-2 text-sm ${accentText}`}>{subtitle}</p>
    </div>
  </motion.div>
)

const StudentProfile = () => {
  const { user: authUser } = useAuth()
  const [user, setUser] = useState(null)
  const navigate = useNavigate()
  const [savedNotices, setSavedNotices] = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const [reminders, setReminders] = useState([])
  const [allNotices, setAllNotices] = useState([])
  const [engagementLogs, setEngagementLogs] = useState([])
  const [cancellingId, setCancellingId] = useState(null)
  const [notifPrefs, setNotifPrefs] = useState({
    exam: true, event: true, academic: true, holiday: true,
    placement: true, scholarship: true, internship: true, workshop: true,
  })
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefsSaved, setPrefsSaved] = useState(false)
  const [prefsError, setPrefsError] = useState('')
  const refreshTimerRef = useRef(null)
  const [stats, setStats] = useState({
    totalNoticesViewed: 0,
    missedDeadlines: 0,
    engagementScore: 0,
    activeStreak: 0,
    totalNotices: 0,
    categoryBreakdown: {},
    recentActivity: []
  })
  const [loading, setLoading] = useState(true)

  const fetchProfileData = useCallback(async (silent = false) => {
    if (!authUser?.id) return
    try {
      if (!silent) setLoading(true)
      setUser(authUser)

      const dept = authUser?.department
      const noticesUrl = dept ? `/notices/?page_size=500&department=${dept}` : '/notices/?page_size=500'

      const [profileRes, savedRes, remindersRes, bookmarksRes, engRes, allNoticesRes, prefsRes] = await Promise.allSettled([
        api.get('/accounts/profile/'),
        api.get('/notices/saved/'),
        api.get('/reminders/'),
        api.get('/notices/bookmarks/'),
        api.get('/notices/engagement/'),
        api.get(noticesUrl),
        api.get('/accounts/notification-prefs/'),
      ])

      if (profileRes.status === 'fulfilled') {
        setUser(prev => ({ ...authUser, ...profileRes.value.data }))
      }

      const saved       = savedRes.status       === 'fulfilled' ? (savedRes.value.data.results       || savedRes.value.data)       : []
      const bks         = bookmarksRes.status   === 'fulfilled' ? (bookmarksRes.value.data.results   || bookmarksRes.value.data)   : []
      const eng         = engRes.status         === 'fulfilled' ? (engRes.value.data.results         || engRes.value.data)         : []
      const remindersData = remindersRes.status === 'fulfilled' ? (remindersRes.value.data.results   || remindersRes.value.data)   : []
      const allN        = allNoticesRes.status  === 'fulfilled' ? (allNoticesRes.value.data.results  || allNoticesRes.value.data)  : []


      setSavedNotices(saved)
      setBookmarks(bks)
      setReminders(remindersData)
      setEngagementLogs(eng)
      if (prefsRes.status === 'fulfilled') {
        setNotifPrefs(prev => ({ ...prev, ...prefsRes.value.data }))
      }
      setAllNotices(allN)

      // Build category breakdown from current DB notice rows visible to this student.
      const catBreakdown = {}
      allN.forEach(n => {
        const cat = n.category || 'General'
        catBreakdown[cat] = (catBreakdown[cat] || 0) + 1
      })

      const visibleNoticeIds = new Set(
        allN
          .map(n => Number(n.id))
          .filter(Number.isFinite)
      )
      const viewedNoticeIds = new Set(
        eng
          .filter(e => e.viewed && visibleNoticeIds.has(Number(e.notice)))
          .map(e => Number(e.notice))
      )
      const totalViewed = viewedNoticeIds.size
      const totalAll = allN.length
      const downloadCount = eng.filter(e => e.downloaded && visibleNoticeIds.has(Number(e.notice))).length
      const engagementPercent = totalAll > 0 ? Math.round((totalViewed / totalAll) * 100) : 0

      setStats({
        totalNoticesViewed: totalViewed,
        missedDeadlines:    remindersData.filter(r => r.status === 'PENDING').length,
        engagementScore:    Math.min(100, Math.round(engagementPercent * 0.85 + Math.min(downloadCount, 10) * 1.5)),
        activeStreak:       7,
        totalNotices:       totalAll,
        categoryBreakdown:  catBreakdown,
        recentActivity:     eng.slice(0, 5).map(e => ({
          action: `Viewed: ${e.notice_title || 'Notice'}`,
          type:   'view',
          date:   e.created_at,
        })),
      })
    } catch (error) {
      console.error('Error in fetchProfileData:', error)
      setUser(authUser)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [authUser])

  useEffect(() => {
    if (!authUser?.id) return

    fetchProfileData(false)

    // Fallback polling keeps DB-backed stats fresh even if websocket events are missed.
    refreshTimerRef.current = setInterval(() => {
      fetchProfileData(true)
    }, 30000)

    wsService.connect(authUser.id)
    const wsHandler = (msg) => {
      if (['new_notice', 'notice_deleted', 'notice_updated', 'emergency'].includes(msg?.type)) {
        fetchProfileData(true)
      }
    }
    wsService.addListener(wsHandler)

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
      wsService.removeListener(wsHandler)
      wsService.disconnect()
    }
  }, [authUser?.id, fetchProfileData])

  const handleSavePrefs = async () => {
    setSavingPrefs(true)
    setPrefsError('')
    setPrefsSaved(false)
    try {
      await api.put('/accounts/notification-prefs/', notifPrefs)
      setPrefsSaved(true)
      setTimeout(() => setPrefsSaved(false), 3000)
    } catch (err) {
      const detail = err?.response?.data
        ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data))
        : err.message || 'Unknown error'
      setPrefsError(`Save failed: ${detail}`)
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleCancelReminder = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Cancel this reminder?')) return
    setCancellingId(id)
    try {
      await api.delete(`/reminders/${id}/`)
      setReminders(prev => prev.filter(r => r.id !== id))
    } catch {
      alert('Failed to cancel reminder.')
    } finally {
      setCancellingId(null)
    }
  }

  const categoryData = {
    labels: ['Exam', 'Academic', 'Placement', 'Event', 'Holiday', 'Scholarship', 'Workshop', 'Internship', 'General'],
    datasets: [
      {
        label: 'Notices by Category',
        data: [
          stats.categoryBreakdown.Exam        || 0,
          stats.categoryBreakdown.Academic    || 0,
          stats.categoryBreakdown.Placement   || 0,
          stats.categoryBreakdown.Event       || 0,
          stats.categoryBreakdown.Holiday     || 0,
          stats.categoryBreakdown.Scholarship || 0,
          stats.categoryBreakdown.Workshop    || 0,
          stats.categoryBreakdown.Internship  || 0,
          stats.categoryBreakdown.General     || 0,
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(20, 184, 166, 0.8)',
          'rgba(99, 102, 241, 0.8)',
          'rgba(107, 114, 128, 0.8)',
        ]
      }
    ]
  }

  const engagementData = {
    labels: ['Viewed', 'Not Viewed'],
    datasets: [
      {
        data: [
          stats.totalNoticesViewed,
          Math.max(stats.totalNotices - stats.totalNoticesViewed, 0),
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ]
      }
    ]
  }

  const getEngagementLevel = (score) => {
    if (score >= 80) return { level: 'Excellent', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' }
    if (score >= 60) return { level: 'Good', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' }
    if (score >= 40) return { level: 'Average', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' }
    return { level: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' }
  }

  const engagement = getEngagementLevel(stats.engagementScore)
  const viewedRatioText = stats.totalNotices > 0
    ? `${((stats.totalNoticesViewed / stats.totalNotices) * 100).toFixed(1)}% of total`
    : '0% of total'

  const statCards = [
    {
      id: 'viewed',
      icon: Eye,
      trendIcon: TrendingUp,
      value: stats.totalNoticesViewed,
      title: 'Viewed Notices',
      subtitle: viewedRatioText,
      gradient: 'from-green-500 to-emerald-600',
      accentText: 'text-green-100/95',
    },
    {
      id: 'deadline',
      icon: AlertTriangle,
      trendIcon: Clock,
      value: stats.missedDeadlines,
      title: 'Deadline Alerts',
      subtitle: stats.missedDeadlines === 0 ? 'Perfect record!' : 'Needs attention',
      gradient: 'from-red-500 to-rose-600',
      accentText: 'text-red-100/95',
    },
    {
      id: 'engagement',
      icon: Target,
      trendIcon: Activity,
      value: `${stats.engagementScore}%`,
      title: 'Engagement Index',
      subtitle: `${engagement.level} performance`,
      gradient: 'from-blue-500 to-indigo-600',
      accentText: 'text-blue-100/95',
    },
    {
      id: 'streak',
      icon: Trophy,
      trendIcon: CheckCircle,
      value: stats.activeStreak,
      title: 'Active Streak',
      subtitle: 'Keep it up!',
      gradient: 'from-purple-500 to-violet-600',
      accentText: 'text-purple-100/95',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-16 w-16 border-t-4 border-blue-500"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            My Profile
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Your academic details, engagement stats &amp; activity
          </p>
        </motion.div>

        {/* ── Modern Profile Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl shadow-2xl mb-8"
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-700" />
          {/* Decorative blobs */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 left-16 w-44 h-44 rounded-full bg-white/10" />
          <div className="absolute top-8 right-48 w-16 h-16 rounded-full bg-white/5" />

          <div className="relative px-6 md:px-10 py-8">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">

              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-28 h-28 rounded-3xl bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center text-white font-black shadow-2xl select-none" style={{ fontSize: '3.2rem' }}>
                  {((user?.name || user?.first_name || user?.username || '?')[0]).toUpperCase()}
                </div>
              </div>

              {/* Name + Badges + Info Grid */}
              <div className="flex-1 text-white text-center lg:text-left min-w-0">
                <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight mb-0.5 truncate">
                  {user?.name ||
                    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
                    user?.username || 'Student'}
                </h2>
                <p className="text-white/55 font-mono text-sm mb-4">@{user?.username}</p>

                {/* Badge row */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-5">
                  <span className="bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    {DEPT_NAMES[user?.department] || user?.department || 'Department'}
                  </span>
                  {user?.year && (
                    <span className={`${YEAR_COLORS[user.year] || 'bg-white/20 text-white'} px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1`}>
                      <GraduationCap className="w-3.5 h-3.5" />
                      {YEAR_MAP[user.year]}
                    </span>
                  )}
                  <span className="bg-emerald-400/90 text-emerald-900 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Active
                  </span>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {user?.roll_number && (
                    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-4 py-3">
                      <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-0.5">Roll Number</p>
                      <p className="text-white font-bold text-sm truncate flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 opacity-70 shrink-0" />{user.roll_number}
                      </p>
                    </div>
                  )}
                  {user?.year && (
                    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-4 py-3">
                      <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-0.5">Academic Year</p>
                      <p className="text-white font-bold text-sm flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 opacity-70 shrink-0" />{YEAR_MAP[user.year]}
                      </p>
                    </div>
                  )}
                  {user?.email && (
                    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-4 py-3">
                      <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-0.5">Email</p>
                      <p className="text-white font-bold text-sm truncate flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 opacity-70 shrink-0" />{user.email}
                      </p>
                    </div>
                  )}
                  {user?.phone && (
                    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-4 py-3">
                      <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-0.5">Phone</p>
                      <p className="text-white font-bold text-sm flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 opacity-70 shrink-0" />{user.phone}
                      </p>
                    </div>
                  )}
                  {user?.date_of_birth && (
                    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-4 py-3">
                      <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-0.5">Date of Birth</p>
                      <p className="text-white font-bold text-sm flex items-center gap-1.5">
                        <Cake className="w-3.5 h-3.5 opacity-70 shrink-0" />
                        {new Date(user.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                  <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-4 py-3">
                    <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-0.5">Joined</p>
                    <p className="text-white font-bold text-sm flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 opacity-70 shrink-0" />
                      {new Date(user?.date_joined || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Engagement Score Card */}
              <div className={`${engagement.bg} rounded-2xl px-6 py-5 text-center shrink-0 shadow-xl border border-white/10`}>
                <Award className={`w-10 h-10 mx-auto mb-1.5 ${engagement.color}`} />
                <div className={`font-extrabold text-2xl ${engagement.color}`}>{stats.engagementScore}%</div>
                <div className={`font-semibold text-base mt-0.5 ${engagement.color}`}>{engagement.level}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Engagement Score</div>
              </div>

            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <AnimatedStatCard
              key={card.id}
              icon={card.icon}
              trendIcon={card.trendIcon}
              value={card.value}
              title={card.title}
              subtitle={card.subtitle}
              gradient={card.gradient}
              accentText={card.accentText}
              delay={0.2 + (index * 0.1)}
            />
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Notices by Category
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {DEPT_NAMES[user?.department] || user?.department || 'Your Department'} notices only
            </p>
            <div className="h-64">
              <Bar
                data={categoryData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: { beginAtZero: true }
                  }
                }}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center gap-2 mb-1">
              <PieChart className="w-6 h-6 text-purple-600" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Engagement Rate
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {DEPT_NAMES[user?.department] || user?.department || 'Your Department'} notices only
            </p>
            <div className="h-64 flex items-center justify-center">
              <Pie
                data={engagementData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        generateLabels: (chart) => {
                          const data = chart.data
                          return data.labels.map((label, i) => ({
                            text: `${label}: ${data.datasets[0].data[i]}`,
                            fillStyle: data.datasets[0].backgroundColor[i],
                            hidden: false,
                            index: i
                          }))
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </motion.div>
        </div>

        {/* Saved Notices and Reminders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Saved Notices */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <Bookmark className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Saved Notices
              </h3>
              <span className="ml-auto text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full font-semibold">
                {savedNotices.length}
              </span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {savedNotices.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Bookmark className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No saved notices yet</p>
                </div>
              ) : (
                savedNotices.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + index * 0.1 }}
                    className="group"
                  >
                    <div
                      onClick={() => navigate(`/notice/${item.notice?.id}`)}
                      className="block p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {item.notice?.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-1 rounded-full font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              {item.notice?.category}
                            </span>
                            {item.notice?.deadline && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(item.notice.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Reminders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <Bell className="w-6 h-6 text-orange-600" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Active Reminders
              </h3>
              <span className="ml-auto text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full font-semibold">
                {reminders.filter(r => r.status === 'PENDING').length}
              </span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {reminders.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No reminders set</p>
                </div>
              ) : (
                reminders.map((reminder, index) => {
                  const isSent = reminder.status === 'SENT'
                  return (
                    <motion.div
                      key={reminder.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.1 + index * 0.1 }}
                      onClick={() => reminder.notice?.id && navigate(`/notice/${reminder.notice.id}`)}
                      className={`p-4 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                        isSent
                          ? 'bg-gray-50 dark:bg-gray-700 opacity-70'
                          : 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="flex-1 font-semibold text-gray-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                          {reminder.notice?.title || 'Notice'}
                        </span>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          {isSent ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" /> Sent
                            </span>
                          ) : (
                            <button
                              onClick={(e) => handleCancelReminder(e, reminder.id)}
                              disabled={cancellingId === reminder.id}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 font-semibold transition-all disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              {cancellingId === reminder.id ? '...' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            {new Date(reminder.reminder_datetime).toLocaleString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: 'numeric', minute: '2-digit', hour12: true
                            })}
                          </span>
                        </div>
                        {reminder.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span>{reminder.email}</span>
                          </div>
                        )}
                        {reminder.notice?.category && (
                          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-medium">
                            {reminder.notice.category}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          </motion.div>
        </div>

        {/* ── Notification Preferences ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                  Notice Preferences
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Selected categories are prioritised in your dashboard feed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {prefsSaved && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4" /> Saved!
                </span>
              )}
              <button
                onClick={handleSavePrefs}
                disabled={savingPrefs}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-all"
              >
                {savingPrefs ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> Saving</>
                ) : 'Save Preferences'}
              </button>
            </div>
          </div>

          {/* Error banner */}
          {prefsError && (
            <div className="mx-5 mt-4 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="break-all">{prefsError}</span>
              <button onClick={() => setPrefsError('')} className="ml-auto text-red-400 hover:text-red-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Toggle Grid */}
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: 'placement',   label: 'Placement',    emoji: '💼',
                  on:  'bg-emerald-500 shadow-md shadow-emerald-200 dark:shadow-emerald-900/50 border-transparent',
                  off: 'bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600' },
                { key: 'scholarship', label: 'Scholarships', emoji: '🎓',
                  on:  'bg-orange-500 shadow-md shadow-orange-200 dark:shadow-orange-900/50 border-transparent',
                  off: 'bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600' },
                { key: 'internship',  label: 'Internships',  emoji: '🏢',
                  on:  'bg-indigo-500 shadow-md shadow-indigo-200 dark:shadow-indigo-900/50 border-transparent',
                  off: 'bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600' },
                { key: 'workshop',    label: 'Workshops',    emoji: '🛠️',
                  on:  'bg-teal-500 shadow-md shadow-teal-200 dark:shadow-teal-900/50 border-transparent',
                  off: 'bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600' },
                { key: 'academic',    label: 'Academic',     emoji: '📚',
                  on:  'bg-blue-500 shadow-md shadow-blue-200 dark:shadow-blue-900/50 border-transparent',
                  off: 'bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600' },
                { key: 'exam',        label: 'Exams',        emoji: '📝',
                  on:  'bg-red-500 shadow-md shadow-red-200 dark:shadow-red-900/50 border-transparent',
                  off: 'bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600' },
                { key: 'event',       label: 'Events',       emoji: '🎉',
                  on:  'bg-purple-500 shadow-md shadow-purple-200 dark:shadow-purple-900/50 border-transparent',
                  off: 'bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600' },
                { key: 'holiday',     label: 'Holidays',     emoji: '🏖️',
                  on:  'bg-amber-500 shadow-md shadow-amber-200 dark:shadow-amber-900/50 border-transparent',
                  off: 'bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600' },
              ].map(({ key, label, emoji, on, off }) => {
                const active = notifPrefs[key]
                return (
                  <button
                    key={key}
                    onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                    className={`group flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all duration-200 select-none ${active ? on : off}`}
                  >
                    <span className={`text-2xl transition-transform duration-200 ${active ? 'scale-110' : 'grayscale opacity-50 group-hover:opacity-70'}`}>
                      {emoji}
                    </span>
                    <span className={`text-xs font-semibold tracking-wide ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                      {label}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full transition-all ${active ? 'bg-white/60' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
              {Object.values(notifPrefs).filter(Boolean).length} of 8 active
              &nbsp;·&nbsp; Click to toggle · Save when done
            </div>
          </div>
        </motion.div>

        {/* Bookmarks */}
        {bookmarks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Bookmark className="w-6 h-6 text-purple-600" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Bookmarks</h3>
              <span className="ml-auto text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-3 py-1 rounded-full font-semibold">
                {bookmarks.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {bookmarks.map((bk, idx) => (
                <Link key={bk.id || idx} to={`/notice/${bk.notice?.id}`}
                  className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl hover:shadow-md transition-all group"
                >
                  <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 text-sm line-clamp-2">
                    {bk.notice?.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                      {bk.notice?.category}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(bk.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  )
}

export default StudentProfile
