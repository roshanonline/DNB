import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../../shared/components/Navbar'
import { useAuth } from '../../auth/context/AuthContext'
import { useTheme } from '../../../app/providers/ThemeProvider'
import api from '../../../shared/services/api'
import {
  User, Mail, Building2, Phone, FileText, Eye, TrendingUp,
  CheckCircle, Clock, AlertTriangle, Award, Activity, BarChart3,
  PieChart, Edit, Save, X, Camera, Shield, Layers, Calendar,
  ArrowLeft, Briefcase, BookOpen, Star, Sun, Wrench, AlignLeft,
  GraduationCap, Cpu,
  Users, Lock, EyeOff, Bell, Ban, Search, Send, KeyRound, UserCheck, UserX,
  Bookmark, BookmarkCheck, BellRing, Trash2, RefreshCw, UserPlus,
} from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

// ─── Animated Background (Dark Aurora) ───────────────────────────────────────
const AuroraOrb = ({ size, x, y, colors, delay, dur }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      width: size, height: size, left: `${x}%`, top: `${y}%`,
      background: `radial-gradient(circle, ${colors[0]}, ${colors[1]}, transparent 70%)`,
      filter: 'blur(80px)', willChange: 'transform, opacity',
    }}
    initial={{ opacity: 0, scale: 0.7 }}
    animate={{
      opacity: [0.3, 0.55, 0.3],
      scale: [1, 1.18, 1],
      x: [0, 25, -15, 0],
      y: [0, -20, 12, 0],
    }}
    transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }}
  />
)

const MeshGrid = () => (
  <motion.div className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 0.06 }} transition={{ duration: 2 }}>
    <svg width="100%" height="100%"><defs><pattern id="profGrid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0L0 0 0 50" fill="none" stroke="#0ea5e9" strokeWidth="0.5" /></pattern></defs><rect width="100%" height="100%" fill="url(#profGrid)" /></svg>
  </motion.div>
)

const Particle = ({ x, y, size, delay, dur }) => (
  <motion.div className="absolute rounded-full bg-sky-400 pointer-events-none" style={{ width: size, height: size, left: `${x}%`, top: `${y}%` }}
    animate={{ opacity: [0, 0.3, 0] }} transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }} />
)

const particles = Array.from({ length: 20 }, (_, i) => ({
  id: i, x: Math.random() * 100, y: Math.random() * 100,
  size: Math.random() * 2 + 1, delay: Math.random() * 5, dur: Math.random() * 4 + 3,
}))

const PageBg = () => {
  const { isDark } = useTheme()
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-sky-100 via-sky-50 to-blue-100'}`} />
      <AuroraOrb size={500} x={-5} y={-8} colors={isDark ? ['rgba(14,165,233,0.2)', 'rgba(56,189,248,0.06)'] : ['rgba(14,165,233,0.25)', 'rgba(56,189,248,0.08)']} delay={0} dur={16} />
      <AuroraOrb size={400} x={68} y={55} colors={isDark ? ['rgba(30,120,200,0.25)', 'rgba(56,150,230,0.08)'] : ['rgba(99,179,237,0.3)', 'rgba(147,210,252,0.1)']} delay={3} dur={18} />
      <AuroraOrb size={350} x={85} y={-5} colors={isDark ? ['rgba(20,100,180,0.3)', 'rgba(40,130,200,0.1)'] : ['rgba(186,230,255,0.4)', 'rgba(125,211,252,0.15)']} delay={1.5} dur={14} />
      <AuroraOrb size={280} x={12} y={70} colors={isDark ? ['rgba(14,100,180,0.25)', 'rgba(30,120,210,0.08)'] : ['rgba(125,211,252,0.3)', 'rgba(186,230,255,0.1)']} delay={4} dur={20} />
      <MeshGrid />
      {particles.map(p => <Particle key={p.id} {...p} />)}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-gradient-to-b from-sky-300/30 to-transparent rounded-full blur-3xl" />
    </div>
  )
}

// ─── Category config ─────────────────────────────────────────────────────────
const CAT_ICON = {
  Academic: BookOpen, Exam: Cpu, Event: Star, Placement: Briefcase,
  Holiday: Sun, Scholarship: Award, Workshop: Wrench, General: AlignLeft,
}
const CAT_COLORS = {
  Academic: '#3B82F6', Exam: '#EF4444', Event: '#8B5CF6', Placement: '#10B981',
  Holiday: '#F59E0B', Scholarship: '#F97316', Workshop: '#14B8A6', General: '#6B7280',
}

// Department full names
const DEPT_NAMES = {
  CSE: 'Computer Science & Engineering',
  ECE: 'Electronics & Communication Engineering',
  EEE: 'Electrical & Electronics Engineering',
  MECH: 'Mechanical Engineering',
  CIVIL: 'Civil Engineering',
  ALL: 'All Departments',
}

const YEAR_MAP = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': 'Final Year' }
const YEAR_COLORS = {
  '1': 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400',
  '2': 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
  '3': 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400',
  '4': 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
}

// ─── Section card wrapper ────────────────────────────────────────────────────
const GlassCard = ({ children, className = '', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
    className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-lg hover:shadow-sky-300/20 dark:hover:shadow-sky-900/30 border border-sky-200/60 dark:border-slate-700/60 hover:border-sky-400/40 dark:hover:border-sky-600/40 transition-all duration-300 ring-1 ring-sky-100/80 dark:ring-slate-700/50 ${className}`}
  >
    {children}
  </motion.div>
)

// ─── Stat mini-card ──────────────────────────────────────────────────────────
const MiniStat = ({ icon: Icon, label, value, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, type: 'spring', stiffness: 260, damping: 20 }}
    whileHover={{ y: -4, scale: 1.03, transition: { duration: 0.25 } }}
    className={`bg-gradient-to-br ${color} rounded-2xl p-5 text-white shadow-lg hover:shadow-2xl relative overflow-hidden group cursor-default transition-shadow`}
  >
    <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10 group-hover:scale-150 transition-transform duration-700" />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-2">
        <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">{label}</p>
        <motion.div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm" whileHover={{ rotate: 15 }}>
          <Icon className="w-4 h-4" />
        </motion.div>
      </div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
    </div>
  </motion.div>
)

// ═════════════════════════════════════════════════════════════════════════════
const DepartmentProfile = () => {
  const { user: authUser, sessionRole } = useAuth()
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', phone: '', bio: '' })
  const [activeSection, setActiveSection] = useState('overview')

  // ── Students tab state ────────────────────────────────────────────────────
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [visiblePasswords, setVisiblePasswords] = useState({})
  const [alertModal, setAlertModal] = useState({ open: false, student: null, title: 'Department Alert', message: '' })
  const [resetPwdModal, setResetPwdModal] = useState({ open: false, student: null, newPwd: '', result: null })
  const [blockConfirm, setBlockConfirm] = useState({ open: false, student: null })
  const [pendingStudents, setPendingStudents] = useState([])
  const [studentSubTab, setStudentSubTab] = useState('approved') // 'approved' | 'pending'
  const [actionLoading, setActionLoading] = useState(null)

  // ── Add student modal state ───────────────────────────────────────────────
  const [addStudentModal, setAddStudentModal] = useState(false)
  const [addStudentForm, setAddStudentForm] = useState({ first_name: '', last_name: '', email: '', roll_number: '', phone: '', aadhaar_number: '', year: '', date_of_birth: '' })
  const [addStudentError, setAddStudentError] = useState('')
  const [addStudentLoading, setAddStudentLoading] = useState(false)

  // ── Delete confirm state ──────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, student: null })
  const [viewStudent, setViewStudent] = useState(null)

  // ── Activity tab state ────────────────────────────────────────────────────
  const [savedNotices, setSavedNotices] = useState([])
  const [bookmarkedNotices, setBookmarkedNotices] = useState([])
  const [reminders, setReminders] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityLoaded, setActivityLoaded] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [profileRes, statsRes] = await Promise.allSettled([
        api.get('/accounts/profile/'),
        api.get('/notices/department/stats/'),
      ])

      if (profileRes.status === 'fulfilled') {
        const p = profileRes.value.data
        setProfile(p)
        setEditForm({ name: p.name || p.first_name || '', phone: p.phone || '', bio: p.bio || '' })
      } else {
        setProfile(authUser)
        setEditForm({ name: authUser?.first_name || '', phone: '', bio: '' })
      }

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data)
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
      setProfile(authUser)
    } finally {
      setLoading(false)
    }
  }, [authUser])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Lazy-load students when tab is opened ──────────────────────────────────
  const fetchStudents = useCallback(async () => {
    setStudentsLoading(true)
    try {
      const [approvedRes, pendingRes] = await Promise.allSettled([
        api.get('/accounts/department/students/'),
        api.get('/accounts/department/students/pending/'),
      ])
      if (approvedRes.status === 'fulfilled') setStudents(approvedRes.value.data)
      if (pendingRes.status === 'fulfilled') setPendingStudents(pendingRes.value.data)
    } catch (err) {
      console.error('Students fetch error:', err)
    } finally {
      setStudentsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeSection === 'students' && students.length === 0 && !studentsLoading) {
      fetchStudents()
    }
  }, [activeSection, students.length, studentsLoading, fetchStudents])

  // ── Approve or reject a pending student ──────────────────────────────────
  const handleApproveStudent = async (student, action) => {
    setActionLoading(`${action}_${student.id}`)
    try {
      await api.post(`/accounts/department/students/${student.id}/approve/`, { action })
      setPendingStudents(prev => prev.filter(s => s.id !== student.id))
      if (action === 'approve') {
        // Move to approved list
        setStudents(prev => [...prev, { ...student, is_approved: true, is_active: true }])
      }
    } catch {
      alert(`Failed to ${action} student.`)
    } finally {
      setActionLoading(null)
    }
  }

  // ── Lazy-load activity when tab is opened ─────────────────────────────────
  const fetchActivity = useCallback(async () => {
    setActivityLoading(true)
    try {
      const [savedRes, bookmarksRes, remindersRes] = await Promise.allSettled([
        api.get('/notices/saved/'),
        api.get('/notices/bookmarks/'),
        api.get('/reminders/'),
      ])
      if (savedRes.status === 'fulfilled') setSavedNotices(savedRes.value.data)
      if (bookmarksRes.status === 'fulfilled') setBookmarkedNotices(bookmarksRes.value.data)
      if (remindersRes.status === 'fulfilled') setReminders(remindersRes.value.data)
      setActivityLoaded(true)
    } catch (err) {
      console.error('Activity fetch error:', err)
    } finally {
      setActivityLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeSection === 'activity' && !activityLoaded && !activityLoading) {
      fetchActivity()
    }
  }, [activeSection, activityLoaded, activityLoading, fetchActivity])

  const handleDeleteReminder = async (reminderId) => {
    try {
      await api.delete(`/reminders/${reminderId}/`)
      setReminders(prev => prev.filter(r => r.id !== reminderId))
    } catch {
      alert('Failed to delete reminder.')
    }
  }

  const handleUnsaveNotice = async (noticeId) => {
    try {
      await api.delete(`/notices/${noticeId}/save/`)
      setSavedNotices(prev => prev.filter(s => s.notice.id !== noticeId))
    } catch {
      alert('Failed to unsave notice.')
    }
  }

  const handleUnbookmarkNotice = async (noticeId) => {
    try {
      await api.delete(`/notices/${noticeId}/bookmark/`)
      setBookmarkedNotices(prev => prev.filter(b => b.notice.id !== noticeId))
    } catch {
      alert('Failed to remove bookmark.')
    }
  }

  // ── Password auto-generator ───────────────────────────────────────────────
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  // ── Send alert to student ─────────────────────────────────────────────────
  const handleSendAlert = async () => {
    if (!alertModal.message.trim()) return
    setActionLoading('alert_' + alertModal.student.id)
    try {
      await api.post(`/accounts/department/students/${alertModal.student.id}/send-alert/`, {
        title: alertModal.title,
        message: alertModal.message,
      })
      setAlertModal({ open: false, student: null, title: 'Department Alert', message: '' })
    } catch {
      alert('Failed to send alert.')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Reset a student's password ────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!resetPwdModal.newPwd || resetPwdModal.newPwd.length < 4) {
      alert('Password must be at least 4 characters.')
      return
    }
    setActionLoading('reset_' + resetPwdModal.student.id)
    try {
      const { data } = await api.post(
        `/accounts/department/students/${resetPwdModal.student.id}/reset-password/`,
        { new_password: resetPwdModal.newPwd }
      )
      setResetPwdModal(p => ({ ...p, result: data.new_password }))
      setStudents(prev =>
        prev.map(s => s.id === resetPwdModal.student.id ? { ...s, initial_password: data.new_password } : s)
      )
    } catch {
      alert('Failed to reset password.')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Block / unblock a student ─────────────────────────────────────────────
  const handleToggleBlock = async (student) => {
    setActionLoading('block_' + student.id)
    try {
      const { data } = await api.post(`/accounts/users/${student.id}/toggle-block/`)
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_active: data.is_active } : s))
      setBlockConfirm({ open: false, student: null })
    } catch {
      alert('Failed to update student status.')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Add a student directly (department-created, auto-approved) ─────────
  const handleAddStudent = async () => {
    setAddStudentError('')
    const { first_name, last_name, email, roll_number, phone, aadhaar_number, year, date_of_birth } = addStudentForm
    if (!email || !roll_number) {
      setAddStudentError('Email and register number are required.')
      return
    }
    setAddStudentLoading(true)
    try {
      const { data } = await api.post('/accounts/department/students/add/', {
        first_name, last_name, email: email.toLowerCase(), roll_number, phone, aadhaar_number, year,
        date_of_birth: date_of_birth || null,
      })
      setStudents(prev => [...prev, data])
      setAddStudentModal(false)
      setAddStudentForm({ first_name: '', last_name: '', email: '', roll_number: '', phone: '', aadhaar_number: '', year: '', date_of_birth: '' })
    } catch (err) {
      setAddStudentError(err.response?.data?.error || 'Failed to add student.')
    } finally {
      setAddStudentLoading(false)
    }
  }

  // ── Permanently delete a student ─────────────────────────────────────────
  const handleDeleteStudent = async (student) => {
    setActionLoading('delete_' + student.id)
    try {
      await api.delete(`/accounts/department/students/${student.id}/delete/`)
      setStudents(prev => prev.filter(s => s.id !== student.id))
      setDeleteConfirm({ open: false, student: null })
    } catch {
      alert('Failed to delete student.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await api.patch('/accounts/profile/', {
        name: editForm.name,
        phone: editForm.phone,
        bio: editForm.bio,
      })
      setProfile(data)
      setEditing(false)
    } catch (err) {
      alert('Failed to save profile changes.')
    } finally {
      setSaving(false)
    }
  }

  // Derived data
  const deptName = DEPT_NAMES[profile?.department] || profile?.department || 'Department'
  const ownNotices = stats?.own_notices || []
  const byCat = stats?.by_category || {}
  const catLabels = Object.keys(byCat).filter(c => byCat[c] > 0)
  const catValues = catLabels.map(c => byCat[c])
  const catColors = catLabels.map(c => CAT_COLORS[c] || '#6B7280')

  const engBreak = stats?.engagement_breakdown || {}
  const totalInteractions = (engBreak.viewed || 0) + (engBreak.downloaded || 0) + (engBreak.bookmarked || 0) + (engBreak.shared || 0)

  // Charts
  const categoryDoughnut = {
    labels: catLabels,
    datasets: [{ data: catValues, backgroundColor: catColors, borderWidth: 2, borderColor: isDark ? '#1e293b' : '#ffffff' }],
  }

  const statusData = {
    labels: ['Approved', 'Pending', 'Rejected'],
    datasets: [{
      label: 'Notices',
      data: [stats?.approved || 0, stats?.pending || 0, stats?.rejected || 0],
      backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(245,158,11,0.8)', 'rgba(239,68,68,0.8)'],
      borderRadius: 8,
    }],
  }

  const tickColor = isDark ? '#94a3b8' : '#64748b'
  const gridColor = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(0,0,0,0.05)'
  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: tickColor }, grid: { color: gridColor } },
      y: { ticks: { color: tickColor }, grid: { color: gridColor } },
    },
  }
  const doughnutOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 }, color: isDark ? '#cbd5e1' : '#374151' } } }
  }

  // Sections
  const sections = [
    { id: 'overview',  label: 'Overview',  icon: Layers   },
    { id: 'analytics', label: 'Analytics',  icon: BarChart3 },
    { id: 'students',
      label: (
        <span className="flex items-center gap-1.5">
          Students
          {pendingStudents.length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
              {pendingStudents.length}
            </span>
          )}
        </span>
      ),
      icon: Users },
    { id: 'activity',  label: 'Activity',   icon: BellRing  },
  ]

  // Filtered student list
  const filteredStudents = students.filter(s => {
    if (!studentSearch) return true
    const q = studentSearch.toLowerCase()
    return (
      s.username.toLowerCase().includes(q) ||
      (s.name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.roll_number || '').toLowerCase().includes(q)
    )
  })

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-sky-50 dark:bg-slate-900 relative overflow-hidden">
      <PageBg />
      <motion.div className="relative z-10 flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-4 border-sky-300 border-t-sky-500" />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-sm font-medium text-sky-600">Loading profile...</motion.p>
      </motion.div>
    </div>
  )

  // ─── Main Render ───────────────────────────────────────────────────────────
  return (
      <div className="min-h-screen bg-sky-50 dark:bg-slate-900 relative">
      <PageBg />
      <Navbar />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(sessionRole === 'STAFF' ? '/staff' : '/department')}
          className="flex items-center gap-2 text-sm text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-200 mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </motion.button>

        {/* ─── Profile Hero Card ─── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 shadow-xl shadow-sky-500/25 mb-8 ring-1 ring-white/10"
        >
          {/* decorative circles */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute bottom-4 right-32 w-24 h-24 rounded-full bg-white/5" />
          <div className="absolute top-8 left-[60%] w-16 h-16 rounded-full bg-white/8" />

          <div className="relative z-10 p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Avatar */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="relative"
              >
                <div className="w-28 h-28 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/30 shadow-xl">
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt="Avatar" className="w-full h-full rounded-3xl object-cover" />
                  ) : (
                    <User className="w-14 h-14 text-white" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-lg bg-emerald-400 flex items-center justify-center ring-2 ring-white shadow-sm">
                  <Shield className="w-4 h-4 text-white" />
                </div>
              </motion.div>

              {/* Info */}
              <div className="text-white text-center md:text-left flex-1">
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold mb-1"
                >
                  {profile?.name || profile?.first_name || profile?.username || 'Department User'}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sky-200 text-sm font-medium mb-4"
                >
                  {deptName} &middot; Department Staff
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-sky-100"
                >
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4" /> {profile?.email || 'No email'}
                  </span>
                  {profile?.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4" /> {profile.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> {profile?.department || 'N/A'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> Joined {new Date(profile?.date_joined || Date.now()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                </motion.div>
              </div>

              {/* Edit button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-semibold transition-colors backdrop-blur-sm"
              >
                <Edit className="w-4 h-4" /> Edit Profile
              </motion.button>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-5 text-sm text-sky-100/80 max-w-2xl leading-relaxed"
              >
                {profile.bio}
              </motion.p>
            )}
          </div>
        </motion.div>

        {/* ─── Section Tabs ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-sky-200/60 dark:border-slate-700/60 mb-8 p-1.5 ring-1 ring-sky-100/80 dark:ring-slate-700/50"
        >
          <div className="flex items-center gap-1">
            {sections.map(s => {
              const active = activeSection === s.id
              return (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className={"relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all " +
                    (active ? "text-white" : "text-sky-700 dark:text-sky-300 hover:bg-sky-100/80 dark:hover:bg-slate-700/80 hover:text-sky-900 dark:hover:text-white")}>
                  {active && (
                    <motion.div layoutId="profileTab" className="absolute inset-0 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl shadow-lg shadow-sky-500/25"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }} />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <s.icon className="w-4 h-4" /> {s.label}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* ─── Section Content ─── */}
        <AnimatePresence mode="wait">
          {/* ═══ OVERVIEW ═══ */}
          {activeSection === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <MiniStat icon={FileText} label="Total Notices" value={ownNotices.length} color="from-sky-400 to-blue-600" delay={0.1} />
                <MiniStat icon={CheckCircle} label="Approved" value={stats?.approved || 0} color="from-emerald-500 to-green-600" delay={0.15} />
                <MiniStat icon={Eye} label="Total Views" value={stats?.total_views || 0} color="from-cyan-500 to-teal-600" delay={0.2} />
                <MiniStat icon={Activity} label="Interactions" value={totalInteractions} color="from-fuchsia-500 to-pink-600" delay={0.25} />
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Personal Info */}
                <GlassCard className="p-6" delay={0.3}>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-5">
                    <User className="w-4 h-4 text-sky-600" /> Personal Information
                  </h3>
                  <div className="space-y-4">
                    {[
                      { icon: User, label: 'Full Name', value: profile?.name || profile?.first_name || profile?.username },
                      { icon: Mail, label: 'Email', value: profile?.email },
                      { icon: Building2, label: 'Department', value: deptName },
                      { icon: Shield, label: 'Role', value: 'Department Staff' },
                      { icon: Phone, label: 'Phone', value: profile?.phone || 'Not provided' },
                      { icon: Calendar, label: 'Member Since', value: new Date(profile?.date_joined || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
                    ].map((item, i) => (
                      <motion.div key={item.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-sky-50/80 dark:bg-slate-700/60 border border-sky-200/60 dark:border-slate-600/40"
                      >
                        <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-4 h-4 text-sky-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-sky-500 dark:text-sky-400 font-medium">{item.label}</p>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{item.value}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>

                {/* Notice Status */}
                <GlassCard className="p-6" delay={0.35}>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-5">
                    <BarChart3 className="w-4 h-4 text-sky-600" /> Notice Status
                  </h3>

                  {/* Status summary */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { label: 'Approved', val: stats?.approved || 0, cls: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400', icon: CheckCircle },
                      { label: 'Pending', val: stats?.pending || 0, cls: 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400', icon: Clock },
                      { label: 'Rejected', val: stats?.rejected || 0, cls: 'bg-red-500/10 border border-red-500/20 text-red-400', icon: AlertTriangle },
                    ].map((s, i) => (
                      <motion.div key={s.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 + i * 0.08 }}
                        className={`${s.cls} rounded-xl p-4 text-center`}
                      >
                        <s.icon className="w-5 h-5 mx-auto mb-1 opacity-70" />
                        <p className="text-2xl font-bold">{s.val}</p>
                        <p className="text-xs font-medium opacity-70">{s.label}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Status bar chart */}
                  <div className="h-44">
                    <Bar data={statusData} options={chartOpts} />
                  </div>
                </GlassCard>
              </div>

              {/* Engagement Summary */}
              <GlassCard className="p-6" delay={0.4}>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-5">
                    <TrendingUp className="w-4 h-4 text-sky-600" /> Student Engagement Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Views', val: engBreak.viewed || 0, icon: Eye, color: 'bg-blue-500/10 border border-blue-500/20 text-blue-400' },
                    { label: 'Downloads', val: engBreak.downloaded || 0, icon: TrendingUp, color: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' },
                    { label: 'Bookmarks', val: engBreak.bookmarked || 0, icon: Award, color: 'bg-amber-500/10 border border-amber-500/20 text-amber-400' },
                    { label: 'Shares', val: engBreak.shared || 0, icon: Activity, color: 'bg-rose-500/10 border border-rose-500/20 text-rose-400' },
                  ].map((s, i) => (
                    <motion.div key={s.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.08 }}
                      whileHover={{ y: -2 }}
                      className={`${s.color} rounded-xl p-4 text-center transition-all cursor-default`}
                    >
                      <s.icon className="w-6 h-6 mx-auto mb-2 opacity-70" />
                      <p className="text-2xl font-bold">{s.val}</p>
                      <p className="text-xs font-medium opacity-70">{s.label}</p>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* ═══ ANALYTICS ═══ */}
          {activeSection === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Category Distribution */}
                <GlassCard className="p-6" delay={0.1}>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                    <PieChart className="w-4 h-4 text-sky-600" /> Category Distribution
                  </h3>
                  {catLabels.length > 0 ? (
                    <div className="h-56"><Doughnut data={categoryDoughnut} options={doughnutOpts} /></div>
                  ) : (
                    <div className="h-56 flex items-center justify-center text-gray-500 dark:text-slate-400 text-sm">No data yet</div>
                  )}
                </GlassCard>

                {/* Student Engagement */}
                <GlassCard className="p-6" delay={0.15}>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-sky-600" /> Student Engagement
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-400">Active Students</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {stats?.active_students ?? 0}/{stats?.total_students ?? 0}
                        </span>
                      </div>
                      <div className="h-2.5 bg-sky-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: (stats?.total_students > 0 ? Math.round((stats.active_students / stats.total_students) * 100) : 0) + '%' }}
                          transition={{ duration: 1, delay: 0.3 }}
                          className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full"
                        />
                      </div>
                    </div>

                    {(stats?.high_risk_students ?? 0) > 0 && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span><strong>{stats.high_risk_students}</strong> students with zero engagement</span>
                      </div>
                    )}

                    <div className="space-y-2 pt-2">
                      {[
                        { label: 'Total Interactions', val: totalInteractions, color: 'text-sky-600 dark:text-sky-400' },
                        { label: 'Views', val: engBreak.viewed || 0, color: 'text-blue-600 dark:text-blue-400' },
                        { label: 'Downloads', val: engBreak.downloaded || 0, color: 'text-emerald-600 dark:text-emerald-400' },
                        { label: 'Bookmarks', val: engBreak.bookmarked || 0, color: 'text-amber-600 dark:text-amber-400' },
                        { label: 'Shares', val: engBreak.shared || 0, color: 'text-rose-500 dark:text-rose-400' },
                      ].map(s => (
                        <div key={s.label} className="flex justify-between text-xs py-1.5 border-b border-sky-200/60 dark:border-slate-600/40 last:border-0">
                          <span className="text-sky-500 dark:text-sky-400">{s.label}</span>
                          <span className={`font-bold ${s.color}`}>{s.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Notice Performance */}
              <GlassCard className="p-6" delay={0.2}>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-sky-600" /> Top Performing Notices
                </h3>
                {(stats?.top_notices?.length ?? 0) > 0 ? (
                  <div className="h-56">
                    <Bar
                      data={{
                        labels: (stats.top_notices || []).map(n => n.title?.substring(0, 20) + (n.title?.length > 20 ? '...' : '')),
                        datasets: [{
                          label: 'Views',
                          data: (stats.top_notices || []).map(n => n.view_count || 0),
                          backgroundColor: 'rgba(14,165,233,0.7)',
                          borderRadius: 8,
                        }],
                      }}
                      options={chartOpts}
                    />
                  </div>
                ) : (
                  <div className="h-56 flex items-center justify-center text-gray-500 dark:text-slate-400 text-sm">No view data yet</div>
                )}
              </GlassCard>
            </motion.div>
          )}

          {/* ═══ STUDENTS ═══ */}
          {activeSection === 'students' && (
            <motion.div key="students" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">

              {/* ── Pending Approvals Banner ─────── */}
              {pendingStudents.length > 0 && (
                <GlassCard className="p-5 border-amber-300/60 dark:border-amber-600/40 bg-amber-50/60 dark:bg-amber-900/10" delay={0}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Pending Approvals
                      <span className="bg-amber-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{pendingStudents.length}</span>
                    </h3>
                    <div className="flex gap-2">
                      <button onClick={() => setStudentSubTab('pending')}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                          studentSubTab === 'pending' ? 'bg-amber-500 text-white' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200'
                        }`}>Pending ({pendingStudents.length})</button>
                      <button onClick={() => setStudentSubTab('approved')}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                          studentSubTab === 'approved' ? 'bg-sky-500 text-white' : 'bg-sky-100 dark:bg-slate-700 text-sky-700 dark:text-sky-300 hover:bg-sky-200'
                        }`}>Approved ({students.length})</button>
                    </div>
                  </div>

                  {studentSubTab === 'pending' && (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                      {pendingStudents.map((student, idx) => (
                        <motion.div key={student.id}
                          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                          className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-amber-200/60 dark:border-amber-700/30">
                          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span
                                className="text-base font-bold text-gray-800 dark:text-gray-100 cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors"
                                onClick={() => setViewStudent(student)}
                              >{student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.username}</span>
                              {student.roll_number && (
                                <span className="text-sm px-2.5 py-0.5 bg-sky-100 dark:bg-slate-600 text-sky-700 dark:text-sky-300 rounded-md font-semibold font-mono">{student.roll_number}</span>
                              )}
                              <span className="text-sm px-2.5 py-0.5 rounded-full font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">Pending</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-0.5">
                              {student.phone && (
                                <span className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                                  <span className="opacity-50">📞</span>{student.phone}
                                </span>
                              )}
                              <span className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                                <span className="opacity-50">✉</span>{student.email}
                              </span>
                            </div>
                            <p className="text-sm text-gray-400 dark:text-slate-500 mt-0.5">
                              Registered: {new Date(student.date_joined).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              disabled={!!actionLoading}
                              onClick={() => handleApproveStudent(student, 'approve')}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60">
                              {actionLoading === `approve_${student.id}` ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 rounded-full border-2 border-t-transparent border-white" />
                              ) : <UserCheck className="w-3.5 h-3.5" />}
                              Approve
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              disabled={!!actionLoading}
                              onClick={() => handleApproveStudent(student, 'reject')}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60">
                              {actionLoading === `reject_${student.id}` ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 rounded-full border-2 border-t-transparent border-white" />
                              ) : <UserX className="w-3.5 h-3.5" />}
                              Reject
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              )}

              {/* ── Approved Students list ─────────────── */}
              {(studentSubTab === 'approved' || pendingStudents.length === 0) && (
              <GlassCard className="p-6" delay={0.1}>
                {/* Header row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-600" />
                    {deptName} Students
                    <span className="text-xs text-sky-500 font-normal">({students.length} total)</span>
                  </h3>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <motion.button
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      onClick={() => { setAddStudentError(''); setAddStudentModal(true) }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-sky-500/25 hover:from-sky-400 hover:to-blue-500 transition-all whitespace-nowrap"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Add Student
                    </motion.button>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sky-400 pointer-events-none" />
                      <input
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        placeholder="Search by name, username, roll no…"
                        className="w-full pl-8 pr-4 py-2 rounded-xl bg-sky-50 dark:bg-slate-700 border border-sky-200 dark:border-slate-600 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-sky-500/30 focus:border-sky-300 outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Body */}
                {studentsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                      className="w-8 h-8 rounded-full border-4 border-sky-300 border-t-sky-500" />
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-16 text-sky-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">{studentSearch ? 'No students match your search' : 'No students in this department yet'}</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                    {filteredStudents.map((student, idx) => (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-sky-50/80 dark:bg-slate-700/60 border border-sky-200/60 dark:border-slate-600/40 hover:border-sky-300/80 dark:hover:border-sky-500/40 transition-all"
                      >
                        {/* Row number */}
                        <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-slate-600 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold text-sm flex-shrink-0">
                          {idx + 1}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          {/* Row 1: name + badges */}
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span
                              className="text-base font-bold text-gray-800 dark:text-gray-100 cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors"
                              onClick={() => setViewStudent(student)}
                            >{student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.username}</span>
                            {student.roll_number && (
                              <span className="text-sm px-2.5 py-0.5 bg-sky-100 dark:bg-slate-600 text-sky-700 dark:text-sky-300 rounded-md font-semibold font-mono">{student.roll_number}</span>
                            )}
                            {student.year && (
                              <span className={`text-sm px-2.5 py-0.5 rounded-full font-semibold ${YEAR_COLORS[student.year]}`}>
                                {YEAR_MAP[student.year]}
                              </span>
                            )}
                            <span className={`text-sm px-2.5 py-0.5 rounded-full font-semibold ${student.is_active ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400'}`}>
                              {student.is_active ? 'Active' : 'Blocked'}
                            </span>
                          </div>
                          {/* Row 2: phone + email */}
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-0.5">
                            {student.phone && (
                              <span className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                                <span className="opacity-50">📞</span>{student.phone}
                              </span>
                            )}
                            <span className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                              <span className="opacity-50">✉</span>{student.email}
                            </span>
                          </div>
                        </div>

                        {/* Password badge */}
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-700 border border-sky-200 dark:border-slate-600 rounded-xl px-3 py-1.5 flex-shrink-0">
                          <Lock className="w-3.5 h-3.5 text-sky-400" />
                          <span className="text-sm font-mono text-gray-700 dark:text-gray-200 min-w-[80px] select-all">
                            {visiblePasswords[student.id]
                              ? (student.initial_password || '(not set)')
                              : (student.initial_password ? '••••••••' : '(not set)')}
                          </span>
                          {student.initial_password && (
                            <button
                              onClick={() => setVisiblePasswords(p => ({ ...p, [student.id]: !p[student.id] }))}
                              className="text-sky-400 hover:text-sky-600 transition-colors"
                            >
                              {visiblePasswords[student.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <motion.button
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.93 }}
                            onClick={() => setAlertModal({ open: true, student, title: 'Department Alert', message: '' })}
                            className="p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg transition-colors"
                            title="Send Alert"
                          >
                            <Bell className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.93 }}
                            onClick={() => setResetPwdModal({ open: true, student, newPwd: '', result: null })}
                            className="p-2.5 bg-sky-50 dark:bg-slate-700 border border-sky-200 dark:border-slate-600 hover:bg-sky-100 dark:hover:bg-slate-600 text-sky-600 dark:text-sky-400 rounded-lg transition-colors"
                            title="Reset Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.93 }}
                            onClick={() => setBlockConfirm({ open: true, student })}
                            className={`p-2.5 rounded-lg border transition-colors ${student.is_active
                              ? 'bg-red-50 border-red-200 hover:bg-red-100 text-red-500'
                              : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-600'}`}
                            title={student.is_active ? 'Block Student' : 'Unblock Student'}
                          >
                            {student.is_active ? <Ban className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.93 }}
                            onClick={() => setDeleteConfirm({ open: true, student })}
                            className="p-2.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 dark:text-rose-400 rounded-lg transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </GlassCard>
              )}
            </motion.div>
          )}
          {/* ═══ ACTIVITY ═══ */}
          {activeSection === 'activity' && (
            <motion.div key="activity" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">

              {activityLoading ? (
                <div className="flex items-center justify-center py-24">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    className="w-10 h-10 rounded-full border-4 border-sky-300 border-t-sky-500" />
                </div>
              ) : (
                <>
                  {/* ── Saved Notices ── */}
                  <GlassCard className="p-6" delay={0.05}>
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                          <BookmarkCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        Saved Notices
                        <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">({savedNotices.length})</span>
                      </h3>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={fetchActivity}
                        className="p-1.5 text-sky-500 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-sky-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="Refresh">
                        <RefreshCw className="w-4 h-4" />
                      </motion.button>
                    </div>
                    {savedNotices.length === 0 ? (
                      <div className="text-center py-10 text-gray-400 dark:text-slate-500">
                        <BookmarkCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-medium">No saved notices yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {savedNotices.map((item, i) => {
                          const n = item.notice
                          const CatIcon = CAT_ICON[n.category] || AlignLeft
                          const catColor = CAT_COLORS[n.category] || '#6B7280'
                          return (
                            <motion.div key={item.id}
                              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                              className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-900/10 border border-emerald-200/60 dark:border-emerald-700/30 hover:border-emerald-400/50 transition-all group"
                            >
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: catColor + '20' }}>
                                <CatIcon className="w-4 h-4" style={{ color: catColor }} />
                              </div>
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/notice/${n.id}`)}>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{n.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: catColor + '15', color: catColor }}>{n.category}</span>
                                  {n.deadline && (
                                    <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> {new Date(n.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-gray-400 dark:text-slate-500 hidden sm:block">
                                  {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => handleUnsaveNotice(n.id)}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Remove from saved">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </motion.button>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </GlassCard>

                  {/* ── Bookmarked Notices ── */}
                  <GlassCard className="p-6" delay={0.1}>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-5">
                      <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Bookmark className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      Bookmarked Notices
                      <span className="text-xs font-normal text-purple-600 dark:text-purple-400">({bookmarkedNotices.length})</span>
                    </h3>
                    {bookmarkedNotices.length === 0 ? (
                      <div className="text-center py-10 text-gray-400 dark:text-slate-500">
                        <Bookmark className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-medium">No bookmarked notices yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {bookmarkedNotices.map((item, i) => {
                          const n = item.notice
                          const CatIcon = CAT_ICON[n.category] || AlignLeft
                          const catColor = CAT_COLORS[n.category] || '#6B7280'
                          return (
                            <motion.div key={item.id}
                              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                              className="flex items-center gap-3 p-3 rounded-xl bg-purple-50/60 dark:bg-purple-900/10 border border-purple-200/60 dark:border-purple-700/30 hover:border-purple-400/50 transition-all group"
                            >
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: catColor + '20' }}>
                                <CatIcon className="w-4 h-4" style={{ color: catColor }} />
                              </div>
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/notice/${n.id}`)}>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{n.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: catColor + '15', color: catColor }}>{n.category}</span>
                                  {n.deadline && (
                                    <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> {new Date(n.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-gray-400 dark:text-slate-500 hidden sm:block">
                                  {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => handleUnbookmarkNotice(n.id)}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Remove bookmark">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </motion.button>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </GlassCard>

                  {/* ── Reminders ── */}
                  <GlassCard className="p-6" delay={0.15}>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-5">
                      <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <BellRing className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      Reminders
                      <span className="text-xs font-normal text-orange-600 dark:text-orange-400">({reminders.length})</span>
                    </h3>
                    {reminders.length === 0 ? (
                      <div className="text-center py-10 text-gray-400 dark:text-slate-500">
                        <BellRing className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-medium">No reminders set yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {reminders.map((reminder, i) => {
                          const n = reminder.notice
                          const isPending = reminder.status === 'PENDING'
                          const isSent = reminder.status === 'SENT'
                          const dt = new Date(reminder.reminder_datetime)
                          const isOverdue = isPending && dt < new Date()
                          return (
                            <motion.div key={reminder.id}
                              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all group ${
                                isSent ? 'bg-emerald-50/60 dark:bg-emerald-900/10 border-emerald-200/60 dark:border-emerald-700/30'
                                : isOverdue ? 'bg-red-50/60 dark:bg-red-900/10 border-red-200/60 dark:border-red-700/30'
                                : 'bg-orange-50/60 dark:bg-orange-900/10 border-orange-200/60 dark:border-orange-700/30 hover:border-orange-400/50'
                              }`}
                            >
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                isSent ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                : isOverdue ? 'bg-red-100 dark:bg-red-900/30'
                                : 'bg-orange-100 dark:bg-orange-900/30'
                              }`}>
                                <BellRing className={`w-4 h-4 ${isSent ? 'text-emerald-500' : isOverdue ? 'text-red-500' : 'text-orange-500'}`} />
                              </div>
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => n && navigate(`/notice/${n.id}`)}>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                  {n?.title || 'Notice Deleted'}
                                </p>
                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                  <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    {' · '}
                                    {dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <span className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> {reminder.email}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                  isSent ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                  : isOverdue ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                                  : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                }`}>
                                  {isOverdue ? 'Overdue' : reminder.status}
                                </span>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => handleDeleteReminder(reminder.id)}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Delete reminder">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </motion.button>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </GlassCard>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Edit Profile Modal ─── */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setEditing(false)}
          >
            <motion.div
              initial={{ scale: 0.93, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.93, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden ring-1 ring-sky-200/60 dark:ring-slate-700/60 border border-sky-200/60 dark:border-slate-700/60"
            >
              {/* Modal header */}
              <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Edit className="w-5 h-5" /> Edit Profile
                  </h2>
                  <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal body */}
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-sky-200 dark:border-slate-600 rounded-xl bg-sky-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/40 outline-none transition placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1.5">Phone</label>
                  <input
                    value={editForm.phone}
                    onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-sky-200 dark:border-slate-600 rounded-xl bg-sky-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/40 outline-none transition placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1.5">Bio</label>
                  <textarea
                    rows={3}
                    value={editForm.bio}
                    onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-sky-200 dark:border-slate-600 rounded-xl bg-sky-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/40 outline-none transition placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-semibold hover:from-sky-400 hover:to-blue-500 transition-all shadow-lg shadow-sky-500/25 ring-1 ring-white/10 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
                  </motion.button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-5 py-2.5 bg-sky-50 dark:bg-slate-700 text-sky-700 dark:text-sky-300 rounded-xl font-medium hover:bg-sky-100 dark:hover:bg-slate-600 border border-sky-200 dark:border-slate-600 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Send Alert Modal ─── */}
      <AnimatePresence>
        {alertModal.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setAlertModal({ open: false, student: null, title: 'Department Alert', message: '' })}
          >
            <motion.div
              initial={{ scale: 0.93, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.93, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden ring-1 ring-amber-200/60 dark:ring-slate-700/60 border border-amber-200/60 dark:border-slate-700/60"
            >
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Bell className="w-5 h-5" /> Send Alert
                    </h2>
                    {alertModal.student && (
                      <p className="text-xs text-amber-100 mt-0.5">
                        To: <strong>{alertModal.student.name || alertModal.student.username}</strong>
                        <span className="font-mono ml-1">(@{alertModal.student.username})</span>
                      </p>
                    )}
                  </div>
                  <button onClick={() => setAlertModal({ open: false, student: null, title: 'Department Alert', message: '' })}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1.5">Alert Title</label>
                  <input
                    value={alertModal.title}
                    onChange={e => setAlertModal(p => ({ ...p, title: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-amber-200 dark:border-amber-700/40 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-amber-400/40 outline-none transition placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="e.g. Attendance Warning"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1.5">Message</label>
                  <textarea
                    rows={4}
                    value={alertModal.message}
                    onChange={e => setAlertModal(p => ({ ...p, message: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-amber-200 dark:border-amber-700/40 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-amber-400/40 outline-none transition placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                    placeholder="Write your message here…"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleSendAlert}
                    disabled={!alertModal.message.trim() || actionLoading === 'alert_' + alertModal.student?.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {actionLoading === 'alert_' + alertModal.student?.id ? 'Sending…' : 'Send Alert'}
                  </motion.button>
                  <button
                    onClick={() => setAlertModal({ open: false, student: null, title: 'Department Alert', message: '' })}
                    className="px-5 py-2.5 bg-sky-50 dark:bg-slate-700 text-sky-700 dark:text-sky-300 rounded-xl font-medium hover:bg-sky-100 dark:hover:bg-slate-600 border border-sky-200 dark:border-slate-600 transition-all"
                  >Cancel</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Reset Password Modal ─── */}
      <AnimatePresence>
        {resetPwdModal.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setResetPwdModal({ open: false, student: null, newPwd: '', result: null })}
          >
            <motion.div
              initial={{ scale: 0.93, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.93, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden ring-1 ring-sky-200/60 dark:ring-slate-700/60 border border-sky-200/60 dark:border-slate-700/60"
            >
              <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <KeyRound className="w-5 h-5" /> Reset Password
                    </h2>
                    {resetPwdModal.student && (
                      <p className="text-xs text-sky-100 mt-0.5">
                        For: <strong>{resetPwdModal.student.name || resetPwdModal.student.username}</strong>
                      </p>
                    )}
                  </div>
                  <button onClick={() => setResetPwdModal({ open: false, student: null, newPwd: '', result: null })}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                {resetPwdModal.result ? (
                  <div className="text-center py-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-7 h-7 text-emerald-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Password reset successfully!</p>
                    <div className="flex items-center gap-2 p-3 bg-sky-50 dark:bg-slate-700 border border-sky-200 dark:border-slate-600 rounded-xl mb-2">
                      <Lock className="w-4 h-4 text-sky-500 flex-shrink-0" />
                      <span className="flex-1 font-mono text-sm font-bold text-gray-800 dark:text-gray-100 select-all">{resetPwdModal.result}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(resetPwdModal.result)}
                        className="text-xs text-sky-600 hover:text-sky-800 font-semibold px-2 py-1 rounded-lg hover:bg-sky-100 transition-colors"
                      >Copy</button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">Share this password with the student securely.</p>
                    <button
                      onClick={() => setResetPwdModal({ open: false, student: null, newPwd: '', result: null })}
                      className="px-6 py-2.5 bg-sky-500 text-white rounded-xl font-medium hover:bg-sky-600 transition-all"
                    >Done</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1.5">New Password</label>
                      <div className="flex gap-2">
                        <input
                          value={resetPwdModal.newPwd}
                          onChange={e => setResetPwdModal(p => ({ ...p, newPwd: e.target.value }))}
                          className="flex-1 px-4 py-2.5 border border-sky-200 dark:border-slate-600 rounded-xl bg-sky-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-sky-500/40 outline-none transition placeholder-gray-400 dark:placeholder-gray-500"
                          placeholder="Enter new password (min 4 chars)"
                        />
                        <button
                          onClick={() => setResetPwdModal(p => ({ ...p, newPwd: generatePassword() }))}
                          className="px-3 py-2 bg-sky-100 dark:bg-slate-600 border border-sky-200 dark:border-slate-500 text-sky-600 dark:text-sky-400 rounded-xl text-xs font-semibold hover:bg-sky-200 dark:hover:bg-slate-500 transition-colors whitespace-nowrap"
                        >Auto Generate</button>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={handleResetPassword}
                        disabled={!resetPwdModal.newPwd || actionLoading === 'reset_' + resetPwdModal.student?.id}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-sky-500/25 disabled:opacity-50"
                      >
                        <KeyRound className="w-4 h-4" />
                        {actionLoading === 'reset_' + resetPwdModal.student?.id ? 'Resetting…' : 'Reset Password'}
                      </motion.button>
                      <button
                        onClick={() => setResetPwdModal({ open: false, student: null, newPwd: '', result: null })}
                        className="px-5 py-2.5 bg-sky-50 dark:bg-slate-700 text-sky-700 dark:text-sky-300 rounded-xl font-medium hover:bg-sky-100 dark:hover:bg-slate-600 border border-sky-200 dark:border-slate-600 transition-all"
                      >Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Student Detail View Modal ─── */}
      <AnimatePresence>
        {viewStudent && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setViewStudent(null)}
          >
            <motion.div
              initial={{ scale: 0.93, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.93, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-sky-200/60 dark:ring-slate-700/60 border border-sky-200/60 dark:border-slate-700/60"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-xl ring-2 ring-white/30">
                      {(viewStudent.name || viewStudent.first_name || viewStudent.username)?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white leading-tight">{viewStudent.name || `${viewStudent.first_name || ''} ${viewStudent.last_name || ''}`.trim() || viewStudent.username}</h2>
                      <p className="text-xs text-sky-100 font-mono">@{viewStudent.username}</p>
                    </div>
                  </div>
                  <button onClick={() => setViewStudent(null)}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {/* Year + Status badges */}
                <div className="flex gap-2 mt-3">
                  {viewStudent.year && (
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-white/20 text-white">
                      {YEAR_MAP[viewStudent.year]}
                    </span>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ viewStudent.is_active ? 'bg-emerald-400/30 text-white' : 'bg-red-400/30 text-white' }`}>
                    {viewStudent.is_active ? 'Active' : 'Blocked'}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-white/20 text-white">
                    {DEPT_NAMES[viewStudent.department] || viewStudent.department}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-2.5 max-h-[65vh] overflow-y-auto">
                {[
                  { label: 'Roll Number', value: viewStudent.roll_number || '—', icon: GraduationCap, mono: true },
                  { label: 'Academic Year', value: YEAR_MAP[viewStudent.year] || '—', icon: BookOpen },
                  { label: 'Email Address', value: viewStudent.email || '—', icon: Mail },
                  { label: 'Phone Number', value: viewStudent.phone || '—', icon: Phone },
                  { label: 'Date of Birth', value: viewStudent.date_of_birth ? new Date(viewStudent.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—', icon: Calendar },
                  { label: 'Aadhaar Number', value: viewStudent.aadhaar_number ? viewStudent.aadhaar_number.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : '—', icon: Shield, mono: true },
                  { label: 'Joined On', value: new Date(viewStudent.date_joined).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), icon: Calendar },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-sky-50/80 dark:bg-slate-700/60 border border-sky-100 dark:border-slate-600/40">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold text-sky-500 dark:text-sky-400 uppercase tracking-wider">{item.label}</p>
                      <p className={`text-sm font-semibold text-gray-800 dark:text-gray-100 truncate ${item.mono ? 'font-mono tracking-wider' : ''}`}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Add Student Modal ─── */}
      <AnimatePresence>
        {addStudentModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setAddStudentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.93, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.93, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden ring-1 ring-sky-200/60 dark:ring-slate-700/60 border border-sky-200/60 dark:border-slate-700/60"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5" /> Add New Student
                  </h2>
                  <button onClick={() => setAddStudentModal(false)}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-sky-100 mt-1">Student will be immediately approved. A temporary password is auto-generated — student can reset it at login.</p>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {addStudentError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-400 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {addStudentError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1.5">First Name</label>
                    <input
                      value={addStudentForm.first_name}
                      onChange={e => setAddStudentForm(p => ({ ...p, first_name: e.target.value }))}
                      placeholder="Arjun"
                      className="w-full px-3 py-2.5 border border-sky-200 dark:border-slate-600 rounded-xl bg-sky-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-sky-500/40 outline-none transition placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1.5">Last Name</label>
                    <input
                      value={addStudentForm.last_name}
                      onChange={e => setAddStudentForm(p => ({ ...p, last_name: e.target.value }))}
                      placeholder="Sharma"
                      className="w-full px-3 py-2.5 border border-sky-200 dark:border-slate-600 rounded-xl bg-sky-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-sky-500/40 outline-none transition placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1.5">Register Number <span className="text-red-400">*</span></label>
                  <input
                    value={addStudentForm.roll_number}
                    onChange={e => setAddStudentForm(p => ({ ...p, roll_number: e.target.value }))}
                    placeholder="e.g. 810022104011"
                    className="w-full px-4 py-2.5 border border-sky-200 dark:border-slate-600 rounded-xl bg-sky-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 text-sm font-mono focus:ring-2 focus:ring-sky-500/40 outline-none transition placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1.5">Email Address <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    value={addStudentForm.email}
                    onChange={e => setAddStudentForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="student@student.edu"
                    className="w-full px-4 py-2.5 border border-sky-200 dark:border-slate-600 rounded-xl bg-sky-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-sky-500/40 outline-none transition placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={addStudentForm.phone}
                    onChange={e => setAddStudentForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="e.g. 9876543210"
                    maxLength={15}
                    className="w-full px-4 py-2.5 border border-sky-200 dark:border-slate-600 rounded-xl bg-sky-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-sky-500/40 outline-none transition placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1.5">Aadhaar Card Number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={addStudentForm.aadhaar_number}
                    onChange={e => setAddStudentForm(p => ({ ...p, aadhaar_number: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
                    placeholder="12-digit Aadhaar number"
                    maxLength={12}
                    className="w-full px-4 py-2.5 border border-sky-200 dark:border-slate-600 rounded-xl bg-sky-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 text-sm font-mono tracking-widest focus:ring-2 focus:ring-sky-500/40 outline-none transition placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  {addStudentForm.aadhaar_number && addStudentForm.aadhaar_number.length < 12 && (
                    <p className="text-xs text-amber-500 mt-1">{12 - addStudentForm.aadhaar_number.length} more digits needed</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1.5">Academic Year</label>
                    <select
                      value={addStudentForm.year}
                      onChange={e => setAddStudentForm(p => ({ ...p, year: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-sky-200 dark:border-slate-600 rounded-xl bg-sky-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-sky-500/40 outline-none transition"
                    >
                      <option value="">Select year</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">Final Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1.5">Date of Birth</label>
                    <input
                      type="date"
                      value={addStudentForm.date_of_birth}
                      onChange={e => setAddStudentForm(p => ({ ...p, date_of_birth: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-sky-200 dark:border-slate-600 rounded-xl bg-sky-50 dark:bg-slate-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-sky-500/40 outline-none transition"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleAddStudent}
                    disabled={addStudentLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-semibold hover:from-sky-400 hover:to-blue-500 transition-all shadow-lg shadow-sky-500/25 disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    {addStudentLoading ? 'Adding…' : 'Add Student'}
                  </motion.button>
                  <button
                    onClick={() => setAddStudentModal(false)}
                    className="px-5 py-2.5 bg-sky-50 dark:bg-slate-700 text-sky-700 dark:text-sky-300 rounded-xl font-medium hover:bg-sky-100 dark:hover:bg-slate-600 border border-sky-200 dark:border-slate-600 transition-all"
                  >Cancel</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Delete Student Confirm Modal ─── */}
      <AnimatePresence>
        {deleteConfirm.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm({ open: false, student: null })}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-sm p-6 ring-1 ring-rose-200/60 dark:ring-slate-700/60 border border-rose-200/60 dark:border-slate-700/60"
            >
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-3">
                  <Trash2 className="w-7 h-7 text-rose-500" />
                </div>
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Delete Student?</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  This will permanently remove{' '}
                  <strong className="text-gray-700 dark:text-gray-200">
                    {deleteConfirm.student?.name || deleteConfirm.student?.username}
                  </strong>{' '}
                  and all their data. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => handleDeleteStudent(deleteConfirm.student)}
                  disabled={actionLoading === 'delete_' + deleteConfirm.student?.id}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-rose-500 to-red-600 shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
                >
                  {actionLoading === 'delete_' + deleteConfirm.student?.id ? 'Deleting…' : 'Yes, Delete'}
                </motion.button>
                <button
                  onClick={() => setDeleteConfirm({ open: false, student: null })}
                  className="px-5 py-2.5 bg-sky-50 dark:bg-slate-700 text-sky-700 dark:text-sky-300 rounded-xl font-medium hover:bg-sky-100 dark:hover:bg-slate-600 border border-sky-200 dark:border-slate-600 transition-all"
                >Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Block / Unblock Confirm Modal ─── */}
      <AnimatePresence>
        {blockConfirm.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setBlockConfirm({ open: false, student: null })}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-sm p-6 ring-1 ring-sky-200/60 dark:ring-slate-700/60 border border-sky-200/60 dark:border-slate-700/60"
            >
              <div className="text-center mb-5">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${blockConfirm.student?.is_active ? 'bg-red-100' : 'bg-emerald-100'}`}>
                  {blockConfirm.student?.is_active
                    ? <Ban className="w-7 h-7 text-red-500" />
                    : <UserCheck className="w-7 h-7 text-emerald-500" />}
                </div>
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
                  {blockConfirm.student?.is_active ? 'Block Student?' : 'Unblock Student?'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {blockConfirm.student?.is_active
                    ? `This will prevent ${blockConfirm.student?.name || blockConfirm.student?.username} from logging in.`
                    : `This will restore login access for ${blockConfirm.student?.name || blockConfirm.student?.username}.`}
                </p>
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => handleToggleBlock(blockConfirm.student)}
                  disabled={actionLoading === 'block_' + blockConfirm.student?.id}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 ${blockConfirm.student?.is_active
                    ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/25'
                    : 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/25'}`}
                >
                  {actionLoading === 'block_' + blockConfirm.student?.id
                    ? 'Processing…'
                    : blockConfirm.student?.is_active ? 'Yes, Block' : 'Yes, Unblock'}
                </motion.button>
                <button
                  onClick={() => setBlockConfirm({ open: false, student: null })}
                  className="px-5 py-2.5 bg-sky-50 dark:bg-slate-700 text-sky-700 dark:text-sky-300 rounded-xl font-medium hover:bg-sky-100 dark:hover:bg-slate-600 border border-sky-200 dark:border-slate-600 transition-all"
                >Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DepartmentProfile
