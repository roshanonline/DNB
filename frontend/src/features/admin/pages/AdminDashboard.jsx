import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Users, FileText, Bell, Plus, Trash2,
  Building2, Activity, Send, Eye, Clock, Shield,
  BarChart3, RefreshCw, Calendar, CheckCircle, XCircle,
  Search, X, Zap, Edit3, Maximize2, Paperclip, Image,
  Tag, GraduationCap, Briefcase, Sun, Award, Wrench, BookOpen, Upload,
  Lock, Unlock, UserCheck, UserX, ChevronRight, EyeOff, AlertTriangle
} from 'lucide-react'
import Navbar from '../../../shared/components/Navbar'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler,
} from 'chart.js'
import api, { uploadAttachment } from '../../../shared/services/api'
import wsService from '../../../shared/services/socket'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, Title, Tooltip, Legend, ArcElement, Filler
)

const CAT_COLORS = {
  Academic: '#6366f1', Exam: '#ef4444', Event: '#8b5cf6',
  Placement: '#f59e0b', Holiday: '#10b981', Scholarship: '#3b82f6',
  Workshop: '#ec4899', General: '#6b7280',
}
const DEPT_COLORS = ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe','#7c3aed']

const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: '#1e1b4b', titleColor: '#e0e7ff', bodyColor: '#c7d2fe', padding: 10, cornerRadius: 8 },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
    y: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
  },
}
const doughnutOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right', labels: { color: '#94a3b8', padding: 12, font: { size: 11 } } },
    tooltip: { backgroundColor: '#1e1b4b', titleColor: '#e0e7ff', bodyColor: '#c7d2fe', padding: 10, cornerRadius: 8 },
  },
}

const StatCard = ({ label, value, sub, icon: Icon, grad, delay = 0 }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20, scale: 0.95 }} 
    animate={{ opacity: 1, y: 0, scale: 1 }} 
    transition={{ delay, type: "spring", stiffness: 300, damping: 25 }}
    whileHover={{ y: -8, scale: 1.02 }}
    className="relative overflow-hidden rounded-3xl p-8 shadow-xl text-white group cursor-pointer" 
    style={{ background: grad }}>
    
    {/* Animated background orbs */}
    <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-3xl group-hover:scale-150 transition-transform duration-500" />
    <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
    
    <div className="relative z-10">
      <p className="text-sm font-bold uppercase tracking-widest opacity-75 mb-2">{label}</p>
      <p className="text-6xl font-black leading-none mb-3">{value}</p>
      {sub && <p className="text-sm mt-2 opacity-80 font-medium">{sub}</p>}
    </div>
    
    <motion.div 
      className="absolute -right-6 -bottom-6 opacity-20 group-hover:opacity-40 transition-opacity"
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
    >
      <Icon className="w-32 h-32" strokeWidth={0.5} />
    </motion.div>
  </motion.div>
)

const ChartCard = ({ title, children, className = '' }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-8 shadow-lg border border-slate-200/60 dark:border-slate-700/50 ${className}`}>
    <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">{title}</p>
    {children}
  </motion.div>
)

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/60 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"

const statusBadge = s => ({
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PENDING:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}[s] || 'bg-gray-100 text-gray-600')

const priColor = p => ({
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  HIGH:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOW:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}[p] || 'bg-gray-100 text-gray-600')

const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const CAT_ICONS = {
  Academic: BookOpen, Exam: GraduationCap, Event: Calendar, Placement: Briefcase,
  Holiday: Sun, Scholarship: Award, Workshop: Wrench, General: FileText,
}
const CAT_GRADS = {
  Academic: 'from-indigo-500 to-violet-600', Exam: 'from-red-500 to-rose-600',
  Event: 'from-purple-500 to-fuchsia-600', Placement: 'from-amber-500 to-orange-600',
  Holiday: 'from-emerald-500 to-teal-600', Scholarship: 'from-blue-500 to-cyan-600',
  Workshop: 'from-pink-500 to-rose-600', General: 'from-slate-500 to-gray-600',
}

// 
const AdminDashboard = () => {
  const [data,         setData]         = useState(null)
  const [notices,      setNotices]      = useState([])
  const [pendingList,  setPendingList]  = useState([])
  const [staffPending, setStaffPending] = useState([])
  const [sysNotifs,    setSysNotifs]    = useState([])
  const [allStudents,  setAllStudents]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [lastUpdated,  setLastUpdated]  = useState(null)
  const [activeTab,    setActiveTab]    = useState('overview')
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterDept,   setFilterDept]   = useState('ALL')
  const [showCreate,   setShowCreate]   = useState(false)
  const [showEmergency,setShowEmergency]= useState(false)
  const [showStaffCreate, setShowStaffCreate] = useState(false)
  const [noticeForm,   setNoticeForm]   = useState({ title: '', description: '', category: 'General', deadline: '', department: 'ALL', priority: 'HIGH' })
  const [staffForm,    setStaffForm]    = useState({ title: '', description: '', category: 'General', department: 'ALL', is_urgent: false })
  const [staffAttachFiles, setStaffAttachFiles] = useState([])
  const [viewNotice,   setViewNotice]   = useState(null)
  const [editNotice,   setEditNotice]   = useState(null)
  const [editForm,     setEditForm]     = useState({})
  const [editSaving,   setEditSaving]   = useState(false)
  const [attachFiles,   setAttachFiles]  = useState([])
  const [showCredential, setShowCredential] = useState({})
  const [studentSearch,  setStudentSearch]  = useState('')
  const [studentYear,    setStudentYear]    = useState('ALL')
  const [studentDept,    setStudentDept]    = useState('ALL')
  const fileInputRef = useRef(null)
  const staffFileInputRef = useRef(null)
  const timerRef = useRef(null)

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [statsRes, sysRes, studentsRes, staffPendingRes] = await Promise.all([
        api.get('/notices/admin/stats/'),
        api.get('/notices/system-notifications/').catch(() => ({ data: [] })),
        api.get('/accounts/users/?role=STUDENT').catch(() => ({ data: [] })),
        api.get('/notices/staff-notices/pending-admin/').catch(() => ({ data: [] })),
      ])
      setData(statsRes.data)
      setNotices(statsRes.data.all_notices     || [])
      setPendingList(statsRes.data.pending_notices || [])
      setStaffPending(staffPendingRes.data || [])
      setSysNotifs(sysRes.data    || [])
      setAllStudents(studentsRes.data || [])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Admin fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    timerRef.current = setInterval(() => fetchAll(true), 30000)
    wsService.connect()
    const wsH = msg => {
      if (['new_notice', 'notice_deleted', 'notice_updated', 'emergency'].includes(msg.type)) fetchAll(true)
    }
    wsService.addListener(wsH)
    return () => {
      clearInterval(timerRef.current)
      wsService.removeListener(wsH)
      wsService.disconnect()
    }
  }, [fetchAll])

  // Lock body scroll when modal is open to prevent page shift
  useEffect(() => {
    if (viewNotice) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = scrollBarWidth + 'px'
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [viewNotice])

  const handleApprove = async id => {
    try {
      const { data: n } = await api.post(`/notices/${id}/approve/`, { action: 'approve' })
      setNotices(prev => prev.map(x => x.id === id ? n : x))
      setPendingList(prev => prev.filter(x => x.id !== id))
    } catch { alert('Failed to approve') }
  }

  const handleReject = async id => {
    try {
      const { data: n } = await api.post(`/notices/${id}/approve/`, { action: 'reject' })
      setNotices(prev => prev.map(x => x.id === id ? n : x))
      setPendingList(prev => prev.filter(x => x.id !== id))
    } catch { alert('Failed to reject') }
  }

  const handleDelete = async id => {
    if (!window.confirm('Delete this notice?')) return
    try { await api.delete(`/notices/${id}/`); setNotices(prev => prev.filter(x => x.id !== id)) }
    catch { alert('Delete failed') }
  }

  const openNoticeDetails = async (notice) => {
    if (!notice?.id) return
    try {
      const { data } = await api.get(`/notices/${notice.id}/`)
      setViewNotice(data)
    } catch {
      setViewNotice(notice)
    }
  }

  const handleCreate = async e => {
    e.preventDefault()
    try {
      const res = await api.post('/notices/', { ...noticeForm, is_featured: true, is_urgent: noticeForm.priority === 'URGENT' })
      const noticeId = res.data?.id
      // Upload attachments if any
      if (noticeId && attachFiles.length > 0) {
        for (const file of attachFiles) {
          const fd = new FormData()
          fd.append('file', file)
          await api.post(`/notices/${noticeId}/attachments/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        }
      }
      setShowCreate(false)
      setNoticeForm({ title: '', description: '', category: 'General', deadline: '', department: 'ALL', priority: 'HIGH' })
      setAttachFiles([])
      fetchAll(true)
    } catch { alert('Failed to create notice') }
  }

  const handleEmergency = async e => {
    e.preventDefault()
    try {
      await api.post('/notices/admin/broadcast/', { title: noticeForm.title || 'Emergency Alert', message: noticeForm.description })
      setShowEmergency(false)
      setNoticeForm({ title: '', description: '', category: 'General', deadline: '', department: 'ALL', priority: 'HIGH' })
      fetchAll(true)
    } catch { alert('Failed to send broadcast') }
  }

  const handleStaffCreate = async e => {
    e.preventDefault()
    try {
      const { data } = await api.post('/notices/staff-notices/', {
        title: staffForm.title,
        description: staffForm.description,
        category: staffForm.category,
        department: staffForm.department,
        is_urgent: staffForm.is_urgent,
      })
      if (data?.id && staffAttachFiles.length > 0) {
        for (const file of staffAttachFiles) {
          try {
            await uploadAttachment(data.id, file)
          } catch (err) {
            console.error('Upload failed:', file.name, err)
          }
        }
      }
      setShowStaffCreate(false)
      setStaffForm({ title: '', description: '', category: 'General', department: 'ALL', is_urgent: false })
      setStaffAttachFiles([])
    } catch { alert('Failed to create staff notice') }
  }

  const navigate = useNavigate()

  const handleStaffApprove = async id => {
    try {
      await api.post(`/notices/staff-notices/${id}/approve-admin/`, { action: 'approve' })
      setStaffPending(prev => prev.filter(x => x.id !== id))
      alert('✓ Staff notice approved successfully!')
    } catch (err) { 
      const error = err.response?.data?.error || 'Failed to approve staff notice'
      alert('Error: ' + error) 
    }
  }

  const handleStaffReject = async id => {
    try {
      await api.post(`/notices/staff-notices/${id}/approve-admin/`, { action: 'reject' })
      setStaffPending(prev => prev.filter(x => x.id !== id))
      alert('✓ Staff notice rejected')
    } catch (err) { 
      const error = err.response?.data?.error || 'Failed to reject staff notice'
      alert('Error: ' + error) 
    }
  }

  const handleToggleBlock = async (userId) => {
    try {
      const { data: res } = await api.post(`/accounts/users/${userId}/toggle-block/`)
      setAllStudents(prev => prev.map(s => s.id === userId ? { ...s, is_active: res.is_active } : s))
    } catch { alert('Failed to update student status') }
  }

  const handleRemoveStudent = async (userId, name) => {
    if (!window.confirm(`Remove "${name}" permanently? This cannot be undone.`)) return
    try {
      await api.delete('/accounts/users/', { data: { user_id: userId } })
      setAllStudents(prev => prev.filter(s => s.id !== userId))
    } catch { alert('Failed to remove student') }
  }

  const openEdit = (n) => {
    setEditNotice(n)
    setEditForm({
      title: n.title || '',
      description: n.description || '',
      category: n.category || 'General',
      priority: n.priority || 'MEDIUM',
      department: n.department || 'ALL',
      deadline: n.deadline || '',
      status: n.status || 'PENDING',
    })
  }

  const handleEdit = async e => {
    e.preventDefault()
    if (!editNotice) return
    setEditSaving(true)
    try {
      const { data: updated } = await api.patch(`/notices/${editNotice.id}/`, editForm)
      setNotices(prev => prev.map(x => x.id === editNotice.id ? updated : x))
      setPendingList(prev => prev.map(x => x.id === editNotice.id ? updated : x))
      setEditNotice(null)
      setEditForm({})
    } catch { alert('Failed to update notice') }
    finally { setEditSaving(false) }
  }

  //  derived 
  const filtered = notices.filter(n => {
    const byStatus = filterStatus === 'ALL' || n.status === filterStatus
    const byDept   = filterDept   === 'ALL' || n.department === filterDept
    const bySearch = !search || n.title?.toLowerCase().includes(search.toLowerCase())
    return byStatus && byDept && bySearch
  })

  const byCategory = data?.by_category   || {}
  const byDeptDB   = data?.by_department  || {}
  const priDist    = data?.priority_dist  || {}
  const dailyNot   = data?.daily_notices  || []
  const engBreak   = data?.engagement_breakdown || {}

  const CATS      = ['Academic','Exam','Event','Placement','Holiday','Scholarship','Workshop','General']
  const DEPTS_VIS = ['CSE','ECE','EEE','MECH','CIVIL','ALL']

  const catChartData = {
    labels: CATS,
    datasets: [{ data: CATS.map(c => byCategory[c] || 0), backgroundColor: CATS.map(c => CAT_COLORS[c] || '#6b7280'), borderRadius: 8, borderSkipped: false }],
  }
  const deptChartData = {
    labels: DEPTS_VIS,
    datasets: [{ data: DEPTS_VIS.map(d => byDeptDB[d] || 0), backgroundColor: DEPT_COLORS, borderRadius: 8, borderSkipped: false }],
  }
  const priChartData = {
    labels: ['LOW','MEDIUM','HIGH','URGENT'],
    datasets: [{ data: ['LOW','MEDIUM','HIGH','URGENT'].map(p => priDist[p] || 0), backgroundColor: ['#3b82f6','#f59e0b','#f97316','#ef4444'], borderWidth: 3, borderColor: 'transparent' }],
  }
  const dailyLineData = {
    labels: dailyNot.map(d => d.label),
    datasets: [{
      label: 'Notices Created',
      data: dailyNot.map(d => d.count),
      fill: true, tension: 0.45,
      borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.12)',
      pointBackgroundColor: '#6366f1', pointRadius: 5, borderWidth: 2.5,
    }],
  }
  const engChartData = {
    labels: ['Viewed','Downloaded','Bookmarked','Shared'],
    datasets: [{
      data: [engBreak.viewed||0, engBreak.downloaded||0, engBreak.bookmarked||0, engBreak.shared||0],
      backgroundColor: ['#6366f1','#10b981','#f59e0b','#ec4899'], borderRadius: 8, borderSkipped: false,
    }],
  }

  const TABS = [
    { id: 'overview',  label: 'Overview',       icon: BarChart3 },
    { id: 'pending',   label: 'Pending',         icon: Clock,    badge: pendingList.length + staffPending.length },
    { id: 'notices',   label: 'All Notices',     icon: FileText },
    { id: 'analytics', label: 'Analytics',       icon: Activity },
    { id: 'students',  label: 'Students',        icon: GraduationCap },
    { id: 'sysnotifs', label: 'Notifications',   icon: Bell },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-indigo-950">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
        className="w-14 h-14 rounded-full border-4 border-t-indigo-400 border-r-indigo-400 border-b-transparent border-l-transparent" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12 relative">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tighter mb-3">
              Admin <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Control Center</span>
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
              <p className="text-lg text-slate-600 dark:text-slate-300 font-semibold">
                Live Status
              </p>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {lastUpdated ? lastUpdated.toLocaleTimeString() : 'connecting'}
              </span>
            </div>
          </motion.div>
          
          <motion.div 
            className="flex gap-3 flex-wrap"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <motion.button 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchAll(true)}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold shadow-lg hover:shadow-xl transition-all">
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} /> 
              <span>Refresh</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowEmergency(true)}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all">
              <Zap className="w-5 h-5" /> 
              <span>Emergency Alert</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all">
              <Plus className="w-5 h-5" /> 
              <span>Student Notice</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowStaffCreate(true)}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-amber-50 text-amber-700 text-sm font-bold border-2 border-amber-200 shadow-lg hover:shadow-xl hover:border-amber-300 transition-all dark:bg-white/[0.05] dark:text-amber-200 dark:border-white/[0.08]">
              <Bell className="w-5 h-5" /> 
              <span>Staff Notice</span>
            </motion.button>
          </motion.div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard label="Total Notices"    value={data?.total_notices     || 0} sub={`${data?.approved_count||0} approved`}       icon={FileText}  grad="linear-gradient(135deg,#6366f1,#8b5cf6)" delay={0.05} />
          <StatCard label="Total Users"      value={data?.total_users       || 0} sub={`${data?.user_breakdown?.students||0} students`} icon={Users}  grad="linear-gradient(135deg,#0ea5e9,#6366f1)" delay={0.10} />
          <StatCard label="Total Views"      value={data?.total_views       || 0} sub="across all notices"                            icon={Eye}       grad="linear-gradient(135deg,#10b981,#059669)" delay={0.15} />
          <StatCard label="Pending Approval" value={data?.pending_approvals || 0} sub="requires your action"                         icon={Clock}     grad={data?.pending_approvals > 0 ? "linear-gradient(135deg,#f59e0b,#ef4444)" : "linear-gradient(135deg,#64748b,#475569)"} delay={0.20} />
        </div>

        {/* Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-lg border border-slate-200/60 dark:border-slate-700/50 mb-8 sticky top-20 z-40">
          <div className="flex items-center justify-center gap-2 p-2 overflow-x-auto scrollbar-hide">
            {TABS.map(t => {
              const active = activeTab === t.id
              return (
                <motion.button 
                  key={t.id} 
                  onClick={() => setActiveTab(t.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={"flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all " +
                    (active ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg scale-105" : "text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20")}>
                  <t.icon className={active ? "w-5 h-5" : "w-4 h-4"} />
                  <span>{t.label}</span>
                  {t.badge > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={"px-2.5 py-1 rounded-xl text-xs font-extrabold " + (active ? "bg-white/30 text-white" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400")}>
                      {t.badge}
                    </motion.span>
                  )}
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Approved',    val: data?.approved_count    || 0, col: 'emerald' },
                { label: 'Pending',     val: data?.pending_approvals || 0, col: 'amber'   },
                { label: 'Rejected',    val: data?.rejected_count    || 0, col: 'red'     },
                { label: 'Departments', val: 5,                            col: 'indigo'  },
              ].map((s, idx) => (
                <motion.div 
                  key={s.label}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: idx * 0.08 }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-slate-200/60 dark:border-slate-700/50 flex items-center gap-4 group">
                  <motion.div 
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-2xl bg-${s.col}-100 dark:bg-${s.col}-900/40 text-${s.col}-600 dark:text-${s.col}-400 group-hover:scale-110 transition-transform`}>
                    {s.val}
                  </motion.div>
                  <p className="text-lg text-slate-700 dark:text-slate-300 font-bold">{s.label}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="📅 Notices Created – Last 7 Days">
                <div style={{ height: 280 }}><Line data={dailyLineData} options={chartOpts} /></div>
              </ChartCard>
              <ChartCard title="📂 Notices by Category">
                <div style={{ height: 280 }}><Bar data={catChartData} options={chartOpts} /></div>
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ChartCard title="⚡ Priority Distribution">
                <div style={{ height: 280 }}><Doughnut data={priChartData} options={doughnutOpts} /></div>
              </ChartCard>
              <ChartCard title="🏢 Notices by Department">
                <div style={{ height: 280 }}><Bar data={deptChartData} options={chartOpts} /></div>
              </ChartCard>
              <ChartCard title="📊 Engagement Breakdown">
                <div style={{ height: 280 }}><Bar data={engChartData} options={chartOpts} /></div>
              </ChartCard>
            </div>

            <ChartCard title="🔥 Top Notices by Views">
              <div className="space-y-3">
                {(data?.top_notices || []).map((n, i) => (
                  <motion.div 
                    key={n.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    whileHover={{ x: 8, scale: 1.01 }}
                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition">
                    <motion.span 
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-sm font-extrabold flex items-center justify-center">
                      {i+1}
                    </motion.span>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-slate-800 dark:text-slate-200 truncate">{n.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{n.department} • {n.category}</p>
                    </div>
                    <motion.div 
                      whileHover={{ scale: 1.1 }}
                      className="flex items-center gap-2 text-base font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Eye className="w-5 h-5" />{n.view_count}
                    </motion.div>
                  </motion.div>
                ))}
                {!(data?.top_notices?.length) && <p className="text-lg text-slate-400 text-center py-6">No data yet</p>}
              </div>
            </ChartCard>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: 'Students',    val: data?.user_breakdown?.students    || 0, Icon: Users,     col: 'indigo'  },
                { label: 'Dept Logins', val: data?.user_breakdown?.departments || 0, Icon: Building2, col: 'violet'  },
                { label: 'Admins',      val: data?.user_breakdown?.admins      || 0, Icon: Shield,    col: 'emerald' },
              ].map((s, idx) => (
                <motion.div 
                  key={s.label}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.3 + idx * 0.08 }}
                  whileHover={{ y: -6, scale: 1.03 }}
                  className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-8 shadow-lg border border-slate-200/60 dark:border-slate-700/50 flex items-center gap-6 group">
                  <motion.div 
                    className={`w-20 h-20 rounded-3xl flex items-center justify-center bg-${s.col}-100 dark:bg-${s.col}-900/40 group-hover:scale-110 transition-transform`}
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    <s.Icon className={`w-10 h-10 text-${s.col}-600 dark:text-${s.col}-400`} />
                  </motion.div>
                  <div>
                    <p className="text-4xl font-black text-slate-900 dark:text-white">{s.val}</p>
                    <p className="text-lg text-slate-600 dark:text-slate-400 font-semibold mt-1">{s.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* PENDING */}
        {activeTab === 'pending' && (
          <motion.div key="pending" initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}>
            {pendingList.length === 0 && staffPending.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.92 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-28 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 backdrop-blur-xl rounded-3xl border-2 border-emerald-200/40 dark:border-emerald-800/40 shadow-lg">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                  <CheckCircle className="w-24 h-24 text-emerald-500 mb-4" />
                </motion.div>
                <p className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300">All caught up!</p>
                <p className="text-lg text-emerald-600 dark:text-emerald-400 mt-2">No pending notices to review</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {pendingList.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Student Notices Pending Admin Approval</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Open the text view to review the full notice before approving or rejecting.</p>
                  </div>
                )}
                {pendingList.map((n, idx) => (
                  <motion.div 
                    key={n.id} 
                    initial={{ opacity:0, x:-20 }} 
                    animate={{ opacity:1, x:0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ x: 8, scale: 1.01 }}
                    className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-8 shadow-lg border-2 border-amber-200/40 dark:border-amber-800/40 hover:border-amber-400/60 transition-all group">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{n.title}</h3>
                          <motion.span 
                            whileHover={{ scale: 1.1 }}
                            className={`px-4 py-2 rounded-xl text-sm font-bold ${priColor(n.priority)}`}>
                            {n.priority}
                          </motion.span>
                          <motion.span 
                            whileHover={{ scale: 1.1 }}
                            className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                            {n.category}
                          </motion.span>
                        </div>
                        <p className="text-lg text-slate-600 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">{n.description}</p>
                        <div className="flex flex-wrap gap-4 text-base text-slate-600 dark:text-slate-400 font-semibold">
                          <span className="flex items-center gap-2"><Building2 className="w-5 h-5 text-slate-400" />{n.department}</span>
                          <span className="flex items-center gap-2"><Calendar className="w-5 h-5 text-slate-400" />{fmt(n.deadline)}</span>
                          <span className="flex items-center gap-2"><Clock className="w-5 h-5 text-slate-400" />{fmt(n.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex gap-3 shrink-0 flex-col">
                        <motion.button 
                          whileHover={{ scale: 1.08 }} 
                          whileTap={{ scale: 0.92 }}
                          onClick={() => openNoticeDetails(n)}
                          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-base font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all shadow-md">
                          <FileText className="w-5 h-5" /> View Text
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.08 }} 
                          whileTap={{ scale: 0.92 }}
                          onClick={() => handleApprove(n.id)}
                          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-base font-bold hover:bg-emerald-200 dark:hover:bg-emerald-800/60 transition-all shadow-md">
                          <CheckCircle className="w-5 h-5" /> Approve
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.08 }} 
                          whileTap={{ scale: 0.92 }}
                          onClick={() => handleReject(n.id)}
                          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-base font-bold hover:bg-red-200 dark:hover:bg-red-800/60 transition-all shadow-md">
                          <XCircle className="w-5 h-5" /> Reject
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {staffPending.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Staff Notices Pending Admin Approval</h3>
                    <div className="space-y-4">
                      {staffPending.map((n) => (
                        <div key={n.id} className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-lg border-2 border-amber-200/40 dark:border-amber-800/40">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h4 className="text-lg font-bold text-slate-900 dark:text-white">{n.title}</h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{n.description}</p>
                              <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400 mt-3">
                                <span className="px-2 py-1 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">{n.category}</span>
                                <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700">{n.department}</span>
                                {n.is_urgent && <span className="px-2 py-1 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Urgent</span>}
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0 flex-col sm:flex-row">
                              <motion.button
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.92 }}
                                onClick={() => openNoticeDetails(n)}
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all shadow-md"
                              >
                                <FileText className="w-4 h-4" /> View Text
                              </motion.button>
                              <button onClick={() => handleStaffApprove(n.id)}
                                className="px-4 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                                Approve
                              </button>
                              <button onClick={() => handleStaffReject(n.id)}
                                className="px-4 py-2 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-semibold text-sm">
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ALL NOTICES */}
        {activeTab === 'notices' && (
          <motion.div key="notices" initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}>
            {/* Filter Bar */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl rounded-3xl p-6 shadow-lg border border-slate-200/60 dark:border-slate-700/50 mb-8 flex flex-wrap gap-4 items-center">
              <motion.select 
                whileHover={{ scale: 1.02 }}
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
                className="px-5 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-base font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition cursor-pointer">
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
              </motion.select>
              <motion.select 
                whileHover={{ scale: 1.02 }}
                value={filterDept} 
                onChange={e => setFilterDept(e.target.value)}
                className="px-5 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-base font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition cursor-pointer">
                <option value="ALL">All Departments</option>
                {['CSE','ECE','EEE','MECH','CIVIL','ALL','INSTITUTION'].map(d => <option key={d}>{d}</option>)}
              </motion.select>
              <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 flex-1 min-w-xs group">
                <Search className="w-6 h-6 text-slate-400 group-focus-within:text-indigo-500 transition" />
                <input 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder="Search notices..."
                  className="bg-transparent text-base text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none flex-1" />
                {search && (
                  <motion.button 
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSearch('')}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition">
                    <X className="w-5 h-5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300" />
                  </motion.button>
                )}
              </div>
              <motion.div 
                className="ml-auto flex items-center gap-3 px-5 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-200/40 dark:border-indigo-800/40">
                <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{filtered.length}</span>
                <span className="text-base font-semibold text-indigo-600 dark:text-indigo-400">notice{filtered.length !== 1 ? 's' : ''}</span>
              </motion.div>
            </motion.div>

            {/* Empty State */}
            {filtered.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.92 }} 
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="flex flex-col items-center py-24 bg-white/50 dark:bg-slate-800/50 backdrop-blur-2xl rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-600">
                <motion.div 
                  animate={{ y: [0, -12, 0] }} 
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}>
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/40 flex items-center justify-center mb-4">
                    <FileText className="w-10 h-10 text-indigo-500" />
                  </div>
                </motion.div>
                <p className="text-slate-600 dark:text-slate-300 font-bold text-2xl">No notices found</p>
                <p className="text-slate-500 dark:text-slate-400 text-lg mt-2">Try adjusting your filters</p>
              </motion.div>
            )}

            {/* Card Grid — Compact Colorful Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((n, idx) => {
                const CatIcon = CAT_ICONS[n.category] || FileText
                const catGrad = CAT_GRADS[n.category] || 'from-slate-500 to-gray-600'
                const hasAttachments = n.all_attachments?.length > 0 || n.image_file || n.pdf_file || n.video_file
                const thumbSrc = n.thumbnail || n.banner_image 
                  ? (n.thumbnail?.startsWith('http') ? n.thumbnail : n.thumbnail ? `/media/${n.thumbnail}` : n.banner_image)
                  : null
                
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: idx * 0.05, type: 'spring', stiffness: 250, damping: 25 }}
                    whileHover={{ y: -8, scale: 1.02, boxShadow: '0 24px 48px -8px rgba(0,0,0,0.18)' }}
                    whileTap={{ scale: 0.98 }}
                    className="group"
                  >
                    <div className="bg-white dark:bg-slate-800/90 rounded-3xl shadow-md border border-gray-100 dark:border-gray-700/60 overflow-hidden flex flex-col h-full">
                      <div className={`relative h-64 overflow-hidden bg-gradient-to-br ${catGrad}`}>
                        {thumbSrc ? (
                          <img
                            src={thumbSrc}
                            alt={n.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-30">
                            <CatIcon className="w-28 h-28 text-white" strokeWidth={1.5} />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                        <span className="absolute top-3 left-3 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/30">
                          {n.category}
                        </span>

                        <span className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold text-white backdrop-blur-sm ${
                          n.status === 'APPROVED' ? 'bg-emerald-500/90' :
                          n.status === 'PENDING' ? 'bg-amber-500/90' :
                          'bg-red-500/90'
                        }`}>
                          {n.status}
                        </span>

                        {hasAttachments && (
                          <span className="absolute bottom-3 right-3 text-xs font-semibold text-white/95 bg-black/40 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Paperclip className="w-3.5 h-3.5" />
                            {n.all_attachments?.length || '1+'}
                          </span>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                          <h3 className="text-xl font-extrabold text-white leading-snug line-clamp-2 drop-shadow-lg">
                            {n.title}
                          </h3>
                        </div>
                      </div>

                      <div className="p-5 flex flex-col flex-1 gap-4">
                        <p className="text-base text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed flex-1">
                          {n.description}
                        </p>

                        <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-400 border-t border-gray-200 dark:border-slate-700 pt-3">
                          <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{n.department}</span>
                          <span className="flex items-center gap-1 justify-center"><Eye className="w-3.5 h-3.5" />{n.view_count}</span>
                          <span className="flex items-center gap-1 justify-end"><Calendar className="w-3.5 h-3.5" />{fmt(n.deadline)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.95 }}
                              onClick={() => openNoticeDetails(n)}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                          >
                            View Details
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openEdit(n)}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                          >
                            Edit
                          </motion.button>
                          {n.status === 'PENDING' && (
                            <motion.button
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleApprove(n.id)}
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </motion.button>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(n.id)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-red-600 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800"
                          >
                            <Trash2 className="w-5 h-5" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ANALYTICS */}
        {activeTab === 'analytics' && (
          <motion.div key="analytics" initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { label: 'Viewed',     val: engBreak.viewed     || 0, bar: 'bg-indigo-500' },
                { label: 'Downloaded', val: engBreak.downloaded || 0, bar: 'bg-emerald-500' },
                { label: 'Bookmarked', val: engBreak.bookmarked || 0, bar: 'bg-amber-500' },
                { label: 'Shared',     val: engBreak.shared     || 0, bar: 'bg-pink-500' },
              ].map((e, idx) => (
                <motion.div 
                  key={e.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-8 shadow-lg border border-slate-200/60 dark:border-slate-700/50 group">
                  <motion.div className={`w-2 h-3 rounded-full ${e.bar} mb-4 group-hover:h-4 transition-all`} />
                  <p className="text-4xl font-black text-slate-900 dark:text-white">{e.val}</p>
                  <p className="text-lg text-slate-600 dark:text-slate-400 mt-2 font-semibold">{e.label}</p>
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="📊 Daily Notice Activity (7 Days)">
                <div style={{ height: 280 }}><Line data={dailyLineData} options={chartOpts} /></div>
              </ChartCard>
              <ChartCard title="📂 Category Distribution">
                <div style={{ height: 280 }}><Bar data={catChartData} options={chartOpts} /></div>
              </ChartCard>
              <ChartCard title="⚡ Priority Split">
                <div style={{ height: 280 }}><Doughnut data={priChartData} options={doughnutOpts} /></div>
              </ChartCard>
              <ChartCard title="🏢 Notices per Department">
                <div style={{ height: 280 }}><Bar data={deptChartData} options={chartOpts} /></div>
              </ChartCard>
            </div>
            <ChartCard title="🔥 Most Viewed Notices">
              <div className="overflow-x-auto">
                <table className="w-full text-base">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                      {['#','Title','Dept','Category','Priority','Views'].map(h => (
                        <th key={h} className="text-left py-4 px-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.top_notices || []).map((n, i) => (
                      <tr key={n.id} className="border-b border-slate-100 dark:border-slate-700/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition">
                        <td className="py-4 px-4 text-slate-500 text-sm font-bold">{i+1}</td>
                        <td className="py-4 px-4 max-w-xs"><p className="truncate text-slate-900 dark:text-slate-100 font-bold text-base">{n.title}</p></td>
                        <td className="py-4 px-4 text-slate-700 dark:text-slate-300 font-semibold">{n.department}</td>
                        <td className="py-4 px-4"><span className="px-3 py-2 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">{n.category}</span></td>
                        <td className="py-4 px-4"><span className={`px-3 py-2 rounded-lg text-xs font-bold ${priColor(n.priority)}`}>{n.priority}</span></td>
                        <td className="py-4 px-4 font-extrabold text-indigo-600 dark:text-indigo-400 text-lg">{n.view_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </motion.div>
        )}

        {/* STUDENTS */}
        {activeTab === 'students' && (() => {
          const DEPT_LIST = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL']
          const YEAR_MAP  = { '1': 'First Year', '2': 'Second Year', '3': 'Third Year', '4': 'Final Year' }
          // derive year from roll_number: last 2 digits of first 4 chars, else use index heuristic
          const getYear = s => {
            if (s.roll_number) {
              const m = s.roll_number.match(/(\d)/)
              if (m && ['1','2','3','4'].includes(m[1])) return m[1]
            }
            return null
          }
          const DEPT_META = {
            CSE:   { grad: 'from-indigo-500 to-violet-600',   shadow: 'shadow-indigo-200 dark:shadow-indigo-900/40',  ring: 'ring-2 ring-indigo-400/40',  dot: 'bg-indigo-500',   pill: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',   credBg: 'bg-indigo-50/80 dark:bg-indigo-950/40',  credBorder: 'border-indigo-100 dark:border-indigo-800/40',  labelCls: 'text-indigo-500 dark:text-indigo-400', fullName: 'Computer Science & Engineering' },
            ECE:   { grad: 'from-sky-500 to-cyan-500',        shadow: 'shadow-sky-200 dark:shadow-sky-900/40',        ring: 'ring-2 ring-sky-400/40',     dot: 'bg-sky-500',      pill: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',             credBg: 'bg-sky-50/80 dark:bg-sky-950/40',        credBorder: 'border-sky-100 dark:border-sky-800/40',        labelCls: 'text-sky-500 dark:text-sky-400',       fullName: 'Electronics & Communication Engg' },
            EEE:   { grad: 'from-amber-400 to-orange-500',    shadow: 'shadow-amber-200 dark:shadow-amber-900/40',    ring: 'ring-2 ring-amber-400/40',   dot: 'bg-amber-500',    pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',     credBg: 'bg-amber-50/80 dark:bg-amber-950/40',    credBorder: 'border-amber-100 dark:border-amber-800/40',    labelCls: 'text-amber-500 dark:text-amber-400',   fullName: 'Electrical & Electronics Engg' },
            MECH:  { grad: 'from-slate-500 to-zinc-600',      shadow: 'shadow-slate-200 dark:shadow-slate-900/40',    ring: 'ring-2 ring-slate-400/40',   dot: 'bg-slate-500',    pill: 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300',     credBg: 'bg-slate-50/80 dark:bg-slate-800/60',    credBorder: 'border-slate-200 dark:border-slate-700/40',    labelCls: 'text-slate-500 dark:text-slate-400',   fullName: 'Mechanical Engineering' },
            CIVIL: { grad: 'from-emerald-500 to-teal-500',    shadow: 'shadow-emerald-200 dark:shadow-emerald-900/40',ring: 'ring-2 ring-emerald-400/40', dot: 'bg-emerald-500',  pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', credBg: 'bg-emerald-50/80 dark:bg-emerald-950/40', credBorder: 'border-emerald-100 dark:border-emerald-800/40', labelCls: 'text-emerald-500 dark:text-emerald-400', fullName: 'Civil Engineering' },
          }
          // apply global filters
          const filteredStudents = allStudents.filter(s => {
            const q = studentSearch.toLowerCase()
            const matchSearch = !q || (s.name||'').toLowerCase().includes(q) || s.username.toLowerCase().includes(q) || (s.email||'').toLowerCase().includes(q) || (s.roll_number||'').toLowerCase().includes(q)
            const matchDept   = studentDept === 'ALL' || s.department === studentDept
            const matchYear   = studentYear === 'ALL' || getYear(s) === studentYear
            return matchSearch && matchDept && matchYear
          })
          const studentsByDept = DEPT_LIST.reduce((acc, d) => {
            acc[d] = filteredStudents.filter(s => s.department === d)
            return acc
          }, {})
          const totalActive  = filteredStudents.filter(s => s.is_active).length
          const totalBlocked = filteredStudents.filter(s => !s.is_active).length
          const hasFilters   = studentSearch || studentYear !== 'ALL' || studentDept !== 'ALL'
          return (
            <motion.div key="students" initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.4 }} exit={{ opacity:0 }} className="space-y-8">

              {/* ── Hero Banner ── */}
              <div className="relative overflow-hidden rounded-3xl p-7" style={{ background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#9333ea 100%)' }}>
                {/* bokeh blobs */}
                <div className="absolute -top-10 -left-10 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-8 right-10 w-40 h-40 rounded-full bg-fuchsia-400/20 blur-2xl pointer-events-none" />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                      <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-extrabold text-white tracking-tight">Student Management</h2>
                      <p className="text-violet-200 text-sm mt-0.5">{allStudents.length} students enrolled across {DEPT_LIST.length} departments</p>
                    </div>
                  </div>
                  {/* Quick stat pills */}
                  <div className="flex gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2.5">
                      <Users className="w-4 h-4 text-violet-300" />
                      <div>
                        <p className="text-xs text-white/60 leading-none">Showing</p>
                        <p className="text-xl font-extrabold text-white leading-tight">{filteredStudents.length}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2.5">
                      <UserCheck className="w-4 h-4 text-emerald-300" />
                      <div>
                        <p className="text-xs text-white/60 leading-none">Active</p>
                        <p className="text-xl font-extrabold text-white leading-tight">{totalActive}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2.5">
                      <UserX className="w-4 h-4 text-red-300" />
                      <div>
                        <p className="text-xs text-white/60 leading-none">Blocked</p>
                        <p className="text-xl font-extrabold text-white leading-tight">{totalBlocked}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Search & Filter Toolbar ── */}
              <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by name, username, email, roll no…"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    />
                    {studentSearch && (
                      <button onClick={() => setStudentSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Year filter */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[['ALL','All Years'],['1','1st Year'],['2','2nd Year'],['3','3rd Year'],['4','Final']].map(([val, lbl]) => (
                      <button
                        key={val}
                        onClick={() => setStudentYear(val)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                          studentYear === val
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/40'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }`}
                      >{lbl}</button>
                    ))}
                  </div>

                  {/* Dept filter */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['ALL',...DEPT_LIST].map(d => {
                      const m = DEPT_META[d]
                      return (
                        <button
                          key={d}
                          onClick={() => setStudentDept(d)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                            studentDept === d
                              ? `bg-gradient-to-r ${m ? m.grad : 'from-indigo-500 to-violet-600'} text-white shadow-md`
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                          }`}
                        >{d === 'ALL' ? 'All Depts' : d}</button>
                      )
                    })}
                  </div>
                </div>

                {/* Active filter summary */}
                {hasFilters && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{filteredStudents.length} result{filteredStudents.length !== 1 ? 's' : ''} found</span>
                    <button
                      onClick={() => { setStudentSearch(''); setStudentYear('ALL'); setStudentDept('ALL') }}
                      className="ml-auto text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold flex items-center gap-1 transition"
                    >
                      <X className="w-3 h-3" /> Clear all filters
                    </button>
                  </div>
                )}
              </div>

              {/* ── Department Sections ── */}
              {DEPT_LIST.map((dept, di) => {
                const students = studentsByDept[dept] || []
                const meta = DEPT_META[dept]
                return (
                  <motion.div key={dept} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay: di * 0.07 }}>
                    {/* Dept header */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${meta.grad} flex items-center justify-center shadow-md flex-shrink-0`}>
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white tracking-tight">{dept}</h3>
                        <p className="text-xs text-slate-400">{meta.fullName}</p>
                      </div>
                      <span className={`ml-1 text-xs px-3 py-1 rounded-full font-bold ${meta.pill}`}>
                        {students.length} student{students.length !== 1 ? 's' : ''}
                      </span>
                      <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-slate-700 to-transparent" />
                    </div>

                    {/* ── Dept Login Card ── */}
                    <div className={`mb-5 rounded-2xl border ${meta.credBorder} ${meta.credBg} p-4 flex flex-col sm:flex-row sm:items-center gap-4`}>
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.grad} flex items-center justify-center shadow shrink-0`}>
                          <Shield className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className={`text-[10px] font-extrabold uppercase tracking-widest ${meta.labelCls}`}>Dept Login</p>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs font-mono bg-white dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-lg text-slate-800 dark:text-slate-100">
                              {dept.toLowerCase()}_dept
                            </code>
                            <span className="text-slate-300 dark:text-slate-600 text-xs">/</span>
                            <div className="flex items-center gap-1">
                              <code className="text-xs font-mono bg-white dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-lg text-slate-800 dark:text-slate-100">
                                {showCredential[`dept_${dept}`] ? 'dept123' : '•••••••'}
                              </code>
                              <button
                                onClick={() => setShowCredential(prev => ({ ...prev, [`dept_${dept}`]: !prev[`dept_${dept}`] }))}
                                className="p-1 rounded-lg text-slate-400 hover:text-indigo-500 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 transition"
                              >
                                {showCredential[`dept_${dept}`] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/admin/dept-profile?dept=${dept}`)}
                        className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r ${meta.grad} text-white shadow hover:opacity-90 active:scale-95 transition-all`}
                      >
                        <ChevronRight className="w-3.5 h-3.5" /> View Profile
                      </button>
                    </div>

                    {students.length === 0 ? (
                      <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4">
                        <GraduationCap className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                        <p className="text-sm text-slate-400 italic">No students enrolled in this department yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {students.map((s, si) => (
                          <motion.div
                            key={s.id}
                            initial={{ opacity:0, scale:0.97 }}
                            animate={{ opacity:1, scale:1 }}
                            transition={{ delay: di*0.07 + si*0.04 }}
                            className={`group relative flex flex-col rounded-3xl overflow-hidden ${
                              !s.is_active
                                ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50'
                                : 'bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-700/50'
                            } shadow-lg hover:shadow-xl ${!s.is_active ? '' : meta.shadow} transition-all duration-300 hover:-translate-y-0.5`}
                          >
                            {/* gradient top bar */}
                            <div className={`h-1.5 w-full bg-gradient-to-r ${!s.is_active ? 'from-red-400 to-rose-500' : meta.grad}`} />

                            <div className="p-5 flex flex-col gap-4 flex-1">
                              {/* Avatar row */}
                              <div className="flex items-start gap-3">
                                <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-md shrink-0 bg-gradient-to-br ${!s.is_active ? 'from-red-400 to-rose-500' : meta.grad}`}>
                                  {(s.name || s.username)?.charAt(0).toUpperCase()}
                                  {!s.is_active && (
                                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-white dark:border-slate-800 flex items-center justify-center">
                                      <Lock className="w-2.5 h-2.5 text-white" />
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                  <p className="font-bold text-slate-900 dark:text-white text-sm truncate leading-tight">{s.name || s.username}</p>
                                  <p className="text-xs text-slate-400 truncate mt-0.5">{s.email}</p>
                                  {s.roll_number && (
                                    <span className="inline-block mt-1.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-mono">{s.roll_number}</span>
                                  )}
                                </div>
                                {/* Status indicator */}
                                <div className={`shrink-0 w-2.5 h-2.5 rounded-full mt-1.5 ${s.is_active ? 'bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]' : 'bg-red-400 shadow-[0_0_6px_2px_rgba(248,113,113,0.5)]'}`} />
                              </div>

                              {/* Credentials panel */}
                              <div className={`rounded-2xl border p-3.5 ${meta.credBg} ${meta.credBorder}`}>
                                <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-3 ${meta.labelCls}`}>Login Credentials</p>
                                {/* Username */}
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wide w-14 shrink-0 font-semibold">User</span>
                                  <code className="flex-1 min-w-0 text-xs font-mono bg-white/80 dark:bg-slate-700/60 border border-white dark:border-slate-600/50 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 truncate shadow-sm">
                                    {s.username}
                                  </code>
                                </div>
                                {/* Password */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wide w-14 shrink-0 font-semibold">Pass</span>
                                  <div className="flex-1 flex items-center gap-1.5">
                                    <code className="flex-1 min-w-0 text-xs font-mono bg-white/80 dark:bg-slate-700/60 border border-white dark:border-slate-600/50 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 truncate shadow-sm">
                                      {showCredential[s.id] ? 'student123' : '•••••••••'}
                                    </code>
                                    <button
                                      onClick={() => setShowCredential(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                                      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition shadow-sm"
                                    >
                                      {showCredential[s.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Block / Unblock toggle */}
                              <button
                                onClick={() => handleToggleBlock(s.id)}
                                className={`mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-xs font-bold tracking-wide transition-all duration-200 ${
                                  s.is_active
                                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-200 dark:shadow-red-900/30 active:scale-95'
                                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/30 active:scale-95'
                                }`}
                              >
                                {s.is_active
                                  ? <><Lock className="w-3.5 h-3.5" /> Block Access</>
                                  : <><Unlock className="w-3.5 h-3.5" /> Restore Access</>}
                              </button>

                              {/* Remove student */}
                              <button
                                onClick={() => handleRemoveStudent(s.id, s.name || s.username)}
                                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-all duration-200"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove Student
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </motion.div>
          )
        })()}

        {/* RISK */}
        {/* SYSTEM NOTIFICATIONS */}
        {activeTab === 'sysnotifs' && (
          <motion.div key="sysnotifs" initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}>
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-8 shadow-lg border border-slate-200/60 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                  <Bell className="w-8 h-8 text-indigo-500" /> System Notifications
                </h3>
                <motion.button 
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    const msg  = prompt('Notification message:')
                    if (!msg) return
                    const role = prompt('Target role (ALL/STUDENT/DEPARTMENT/ADMIN):') || 'ALL'
                    const dept = prompt('Target department (ALL/CSE/ECE/EEE/MECH/CIVIL):') || 'ALL'
                    try {
                      await api.post('/notices/system-notifications/', { message: msg, target_role: role, target_department: dept })
                      fetchAll(true)
                    } catch { alert('Failed to send') }
                  }} 
                  className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold shadow-lg transition">
                  <Plus className="w-5 h-5" /> New Notification
                </motion.button>
              </div>
              {sysNotifs.length === 0 ? (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-slate-500 dark:text-slate-400 py-16 text-xl font-semibold">
                  No system notifications yet
                </motion.p>
              ) : (
                <div className="space-y-4">
                  {sysNotifs.map((sn, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ x: 8, scale: 1.01 }}
                      className="p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-700 hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-all group">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <p className="text-lg text-slate-900 dark:text-slate-100 font-bold flex-1 leading-relaxed">{sn.message}</p>
                        <div className="flex gap-3 shrink-0 flex-wrap justify-end">
                          <motion.span 
                            whileHover={{ scale: 1.1 }}
                            className={`text-sm px-4 py-2 rounded-lg font-bold ${sn.target_role==='ALL'?'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400':sn.target_role==='STUDENT'?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400':sn.target_role==='ADMIN'?'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400':'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'}`}>
                            {sn.target_role}
                          </motion.span>
                          <motion.span 
                            whileHover={{ scale: 1.1 }}
                            className="text-sm px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                            {sn.target_department}
                          </motion.span>
                        </div>
                      </div>
                      <p className="text-base text-slate-500 dark:text-slate-400 font-semibold">{new Date(sn.created_at).toLocaleString()}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        </AnimatePresence>
      </div>

      {/* Modal: Create Staff Notice */}
      <AnimatePresence>
      {showStaffCreate && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowStaffCreate(false)}>
          <motion.div initial={{ scale:0.9,opacity:0 }} animate={{ scale:1,opacity:1 }} exit={{ scale:0.9,opacity:0 }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Create Staff Notice</h2>
                <p className="text-xs text-slate-500 mt-0.5">HOD + Admin approval required (ALL skips HOD)</p>
              </div>
              <button onClick={() => { setShowStaffCreate(false); setStaffAttachFiles([]) }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={handleStaffCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Title *</label>
                <input required value={staffForm.title} onChange={e => setStaffForm({ ...staffForm, title: e.target.value })} className={inputCls} placeholder="Enter staff notice title" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Description *</label>
                <textarea required rows={4} value={staffForm.description} onChange={e => setStaffForm({ ...staffForm, description: e.target.value })} className={inputCls} placeholder="Enter description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                  <select value={staffForm.category} onChange={e => setStaffForm({ ...staffForm, category: e.target.value })} className={inputCls}>
                    {['General','Exam','Event','Academic','Placement','Holiday','Scholarship','Workshop'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
                  <select value={staffForm.department} onChange={e => setStaffForm({ ...staffForm, department: e.target.value })} className={inputCls}>
                    {['ALL','CSE','ECE','EEE','MECH','CIVIL','INSTITUTION'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={staffForm.is_urgent} onChange={e => setStaffForm({ ...staffForm, is_urgent: e.target.checked })} />
                Mark as urgent
              </label>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Attachments</label>
                <input ref={staffFileInputRef} type="file" multiple className="hidden" onChange={e => {
                  const newFiles = Array.from(e.target.files || [])
                  setStaffAttachFiles(prev => [...prev, ...newFiles])
                  e.target.value = ''
                }} />
                <button type="button" onClick={() => staffFileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors text-sm text-slate-500 dark:text-slate-400 font-medium">
                  <Upload className="w-4 h-4" /> Click to upload files
                </button>
                {staffAttachFiles.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {staffAttachFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">{f.name}</span>
                          <span className="text-[0.6rem] text-slate-400 shrink-0">({(f.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button type="button" onClick={() => setStaffAttachFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm hover:opacity-90 shadow transition">Submit for Approval</button>
                <button type="button" onClick={() => { setShowStaffCreate(false); setStaffAttachFiles([]) }} className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition">Cancel</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Modal: Create Notice */}
      <AnimatePresence>
      {showCreate && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreate(false)}>
          <motion.div initial={{ scale:0.9,opacity:0 }} animate={{ scale:1,opacity:1 }} exit={{ scale:0.9,opacity:0 }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Post Global Notice</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Title *</label>
                <input required value={noticeForm.title} onChange={e => setNoticeForm({...noticeForm, title:e.target.value})} className={inputCls} placeholder="Enter notice title" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Description *</label>
                <textarea required rows={4} value={noticeForm.description} onChange={e => setNoticeForm({...noticeForm, description:e.target.value})} className={inputCls} placeholder="Enter description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                  <select value={noticeForm.category} onChange={e => setNoticeForm({...noticeForm, category:e.target.value})} className={inputCls}>
                    {['General','Exam','Event','Academic','Placement','Holiday','Scholarship','Workshop'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Priority</label>
                  <select value={noticeForm.priority} onChange={e => setNoticeForm({...noticeForm, priority:e.target.value})} className={inputCls}>
                    {['LOW','MEDIUM','HIGH','URGENT'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
                  <select value={noticeForm.department} onChange={e => setNoticeForm({...noticeForm, department:e.target.value})} className={inputCls}>
                    {['ALL','CSE','ECE','EEE','MECH','CIVIL','INSTITUTION'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Deadline</label>
                  <input type="date" value={noticeForm.deadline} onChange={e => setNoticeForm({...noticeForm, deadline:e.target.value})} className={inputCls} />
                </div>
              </div>
              {/* Attachments */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Attachments</label>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => {
                  const newFiles = Array.from(e.target.files)
                  setAttachFiles(prev => [...prev, ...newFiles])
                  e.target.value = ''
                }} />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors text-sm text-slate-500 dark:text-slate-400 font-medium">
                  <Upload className="w-4 h-4" /> Click to upload files
                </button>
                {attachFiles.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {attachFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">{f.name}</span>
                          <span className="text-[0.6rem] text-slate-400 shrink-0">({(f.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button type="button" onClick={() => setAttachFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm hover:opacity-90 shadow transition">Post Notice</button>
                <button type="button" onClick={() => { setShowCreate(false); setAttachFiles([]) }} className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition">Cancel</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Modal: Emergency Broadcast */}
      <AnimatePresence>
      {showEmergency && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowEmergency(false)}>
          <motion.div initial={{ scale:0.9,opacity:0 }} animate={{ scale:1,opacity:1 }} exit={{ scale:0.9,opacity:0 }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border-2 border-red-200 dark:border-red-800/40">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Zap className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Emergency Broadcast</h2>
                <p className="text-xs text-red-500 font-medium">Sends to all students immediately</p>
              </div>
            </div>
            <form onSubmit={handleEmergency} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Title *</label>
                <input required value={noticeForm.title} onChange={e => setNoticeForm({...noticeForm, title:e.target.value})} className={inputCls} placeholder="e.g. College Closed Tomorrow" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Details *</label>
                <textarea required rows={3} value={noticeForm.description} onChange={e => setNoticeForm({...noticeForm, description:e.target.value})} className={inputCls} placeholder="Enter emergency details" />
              </div>
              <div className="flex items-start gap-2 p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-300">This creates an URGENT notice visible to all students with real-time WebSocket alert.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold text-sm hover:opacity-90 shadow-md transition flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Send Broadcast
                </button>
                <button type="button" onClick={() => setShowEmergency(false)} className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition">Cancel</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ═══ VIEW NOTICE POPUP ═══ */}
      <AnimatePresence>
      {viewNotice && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-12"
          onClick={() => setViewNotice(null)}>
          <motion.div initial={{ scale:0.92, opacity:0, y:-30 }} animate={{ scale:1, opacity:1, y:0 }} exit={{ scale:0.92, opacity:0, y:-30 }}
            transition={{ type:'spring', stiffness:300, damping:28 }}
            onClick={e => e.stopPropagation()}
            className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-white/40 dark:border-slate-700/40">

            {/* Popup Thumbnail Header - Formal */}
            {(() => {
              const CatIcon = CAT_ICONS[viewNotice.category] || FileText
              const catGrad = CAT_GRADS[viewNotice.category] || 'from-slate-500 to-gray-600'
              const thumbSrc = viewNotice.thumbnail || viewNotice.banner_image
                ? (viewNotice.thumbnail?.startsWith('http') ? viewNotice.thumbnail : viewNotice.thumbnail ? `/media/${viewNotice.thumbnail}` : viewNotice.banner_image?.startsWith('http') ? viewNotice.banner_image : viewNotice.banner_image ? `/media/${viewNotice.banner_image}` : null)
                : null
              return (
                <div className={`relative h-56 bg-gradient-to-br ${catGrad} flex items-center justify-center shrink-0`}>
                  <div className="absolute inset-0 notice-grid-pattern opacity-5" />
                  {thumbSrc && (
                    <img 
                      src={thumbSrc} 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover" 
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none' }} 
                    />
                  )}
                  <div className="relative z-10 flex items-center justify-center">
                    <CatIcon className="w-16 h-16 text-white/80" strokeWidth={1.5} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <button onClick={() => setViewNotice(null)} className="absolute top-4 right-4 p-3 rounded-xl bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition">
                    <X className="w-6 h-6" />
                  </button>
                  <div className="absolute bottom-4 left-4 flex gap-3">
                    <span className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-widest backdrop-blur-md shadow-lg text-white ${
                      viewNotice.status === 'APPROVED' ? 'bg-emerald-600/80' :
                      viewNotice.status === 'PENDING' ? 'bg-amber-600/80' : 'bg-red-600/80'
                    }`}>{viewNotice.status}</span>
                    <span className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-widest backdrop-blur-md shadow-lg text-white ${
                      viewNotice.priority === 'URGENT' ? 'bg-red-700/80' :
                      viewNotice.priority === 'HIGH' ? 'bg-orange-600/80' :
                      viewNotice.priority === 'MEDIUM' ? 'bg-amber-600/80' : 'bg-blue-600/80'
                    }`}>{viewNotice.priority}</span>
                  </div>
                </div>
              )
            })()}

            {/* Popup Body - Formal */}
            <div className="p-8 overflow-y-auto flex-1">
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">{viewNotice.title}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">ID #{viewNotice.id} • {fmt(viewNotice.created_at)} • {viewNotice.created_by_name || 'Admin'}</p>

              <div className="flex flex-wrap gap-3 mb-8">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300">
                  <Tag className="w-4 h-4" />{viewNotice.category}
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300">
                  <Building2 className="w-4 h-4" />{viewNotice.department}
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300">
                  <Eye className="w-4 h-4" />{viewNotice.view_count} views
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300">
                  <Calendar className="w-4 h-4" />{fmt(viewNotice.deadline)}
                </span>
                {viewNotice.days_remaining != null && (
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
                    viewNotice.days_remaining < 0 ? 'bg-red-100/50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                    viewNotice.days_remaining <= 3 ? 'bg-amber-100/50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                    'bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                  }`}>
                    <Clock className="w-4 h-4" />{viewNotice.days_remaining < 0 ? `${Math.abs(viewNotice.days_remaining)}d overdue` : `${viewNotice.days_remaining}d left`}
                  </span>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/20 rounded-2xl p-6 mb-8 border border-slate-200/50 dark:border-slate-700/30">
                <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{viewNotice.description}</p>
              </div>

            </div>

            {/* Footer Actions - Formal */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-700/30 flex gap-3 shrink-0">
              <button onClick={() => { setViewNotice(null); openEdit(viewNotice) }}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-800 dark:bg-slate-700 text-white text-base font-semibold hover:bg-slate-900 dark:hover:bg-slate-600 transition">
                <Edit3 className="w-5 h-5" /> Edit
              </button>
              {viewNotice.status === 'PENDING' && (
                <button onClick={() => { handleApprove(viewNotice.id); setViewNotice(null) }}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white text-base font-semibold hover:bg-emerald-700 transition">
                  <CheckCircle className="w-5 h-5" /> Approve
                </button>
              )}
              <button onClick={() => setViewNotice(null)}
                className="ml-auto px-6 py-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-base font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition">Close</button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ═══ EDIT NOTICE MODAL ═══ */}
      <AnimatePresence>
      {editNotice && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setEditNotice(null)}>
          <motion.div initial={{ scale:0.92, opacity:0, y:20 }} animate={{ scale:1, opacity:1, y:0 }} exit={{ scale:0.92, opacity:0, y:20 }}
            transition={{ type:'spring', stiffness:300, damping:28 }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <Edit3 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Edit Notice</h2>
                    <p className="text-xs text-slate-400">ID: #{editNotice.id}</p>
                  </div>
                </div>
                <button onClick={() => setEditNotice(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Title</label>
                  <input required value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea required rows={4} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                    <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className={inputCls}>
                      {['General','Exam','Event','Academic','Placement','Holiday','Scholarship','Workshop'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Priority</label>
                    <select value={editForm.priority} onChange={e => setEditForm({...editForm, priority: e.target.value})} className={inputCls}>
                      {['LOW','MEDIUM','HIGH','URGENT'].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
                    <select value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} className={inputCls}>
                      {['ALL','CSE','ECE','EEE','MECH','CIVIL','INSTITUTION'].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Deadline</label>
                    <input type="date" value={editForm.deadline || ''} onChange={e => setEditForm({...editForm, deadline: e.target.value})} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className={inputCls}>
                    {['PENDING','APPROVED','REJECTED'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-3">
                  <button type="submit" disabled={editSaving}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm hover:opacity-90 shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50">
                    {editSaving ? <motion.div animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:0.6 }} className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full" /> : <CheckCircle className="w-4 h-4" />}
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => setEditNotice(null)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition">Cancel</button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

    </div>
  )
}

export default AdminDashboard
