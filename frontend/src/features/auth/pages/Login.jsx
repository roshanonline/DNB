import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LogIn, UserPlus, User, Building2, ShieldCheck, ArrowLeft,
  Eye, EyeOff, Zap, GraduationCap, Bell, ChevronRight,
  BookOpen, BarChart3, Search, Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { staffLogin as staffPortalLogin } from '../../staff/services/staffApi'

/* ═══════════════════════════════════════════════════════════
   AURORA ORB — large blurred animated gradient sphere
   ═══════════════════════════════════════════════════════════ */
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
      opacity: [0.35, 0.6, 0.35],
      scale: [1, 1.2, 1],
      x: [0, 30, -20, 0],
      y: [0, -25, 15, 0],
    }}
    transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }}
  />
)

/* ═══════════════════════════════════════════════════════════
   MESH GRID — animated SVG grid overlay
   ═══════════════════════════════════════════════════════════ */
const MeshGrid = () => (
  <motion.div
    className="absolute inset-0 pointer-events-none"
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.12 }}
    transition={{ duration: 2 }}
  >
    <svg width="100%" height="100%">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0L0 0 0 40" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  </motion.div>
)

/* ═══════════════════════════════════════════════════════════
   PARTICLE — tiny twinkling dot
   ═══════════════════════════════════════════════════════════ */
const Particle = ({ x, y, size, delay, dur }) => (
  <motion.div
    className="absolute rounded-full bg-sky-400 pointer-events-none"
    style={{ width: size, height: size, left: `${x}%`, top: `${y}%`, willChange: 'opacity' }}
    animate={{ opacity: [0, 0.5, 0] }}
    transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }}
  />
)

/* ═══════════════════════════════════════════════════════════
   FEATURE CARD — left panel
   ═══════════════════════════════════════════════════════════ */
const FeatureItem = ({ icon: Icon, label, delay }) => (
  <motion.div
    initial={{ opacity: 0, x: -24 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, type: 'spring', stiffness: 200, damping: 18 }}
    whileHover={{ x: 6, transition: { duration: 0.2 } }}
    className="flex items-center gap-3 bg-white/70 backdrop-blur-md rounded-xl px-4 py-3 border border-sky-200/60 hover:border-sky-400/60 hover:bg-white/90 transition-all duration-300 group cursor-default shadow-sm"
  >
    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:shadow-sky-500/40 transition-shadow">
      <Icon className="w-4 h-4 text-white" />
    </div>
    <span className="text-gray-700 group-hover:text-gray-900 text-base font-medium transition-colors">{label}</span>
  </motion.div>
)

/* ═══════════════════════════════════════════════════════════
   MAIN LOGIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
const Login = () => {
  const { login, register } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [step, setStep] = useState('role')
  const [selectedRole, setSelectedRole] = useState(null)
  const [departmentLoginType, setDepartmentLoginType] = useState('DEPARTMENT')
  const [showPwd, setShowPwd] = useState(false)
  const [formData, setFormData] = useState({
    username: '', password: '', password2: '', email: '',
    first_name: '', last_name: '', role: 'STUDENT', department: 'CSE',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registerSuccess, setRegisterSuccess] = useState(false)

  const roles = [
    {
      id: 'STUDENT', title: 'Student', icon: User,
      description: 'View notices & track deadlines',
      gradient: 'from-cyan-500 to-blue-500',
      glow: 'shadow-cyan-500/25',
      bg: 'bg-cyan-500/10', text: 'text-cyan-400',
      border: 'border-cyan-500/20', bgIcon: GraduationCap,
    },
    {
      id: 'DEPARTMENT', title: 'Department', icon: Building2,
      description: 'Manage department notices',
      gradient: 'from-sky-500 to-blue-500',
      glow: 'shadow-sky-500/25',
      bg: 'bg-sky-500/10', text: 'text-sky-400',
      border: 'border-sky-500/20', bgIcon: Bell,
    },
    {
      id: 'ADMIN', title: 'Admin', icon: ShieldCheck,
      description: 'Full system control',
      gradient: 'from-amber-500 to-orange-500',
      glow: 'shadow-amber-500/25',
      bg: 'bg-amber-500/10', text: 'text-amber-400',
      border: 'border-amber-500/20', bgIcon: Zap,
    },
  ]

  // Generate particles once
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 5,
      dur: Math.random() * 4 + 3,
    }))
  , [])

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId)
    setFormData(f => ({ ...f, role: roleId }))
    setError('')

    if (isLogin && roleId === 'DEPARTMENT') {
      setStep('departmentLoginType')
      return
    }

    setDepartmentLoginType('DEPARTMENT')
    setStep('credentials')
  }

  const handleDepartmentLoginTypeSelect = (type) => {
    setDepartmentLoginType(type)
    setStep('credentials')
  }

  const handleChange = (e) => {
    setFormData(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isLogin) {
        if (selectedRole === 'DEPARTMENT' && departmentLoginType === 'STAFF') {
          try {
            const { data } = await staffPortalLogin({
              staff_id: formData.username,
              password: formData.password,
            })

            if (data?.success) {
              window.location.href = '/staff-dashboard'
            } else {
              setError(data?.message || 'Staff login failed. Please check Staff ID and password.')
            }
          } catch (err) {
            const apiMessage = err?.response?.data?.message
            setError(apiMessage || 'Unable to reach staff login service. Please try again.')
          }
          return
        }

        const result = await login(
          formData.username,
          formData.password,
          selectedRole,
          selectedRole === 'DEPARTMENT' ? departmentLoginType : selectedRole
        )
        if (!result.success) setError(result.error)
      } else {
        const result = await register(formData)
        if (!result.success) {
          setError(typeof result.error === 'string' ? result.error : JSON.stringify(result.error))
        } else if (formData.role === 'STUDENT') {
          setRegisterSuccess(true)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const selectedRoleData = roles.find(r => r.id === selectedRole)

  const inputCls =
    'w-full px-4 py-3 bg-white border border-sky-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 focus:bg-sky-50/50 transition-all duration-300 text-base'

  const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }
  const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  }

  /* page transition variants */
  const pageSlide = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 60 : -60, filter: 'blur(8px)', scale: 0.96 }),
    center: { opacity: 1, x: 0, filter: 'blur(0px)', scale: 1, transition: { type: 'spring', stiffness: 260, damping: 26 } },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -60 : 60, filter: 'blur(8px)', scale: 0.96, transition: { duration: 0.2 } }),
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-sky-50">
      {/* ══════ ANIMATED BACKGROUND ══════ */}
      <div className="absolute inset-0 pointer-events-none">
        {/* deep gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-white to-blue-100" />

        {/* aurora orbs */}
        <AuroraOrb size={600} x={-5}  y={-10} colors={['rgba(56,189,248,0.25)', 'rgba(14,165,233,0.1)']}  delay={0} dur={16} />
        <AuroraOrb size={500} x={60}  y={55}  colors={['rgba(99,210,255,0.2)',  'rgba(59,130,246,0.08)']} delay={3} dur={18} />
        <AuroraOrb size={450} x={80}  y={-5}  colors={['rgba(34,211,238,0.18)', 'rgba(6,182,212,0.08)']} delay={1.5} dur={14} />
        <AuroraOrb size={350} x={20}  y={70}  colors={['rgba(186,230,253,0.3)', 'rgba(125,211,252,0.12)']} delay={4} dur={20} />

        {/* mesh grid overlay */}
        <MeshGrid />

        {/* particle field */}
        {particles.map(p => <Particle key={p.id} {...p} />)}

        {/* top radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-sky-300/20 to-transparent rounded-full blur-3xl" />
      </div>

      {/* ══════ SPLIT LAYOUT ══════ */}
      <div className="relative z-10 flex w-full min-h-screen">

        {/* ═══ LEFT PANEL — branding ═══ */}
        <motion.div
          initial={{ opacity: 0, x: -80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.1 }}
          className="hidden lg:flex lg:w-[52%] flex-col justify-center items-center relative overflow-hidden"
        >
          {/* subtle left panel glow */}
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-sky-200/20 to-transparent pointer-events-none" />

          {/* animated border line on right edge */}
          <motion.div
            className="absolute right-0 top-0 bottom-0 w-px"
            style={{ background: 'linear-gradient(to bottom, transparent, rgba(56,189,248,0.3), rgba(34,211,238,0.2), transparent)' }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative z-10 max-w-md px-10">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.3 }}
              className="relative mb-5"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-500 flex items-center justify-center shadow-2xl shadow-sky-500/30 relative">
                <motion.div
                  className="absolute -inset-3 rounded-[1.5rem] border border-sky-400/20"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <motion.div
                  className="absolute -inset-6 rounded-[2rem] border border-sky-400/10"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                />
                <img src="/logo.png" alt="SmartBoard" className="w-full h-full object-contain rounded-2xl"
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                <span className="text-white font-black text-3xl hidden items-center justify-center w-full h-full">S</span>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, type: 'spring', stiffness: 150 }}
              className="text-5xl font-black text-gray-900 tracking-tight leading-[1.1]"
            >
              SmartBoard{' '}
              <span className="bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                360
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="text-gray-600 text-lg mt-2 leading-relaxed"
            >
              Your intelligent campus notice board — real-time, smart, and always connected.
            </motion.p>

            {/* Feature list */}
            <div className="mt-5 space-y-2">
              <FeatureItem icon={Bell}       label="Real-time push notifications" delay={0.65} />
              <FeatureItem icon={Search}     label="Smart semantic search"        delay={0.75} />
              <FeatureItem icon={BarChart3}  label="Priority-ranked notice feed"  delay={0.85} />
              <FeatureItem icon={BookOpen}   label="Personalised recommendations" delay={0.95} />
            </div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.05 }}
              className="flex gap-6 mt-6"
            >
              {[
                { value: '4', label: 'AI Engines', color: 'text-sky-600' },
                { value: '60s', label: 'Reminder Poll', color: 'text-cyan-600' },
                { value: '24/7', label: 'Live Updates', color: 'text-cyan-600' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </motion.div>

          </div>
        </motion.div>

        {/* ═══ RIGHT PANEL — form card ═══ */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-6">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.2 }}
            className="relative w-full max-w-[520px]"
          >
            {/* card outer glow */}
            <div className="absolute -inset-4 bg-gradient-to-br from-sky-300/15 via-cyan-200/10 to-blue-300/10 rounded-[2.5rem] blur-3xl" />
            <motion.div
              className="absolute -inset-[1px] rounded-[1.85rem] bg-gradient-to-br from-sky-400/40 via-cyan-400/30 to-transparent"
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative bg-white/90 backdrop-blur-2xl border border-sky-200/60 rounded-[1.75rem] p-6 shadow-2xl overflow-hidden">
              {/* accent shimmer bar */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-500" />
              <motion.div
                className="absolute top-0 left-0 w-24 h-[2px] bg-gradient-to-r from-transparent via-white/80 to-transparent"
                animate={{ x: [-96, 500] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
              />

              {/* corner accent dots */}
              <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-sky-500/50" />
              <div className="absolute top-4 right-8 w-1 h-1 rounded-full bg-cyan-500/40" />

              {/* ── Mobile-only logo ── */}
              <div className="text-center mb-4 lg:hidden">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-500 shadow-xl shadow-sky-500/30 mb-3"
                >
                  <img src="/logo.png" alt="SmartBoard" className="w-full h-full object-contain rounded-2xl"
                    onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                  <span className="text-white font-black text-2xl hidden items-center justify-center w-full h-full">S</span>
                </motion.div>
                <h1 className="text-2xl font-extrabold text-gray-900">
                  SmartBoard <span className="bg-gradient-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent">360</span>
                </h1>
                <p className="text-gray-500 text-sm mt-1">Intelligent Digital Notice Board</p>
              </div>

              {/* ── Desktop card heading ── */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="hidden lg:block mb-4"
              >
                <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  Welcome back
                  <motion.span animate={{ rotate: [0, 14, -8, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
                    <Sparkles className="w-5 h-5 text-sky-400" />
                  </motion.span>
                </h2>
                <p className="text-gray-500 text-lg mt-0.5">Sign in to your portal</p>
              </motion.div>

              {/* ══════ CONTENT ══════ */}
              <div>
                {step === 'role' ? (
                  /* ─── ROLE SELECTION ─── */
                  <motion.div
                    key="role"
                    custom={-1}
                    variants={pageSlide}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    <p className="text-gray-500 text-base font-medium mb-2 lg:hidden text-center">Select your role</p>

                    <div className="space-y-2.5">
                      {roles.map((role) => (
                        <motion.button
                          key={role.id}
                          onClick={() => handleRoleSelect(role.id)}
                          whileHover={{ scale: 1.02, x: 4 }}
                          whileTap={{ scale: 0.97 }}
                          className={`group w-full flex items-center gap-5 p-5 rounded-2xl ${role.bg} border ${role.border} hover:shadow-lg ${role.glow} transition-all duration-300 relative overflow-hidden`}
                        >
                          <role.bgIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-20 h-20 opacity-[0.04] group-hover:opacity-[0.1] transition-all duration-500 group-hover:scale-110 text-white" />

                          <div className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center shrink-0 shadow-md ${role.glow}`}>
                            <role.icon className="w-7 h-7 text-white" />
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-sky-50 login-pulse-dot" />
                          </div>
                          <div className="relative flex-1 text-left">
                            <p className={`${role.text} font-semibold text-lg`}>{role.title}</p>
                            <p className="text-gray-500 text-sm mt-0.5">{role.description}</p>
                          </div>
                          <motion.div
                            className={`${role.text} opacity-30 group-hover:opacity-70 transition-opacity`}
                            animate={{ x: [0, 4, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </motion.div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                ) : step === 'departmentLoginType' ? (
                  <motion.div
                    key="department-login-type"
                    custom={1}
                    variants={pageSlide}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    <motion.button
                      onClick={() => { setStep('role'); setSelectedRole(null); setError('') }}
                      whileHover={{ x: -3 }}
                      className="flex items-center gap-1.5 text-gray-500 hover:text-sky-400 text-xs mb-3 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </motion.button>

                    <div className="mb-4">
                      <h3 className="text-gray-900 font-bold text-lg">Department Login Type</h3>
                      <p className="text-gray-500 text-sm">Choose how you want to sign in for this department.</p>
                    </div>

                    <div className="space-y-2.5">
                      <motion.button
                        onClick={() => handleDepartmentLoginTypeSelect('DEPARTMENT')}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.97 }}
                        className="group w-full flex items-center gap-4 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 hover:shadow-lg shadow-sky-500/20 transition-all duration-300"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center shadow-md shadow-sky-500/25">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sky-500 font-semibold text-base">Department Login</p>
                          <p className="text-gray-500 text-sm">Access department dashboard and management pages.</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-sky-500/70" />
                      </motion.button>

                      <motion.button
                        onClick={() => handleDepartmentLoginTypeSelect('STAFF')}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.97 }}
                        className="group w-full flex items-center gap-4 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 hover:shadow-lg shadow-cyan-500/20 transition-all duration-300"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-md shadow-cyan-500/25">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-cyan-500 font-semibold text-base">Staff Login</p>
                          <p className="text-gray-500 text-sm">Access staff pages only for your department.</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-cyan-500/70" />
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  /* ─── CREDENTIALS FORM ─── */
                  <motion.div
                    key="creds"
                    custom={1}
                    variants={pageSlide}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    {/* Back */}
                    <motion.button
                      onClick={() => {
                        if (isLogin && selectedRole === 'DEPARTMENT') {
                          setStep('departmentLoginType')
                        } else {
                          setStep('role')
                          setSelectedRole(null)
                        }
                        setError('')
                      }}
                      whileHover={{ x: -3 }}
                      className="flex items-center gap-1.5 text-gray-500 hover:text-sky-400 text-xs mb-2 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> {isLogin && selectedRole === 'DEPARTMENT' ? 'Change Login Type' : 'Change Role'}
                    </motion.button>

                    {/* Role badge */}
                    {selectedRoleData && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center gap-3 p-3 rounded-xl ${selectedRoleData.bg} border ${selectedRoleData.border} mb-2 relative overflow-hidden`}
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
                          animate={{ x: [-400, 400] }}
                          transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
                        />
                        <div className={`relative w-8 h-8 rounded-lg bg-gradient-to-br ${selectedRoleData.gradient} flex items-center justify-center shadow-md ${selectedRoleData.glow}`}>
                          <selectedRoleData.icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="relative">
                          <p className={`${selectedRoleData.text} font-semibold text-sm`}>
                            {selectedRole === 'DEPARTMENT' && isLogin && departmentLoginType === 'STAFF'
                              ? 'Staff Portal'
                              : `${selectedRoleData.title} Portal`}
                          </p>
                          <p className="text-gray-500 text-[11px]">
                            {selectedRole === 'DEPARTMENT' && isLogin
                              ? `${departmentLoginType === 'STAFF' ? 'Staff' : 'Department'} Login`
                              : selectedRoleData.description}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Toggle */}
                    <div className="flex bg-sky-100/60 rounded-xl p-1 mb-2 border border-sky-200/60">
                      {[
                        { label: 'Sign In', val: true, icon: LogIn },
                        { label: 'Register', val: false, icon: UserPlus },
                      ].map(({ label, val, icon: Icon }) => (
                        <button
                          key={label}
                          onClick={() => {
                            setIsLogin(val)
                            setError('')
                            if (selectedRole === 'DEPARTMENT' && val) {
                              setStep('departmentLoginType')
                            }
                          }}
                          className={`relative flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 ${isLogin === val
                            ? 'text-white'
                            : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {isLogin === val && (
                            <motion.div
                              layoutId="loginToggle"
                              className="absolute inset-0 bg-gradient-to-r from-sky-600/80 to-cyan-600/80 rounded-lg shadow-md"
                              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -6, height: 0 }}
                          className="mb-1.5 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs"
                        >
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Registration Success (pending approval) */}
                    <AnimatePresence>
                      {registerSuccess && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mb-2 p-3 bg-amber-50 border border-amber-300 rounded-2xl text-center"
                        >
                          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                            <Bell className="w-6 h-6 text-amber-500" />
                          </div>
                          <p className="text-amber-800 font-bold text-sm mb-1">Registration Submitted!</p>
                          <p className="text-amber-700 text-xs leading-relaxed">
                            Your account is <strong>pending department approval</strong>. You will be notified once your department reviews and approves your registration.
                          </p>
                          <motion.button
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => { setRegisterSuccess(false); setIsLogin(true); setFormData(f => ({ ...f, username: '', password: '', password2: '' })) }}
                            className="mt-3 text-xs text-amber-700 font-semibold underline"
                          >
                            Back to Sign In
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Form */}
                    {!registerSuccess && (
                    <motion.form onSubmit={handleSubmit} className="space-y-1.5">
                      {!isLogin && (
                        <>
                          <div className="grid grid-cols-2 gap-2.5">
                            <input type="text" name="first_name" placeholder="First Name" value={formData.first_name}
                              onChange={handleChange} className={inputCls} required />
                            <input type="text" name="last_name" placeholder="Last Name" value={formData.last_name}
                              onChange={handleChange} className={inputCls} required />
                          </div>
                          <div>
                            <input type="email" name="email" placeholder="Email" value={formData.email}
                              onChange={handleChange} className={inputCls} required />
                          </div>
                          {selectedRole === 'STUDENT' && (
                            <div>
                              <select name="department" value={formData.department} onChange={handleChange}
                                className={inputCls + ' cursor-pointer'} required>
                                <option value="CSE">Computer Science &amp; Engineering (CSE)</option>
                                <option value="ECE">Electronics &amp; Communication (ECE)</option>
                                <option value="EEE">Electrical &amp; Electronics (EEE)</option>
                                <option value="MECH">Mechanical Engineering (MECH)</option>
                                <option value="CIVIL">Civil Engineering (CIVIL)</option>
                              </select>
                            </div>
                          )}
                        </>
                      )}

                      <div>
                        <input type="text" name="username"
                          placeholder={
                            selectedRole === 'STUDENT'
                              ? 'Register Number'
                              : selectedRole === 'DEPARTMENT'
                                ? (departmentLoginType === 'STAFF' ? 'Staff ID' : 'Department ID')
                                : 'Username'
                          }
                          value={formData.username} onChange={handleChange} className={inputCls} required />
                      </div>

                      <div className="relative">
                        <input type={showPwd ? 'text' : 'password'} name="password" placeholder="Password"
                          value={formData.password} onChange={handleChange} className={inputCls + ' pr-10'} required />
                        <button type="button" onClick={() => setShowPwd(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-sky-400 transition-colors duration-200">
                          {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {!isLogin && (
                        <div>
                          <input type="password" name="password2" placeholder="Confirm Password" value={formData.password2}
                            onChange={handleChange} className={inputCls} required />
                        </div>
                      )}

                      <div>
                        <motion.button type="submit" disabled={loading}
                          whileHover={{ scale: loading ? 1 : 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className="w-full py-3 bg-gradient-to-r from-sky-600 via-cyan-600 to-sky-600 hover:from-sky-500 hover:via-cyan-500 hover:to-sky-500 text-white rounded-xl font-bold shadow-xl shadow-sky-600/25 flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-1 relative overflow-hidden group bg-[length:200%_100%] hover:bg-right"
                        >
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                          />
                          {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <span className="relative flex items-center gap-2">
                              {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                              {isLogin ? 'Sign In' : 'Create Account'}
                            </span>
                          )}
                        </motion.button>
                      </div>
                    </motion.form>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-center text-gray-500 text-[10px] mt-3 tracking-wide"
              >
                © 2026 SmartBoard 360
              </motion.p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Login
