import React, { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, Edit, Trash2, Eye, Clock, FileText, X, Upload,
  AlertTriangle, Users, TrendingUp, Search, RefreshCw,
  Building, Globe, Layers, Paperclip, Zap, CheckCircle2,
  Activity, BarChart2, BookOpen, Cpu, Star, Briefcase,
  Sun, Award, Wrench, AlignLeft, GraduationCap, Download,
  ExternalLink, Image as ImageIcon, Film, FileType, ChevronRight,
  Calendar, User, ShieldCheck, Bell
} from "lucide-react"
import Navbar from "../../../shared/components/Navbar"
import { useAuth } from "../../auth/context/AuthContext"
import { useTheme } from "../../../app/providers/ThemeProvider"
import api, { uploadAttachment, downloadFile } from "../../../shared/services/api"
import wsService from "../../../shared/services/socket"
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  LineElement, PointElement, Filler,
  Title, Tooltip, Legend
} from "chart.js"
import { Bar, Doughnut, Line } from "react-chartjs-2"

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  LineElement, PointElement, Filler,
  Title, Tooltip, Legend
)

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
      opacity: [0.2, 0.38, 0.2],
      scale: [1, 1.18, 1],
      x: [0, 25, -15, 0],
      y: [0, -20, 12, 0],
    }}
    transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }}
  />
)

const MeshGrid = () => (
  <motion.div className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} transition={{ duration: 2 }}>
    <svg width="100%" height="100%"><defs><pattern id="dashGrid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0L0 0 0 50" fill="none" stroke="#38bdf8" strokeWidth="0.5" /></pattern></defs><rect width="100%" height="100%" fill="url(#dashGrid)" /></svg>
  </motion.div>
)

const Particle = ({ x, y, size, delay, dur }) => (
  <motion.div className="absolute rounded-full bg-sky-400 pointer-events-none" style={{ width: size, height: size, left: `${x}%`, top: `${y}%` }}
    animate={{ opacity: [0, 0.6, 0] }} transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }} />
)

const particles = Array.from({ length: 24 }, (_, i) => ({
  id: i, x: Math.random() * 100, y: Math.random() * 100,
  size: Math.random() * 2 + 1, delay: Math.random() * 5, dur: Math.random() * 4 + 3,
}))

const PageBg = () => {
  const { isDark } = useTheme()
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-br from-[#020b18] via-[#04152a] to-[#030d1c]' : 'bg-gradient-to-br from-sky-50 via-white to-blue-50'}`} />
      {isDark ? (
        <>
          <AuroraOrb size={550} x={-5} y={-8} colors={['rgba(56,189,248,0.35)', 'rgba(14,116,144,0.12)']} delay={0} dur={16} />
          <AuroraOrb size={450} x={65} y={50} colors={['rgba(34,211,238,0.25)', 'rgba(6,182,212,0.08)']} delay={3} dur={18} />
          <AuroraOrb size={400} x={82} y={-5} colors={['rgba(99,179,237,0.18)', 'rgba(56,189,248,0.08)']} delay={1.5} dur={14} />
          <AuroraOrb size={320} x={15} y={68} colors={['rgba(125,211,252,0.18)', 'rgba(56,189,248,0.06)']} delay={4} dur={20} />
        </>
      ) : (
        <>
          <AuroraOrb size={550} x={-5} y={-8} colors={['rgba(186,230,255,0.55)', 'rgba(125,211,252,0.18)']} delay={0} dur={16} />
          <AuroraOrb size={450} x={65} y={50} colors={['rgba(165,243,252,0.45)', 'rgba(103,232,249,0.14)']} delay={3} dur={18} />
          <AuroraOrb size={400} x={82} y={-5} colors={['rgba(147,197,253,0.4)', 'rgba(56,189,248,0.12)']} delay={1.5} dur={14} />
          <AuroraOrb size={320} x={15} y={68} colors={['rgba(186,230,255,0.35)', 'rgba(56,189,248,0.1)']} delay={4} dur={20} />
        </>
      )}
      <MeshGrid />
      {particles.map(p => <Particle key={p.id} {...p} />)}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b ${isDark ? 'from-sky-600/10' : 'from-sky-300/20'} to-transparent rounded-full blur-3xl`} />
    </div>
  )
}

// Category config - icons are Lucide components, no emoji
const CAT_ICON = {
  Academic:    BookOpen,
  Exam:        Cpu,
  Event:       Star,
  Placement:   Briefcase,
  Holiday:     Sun,
  Scholarship: Award,
  Workshop:    Wrench,
  Internship:  GraduationCap,
  General:     AlignLeft,
}
const CAT_STYLE = {
  Academic:    { color: "#3B82F6", grad: "from-blue-500 to-blue-700",       bg: "bg-blue-600",    light: "bg-blue-900/20",       badge: "bg-blue-900/40 text-blue-300" },
  Exam:        { color: "#EF4444", grad: "from-red-500 to-rose-600",        bg: "bg-red-600",     light: "bg-red-900/20",         badge: "bg-red-900/40 text-red-300" },
  Event:       { color: "#8B5CF6", grad: "from-violet-500 to-purple-700",   bg: "bg-violet-600",  light: "bg-violet-900/20",   badge: "bg-violet-900/40 text-violet-300" },
  Placement:   { color: "#10B981", grad: "from-emerald-500 to-green-700",   bg: "bg-emerald-600", light: "bg-emerald-900/20", badge: "bg-emerald-900/40 text-emerald-300" },
  Holiday:     { color: "#F59E0B", grad: "from-amber-400 to-orange-600",    bg: "bg-amber-500",   light: "bg-amber-900/20",     badge: "bg-amber-900/40 text-amber-300" },
  Scholarship: { color: "#F97316", grad: "from-orange-500 to-red-600",      bg: "bg-orange-500",  light: "bg-orange-900/20",   badge: "bg-orange-900/40 text-orange-300" },
  Workshop:    { color: "#14B8A6", grad: "from-teal-500 to-cyan-600",       bg: "bg-teal-500",    light: "bg-teal-900/20",       badge: "bg-teal-900/40 text-teal-300" },
  Internship:  { color: "#6366F1", grad: "from-indigo-500 to-purple-600",   bg: "bg-indigo-500",  light: "bg-indigo-900/20",   badge: "bg-indigo-900/40 text-indigo-300" },
  General:     { color: "#6B7280", grad: "from-gray-500 to-slate-700",      bg: "bg-gray-500",    light: "bg-gray-700/40",       badge: "bg-gray-700/60 text-gray-300" },
}
const PRI_STYLE = {
  URGENT: { bar: "bg-red-500",    pill: "bg-red-500/15 text-red-400 ring-1 ring-red-500/30",    dot: "bg-red-500" },
  HIGH:   { bar: "bg-orange-500", pill: "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30", dot: "bg-orange-500" },
  MEDIUM: { bar: "bg-yellow-400", pill: "bg-yellow-400/15 text-yellow-400 ring-1 ring-yellow-400/30", dot: "bg-yellow-400" },
  LOW:    { bar: "bg-green-500",  pill: "bg-green-500/15 text-green-400 ring-1 ring-green-500/30",  dot: "bg-green-500" },
}

const deadlineInfo = (d) => {
  if (!d) return null
  const diff = Math.ceil((new Date(d) - new Date()) / 86400000)
  if (diff < 0)   return { label: "Expired",       cls: "text-gray-400" }
  if (diff === 0) return { label: "Due Today!",    cls: "text-red-500 font-bold animate-pulse" }
  if (diff <= 3)  return { label: `${diff}d left`, cls: "text-red-500 font-semibold" }
  if (diff <= 7)  return { label: `${diff}d left`, cls: "text-orange-500" }
  return           { label: `${diff}d left`,        cls: "text-gray-400" }
}

// Attachment icon helper
const attachIcon = (name = "") => {
  const ext = name.split(".").pop()?.toLowerCase()
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return <ImageIcon className="w-4 h-4" />
  if (["mp4","mov","avi","mkv"].includes(ext)) return <Film className="w-4 h-4" />
  return <FileType className="w-4 h-4" />
}

// ─── Big Notice Card ──────────────────────────────────────────────────────────
const NoticeCard = ({ notice, index = 0, editable, onEdit, onDelete, onView }) => {
  const catKey  = notice.category || "General"
  const cs      = CAT_STYLE[catKey] || CAT_STYLE.General
  const ps      = PRI_STYLE[notice.priority] || PRI_STYLE.MEDIUM
  const dl      = deadlineInfo(notice.deadline)
  const CatIcon = CAT_ICON[catKey] || AlignLeft

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.96 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 280, damping: 24 }}
      whileHover={{ y: -8, scale: 1.025, transition: { type: 'spring', stiffness: 320, damping: 20 } }}
      whileTap={{ scale: 0.975, transition: { duration: 0.12 } }}
      className="group relative bg-white/80 dark:bg-[#0b1e36]/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-sky-500/15 transition-shadow duration-300 border border-sky-200/60 dark:border-white/[0.06] hover:border-sky-400/50 dark:hover:border-sky-500/30 cursor-pointer ring-1 ring-sky-100 dark:ring-white/[0.04]"
      onClick={() => onView(notice)}
    >
      {/* Hover shimmer scan */}
      <motion.div
        className="absolute inset-0 z-20 pointer-events-none"
        initial={{ x: '-100%', opacity: 0 }}
        whileHover={{ x: '200%', opacity: 1 }}
        transition={{ duration: 0.55, ease: 'easeInOut' }}
        style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.13) 50%, transparent 60%)', willChange: 'transform' }}
      />

      {/* Tall gradient thumbnail header */}
      <div className={`relative bg-gradient-to-br ${cs.grad} px-5 pt-6 pb-10 min-h-[140px] overflow-hidden`}>
        {/* Animated background orbs */}
        <motion.div
          className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 4 + index * 0.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
        />
        <motion.div
          className="absolute bottom-2 right-10 w-16 h-16 rounded-full bg-white/8"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 5 + index * 0.4, repeat: Infinity, ease: 'easeInOut', delay: 1 + index * 0.2 }}
        />
        <div className="absolute top-4 right-24 w-8 h-8 rounded-full bg-white/10" />

        {/* Icon + action buttons */}
        <div className="relative z-10 flex items-start justify-between mb-4">
          <motion.div
            className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30 shadow-lg"
            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.15, transition: { duration: 0.4 } }}
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: index * 0.07 + 0.15, type: 'spring', stiffness: 300, damping: 18 }}
          >
            <CatIcon className="w-6 h-6 text-white" strokeWidth={1.8} />
          </motion.div>
          {editable && (
            <motion.div
              className="flex gap-1.5"
              initial={{ opacity: 0, x: 10 }}
              whileHover={{ opacity: 1, x: 0 }}
              animate={{ opacity: 0 }}
              // override via group-hover via CSS fallback below too
            >
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                <motion.button
                  onClick={e => { e.stopPropagation(); onEdit(notice) }}
                  whileHover={{ scale: 1.15, backgroundColor: 'rgba(255,255,255,0.35)' }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-xl bg-white/20 text-white transition-colors backdrop-blur-sm">
                  <Edit className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button
                  onClick={e => { e.stopPropagation(); onDelete(notice.id) }}
                  whileHover={{ scale: 1.15, backgroundColor: 'rgba(239,68,68,0.6)' }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-xl bg-white/20 text-white transition-colors backdrop-blur-sm">
                  <Trash2 className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Category + priority + deadline badges */}
        <motion.div
          className="relative z-10 flex items-center gap-2 flex-wrap"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.07 + 0.22, duration: 0.3 }}
        >
          <motion.span
            className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white ring-1 ring-white/30 uppercase tracking-wide"
            whileHover={{ scale: 1.08, backgroundColor: 'rgba(255,255,255,0.32)' }}
          >
            {notice.category}
          </motion.span>
          <motion.span
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white ring-1 ring-white/30"
            whileHover={{ scale: 1.08 }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${ps.dot}`} />{notice.priority}
          </motion.span>
          {dl && (
            <motion.span
              className="flex items-center gap-1 text-xs text-white/85 font-medium"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Clock className="w-3 h-3" />{dl.label}
            </motion.span>
          )}
        </motion.div>
      </div>

      {/* Priority colour bar – animates width on mount */}
      <div className="relative h-1 w-full bg-white/20 overflow-hidden">
        <motion.div
          className={`absolute left-0 top-0 h-full ${ps.bar}`}
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ delay: index * 0.07 + 0.35, duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {/* Pending / Rejected status banner */}
      {notice.status === "PENDING" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-2 px-5 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
          <motion.span animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <Clock className="w-3.5 h-3.5 text-yellow-400" />
          </motion.span>
          <span className="text-xs font-semibold text-yellow-400">Pending approval</span>
        </motion.div>
      )}
      {notice.status === "REJECTED" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-2 px-5 py-2 bg-red-500/10 border-b border-red-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs font-semibold text-red-400">Rejected</span>
        </motion.div>
      )}

      {/* Content body */}
      <motion.div
        className="p-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.07 + 0.28, duration: 0.35 }}
      >
        <h3 className="text-base font-bold text-gray-800 dark:text-white leading-snug mb-2 line-clamp-2 group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors duration-200">
          {notice.title}
        </h3>
        {notice.department && notice.department !== "ALL" && (
          <motion.span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-sky-500/15 text-sky-300 font-medium mb-2 ring-1 ring-sky-500/20"
            whileHover={{ scale: 1.06 }}
          >
            <Building className="w-3 h-3" />{notice.department}
          </motion.span>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed mb-4">
          {notice.description}
        </p>
        <div className="flex items-center justify-between border-t border-sky-100 dark:border-white/[0.06] pt-3">
          <div className="flex items-center gap-3">
            <motion.span
              className="flex items-center gap-1 text-xs text-gray-500"
              whileHover={{ scale: 1.1, color: '#38bdf8' }}
            >
              <Eye className="w-3 h-3" />{notice.view_count || 0}
            </motion.span>
            {((notice.all_attachments?.length || notice.attachments?.length) > 0) && (
              <motion.span
                className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 font-medium"
                whileHover={{ scale: 1.1 }}
              >
                <Paperclip className="w-3 h-3" />{notice.all_attachments?.length || notice.attachments?.length}
              </motion.span>
            )}
            {notice.priority_score > 0 && (
              <motion.span
                className="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 font-semibold"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap className="w-3 h-3" />{Math.round((notice.priority_score || 0) * 100)}%
              </motion.span>
            )}
          </div>
          <motion.span
            className="flex items-center gap-0.5 text-xs text-sky-600 dark:text-sky-400 font-medium overflow-hidden"
            whileHover={{ gap: '6px' }}
          >
            View
            <motion.span
              initial={{ x: 0 }}
              whileHover={{ x: 3 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </motion.span>
          </motion.span>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Notice View Modal ────────────────────────────────────────────────────────
const NoticeViewModal = ({ notice, onClose, onEdit, editable }) => {
  if (!notice) return null
  const catKey  = notice.category || "General"
  const cs      = CAT_STYLE[catKey] || CAT_STYLE.General
  const ps      = PRI_STYLE[notice.priority] || PRI_STYLE.MEDIUM
  const dl      = deadlineInfo(notice.deadline)
  const CatIcon = CAT_ICON[catKey] || AlignLeft

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.93, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="bg-sky-50/95 dark:bg-[#061828]/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col ring-1 ring-sky-200/60 dark:ring-white/[0.08] border border-sky-200/60 dark:border-white/[0.06]"
      >
        {/* Hero banner */}
        <div className={`relative bg-gradient-to-br ${cs.grad} px-7 pt-7 pb-8 flex-shrink-0`}>
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10" />
          <div className="absolute bottom-0 right-16 w-20 h-20 rounded-full bg-white/8" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center ring-2 ring-white/30 shadow-lg">
                <CatIcon className="w-7 h-7 text-white" strokeWidth={1.8} />
              </div>
              <div className="flex items-center gap-2">
                {editable && (
                  <button onClick={() => { onClose(); onEdit(notice) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors">
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                <button onClick={onClose} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white ring-1 ring-white/30 uppercase tracking-wide">{notice.category}</span>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white ring-1 ring-white/30">
                <span className={`w-1.5 h-1.5 rounded-full ${ps.dot}`} />{notice.priority}
              </span>
              {notice.department && (
                <span className="px-2.5 py-0.5 rounded-full text-xs bg-white/20 text-white ring-1 ring-white/30 font-medium">{notice.department}</span>
              )}
              {notice.status === "PENDING" && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400/30 text-yellow-100 ring-1 ring-yellow-300/40">
                  <Clock className="w-3 h-3" /> Pending Approval
                </span>
              )}
              {notice.status === "REJECTED" && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-400/30 text-red-100 ring-1 ring-red-300/40">
                  <AlertTriangle className="w-3 h-3" /> Rejected
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white leading-snug">{notice.title}</h2>
          </div>
        </div>
        <div className={`h-1 flex-shrink-0 ${ps.bar}`} />

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-7 space-y-6">
          {/* Meta pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {dl && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/25">
                <Clock className="w-4 h-4 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                <div><p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Deadline</p><p className={`text-base font-semibold ${dl.cls}`}>{dl.label}</p></div>
              </div>
            )}
            {notice.deadline && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25">
                <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                <div><p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Date</p>
                  <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
                    {new Date(notice.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/25">
              <Eye className="w-4 h-4 text-violet-500 dark:text-violet-400 flex-shrink-0" />
              <div><p className="text-sm text-violet-600 dark:text-violet-400 font-medium">Views</p><p className="text-base font-semibold text-gray-700 dark:text-gray-200">{notice.view_count || 0}</p></div>
            </div>
            {notice.created_by_name && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25">
                <User className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                <div><p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Posted by</p><p className="text-base font-semibold text-gray-700 dark:text-gray-200">{notice.created_by_name}</p></div>
              </div>
            )}
            {notice.priority_score > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/25">
                <Zap className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                <div><p className="text-sm text-cyan-600 dark:text-cyan-400 font-medium">ML Score</p><p className="text-base font-semibold text-cyan-700 dark:text-cyan-300">{Math.round((notice.priority_score || 0) * 100)}%</p></div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-2">Description</h4>
            <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line bg-sky-50/60 dark:bg-white/[0.04] border border-sky-100 dark:border-white/[0.06] rounded-xl p-4">
              {notice.description || "No description provided."}
            </p>
          </div>

          {/* Attachments */}
          {(notice.all_attachments?.length > 0 || notice.attachments?.length > 0) && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" /> Attachments ({(notice.all_attachments || notice.attachments || []).length})
              </h4>
              <div className="space-y-2">
                {(notice.all_attachments || notice.attachments || []).map((att, i) => {
                  const name  = att.file_name || att.file?.split("/").pop() || `File ${i + 1}`
                  const url   = att.url || att.file || ""
                  const isImg = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)
                  return (
                    <div key={i} className="group/att flex items-center gap-3 p-3 rounded-xl bg-sky-50/60 dark:bg-white/[0.04] border border-sky-100 dark:border-white/[0.06] hover:border-sky-400 dark:hover:border-sky-500/30 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-500/15 flex items-center justify-center text-sky-600 dark:text-sky-400 flex-shrink-0">
                        {attachIcon(name)}
                      </div>
                      {isImg && url && (
                        <img src={url} alt={name} className="w-14 h-10 object-cover rounded-lg flex-shrink-0" onError={e => { e.target.style.display = "none" }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{name}</p>
                        {att.uploaded_at && <p className="text-xs text-gray-500">{new Date(att.uploaded_at).toLocaleDateString()}</p>}
                        {att.file_size_display && <p className="text-xs text-gray-500">{att.file_size_display}</p>}
                      </div>
                      {url && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); downloadFile(url, name) }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold opacity-0 group-hover/att:opacity-100 transition-opacity hover:bg-sky-500">
                          <Download className="w-3 h-3" /> Download
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// Stat Card – dark glassmorphism
const StatCard = ({ icon: Icon, label, value, sub, from, to, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 24, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, type: 'spring', stiffness: 260, damping: 20 }}
    whileHover={{ y: -6, scale: 1.04, transition: { duration: 0.25 } }}
    className={`bg-gradient-to-br ${from} ${to} rounded-2xl p-7 text-white shadow-lg hover:shadow-2xl hover:shadow-sky-500/15 relative overflow-hidden group cursor-default transition-all duration-300 ring-1 ring-white/10 min-h-[170px] flex flex-col justify-between`}
  >
    <div className="absolute -top-5 -right-5 w-32 h-32 rounded-full bg-white/10 group-hover:scale-150 transition-transform duration-700" />
    <div className="absolute bottom-0 left-2 w-20 h-20 rounded-full bg-white/5 group-hover:scale-[2] transition-transform duration-500" />
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-4">
        <p className="text-white/70 text-sm font-semibold uppercase tracking-widest">{label}</p>
        <motion.div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm" whileHover={{ rotate: 15 }}>
          <Icon className="w-5 h-5" />
        </motion.div>
      </div>
      <p className="text-5xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-white/60 text-sm mt-2">{sub}</p>}
    </div>
  </motion.div>
)

// Field wrapper for forms
const Field = ({ label, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
    {children}
  </div>
)
const inputCls = "w-full px-3 py-2.5 border border-sky-200 dark:border-white/[0.08] rounded-xl bg-sky-50 dark:bg-white/[0.05] text-gray-800 dark:text-white text-base focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 dark:focus:border-sky-400/40 focus:bg-white dark:focus:bg-white/[0.08] outline-none transition backdrop-blur-sm placeholder-gray-400 dark:placeholder-gray-500"

const TABS = [
  { id: "all",    label: "All Board",    icon: Layers },
  { id: "own",    label: "Your Notices", icon: FileText },
  { id: "other",  label: "Other Depts",  icon: Building },
  { id: "global", label: "Institution",  icon: Globe },
  // HOD approvals live on the dedicated page.
]
const ALL_CATS = ["Academic", "Exam", "Event", "Placement", "Holiday", "Scholarship", "Workshop", "Internship", "General"]

// ============================================================
const DepartmentDashboard = () => {
  const { user } = useAuth()
  const [notices,       setNotices]       = useState([])
  const [ownNotices,    setOwnNotices]     = useState([])
  const [otherNotices,  setOtherNotices]   = useState([])
  const [globalNotices, setGlobalNotices]  = useState([])
  const [stats,         setStats]          = useState(null)
  const [loading,       setLoading]        = useState(true)
  const [refreshing,    setRefreshing]     = useState(false)
  const [lastUpdated,   setLastUpdated]    = useState(null)
  const [activeTab,     setActiveTab]      = useState("all")
  const [search,        setSearch]         = useState("")
  const [showCreate,    setShowCreate]     = useState(false)
  const [showStaffCreate, setShowStaffCreate] = useState(false)
  const [showEdit,      setShowEdit]       = useState(false)
  const [editNotice,    setEditNotice]     = useState(null)
  const [viewNotice,    setViewNotice]     = useState(null)
  const [formData,      setFormData]       = useState({ title: "", description: "", category: "General", deadline: "", target_year: "ALL", attachments: [] })
  const [staffForm,     setStaffForm]      = useState({ title: "", description: "", category: "General", department: "ALL", is_urgent: false })
  const [staffAttachFiles, setStaffAttachFiles] = useState([])
  const [staffPending,  setStaffPending]   = useState([])
  const timerRef = useRef(null)
  const staffFileInputRef = useRef(null)

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [deptRes, staffPendingRes] = await Promise.all([
        api.get("/notices/department/stats/"),
        api.get("/notices/staff-notices/pending-hod/").catch(() => ({ data: [] })),
      ])
      const data = deptRes.data
      const allApproved = data.all_approved_notices || []
      const own         = data.own_notices || []

      // Show full board plus own pending/rejected notices so department can track approval state.
      const mergedById = new Map()
      allApproved.forEach(n => mergedById.set(n.id, n))
      own.forEach(n => mergedById.set(n.id, n))
      const allBoard = Array.from(mergedById.values()).sort((a, b) => {
        const ad = a?.created_at ? new Date(a.created_at).getTime() : 0
        const bd = b?.created_at ? new Date(b.created_at).getTime() : 0
        return bd - ad
      })

      setNotices(allBoard)
      setOwnNotices(own)
      setGlobalNotices(allApproved.filter(n => n.department === "INSTITUTION" || n.department === "ALL"))
      setOtherNotices(allApproved.filter(n => n.department !== user?.department && n.department !== "INSTITUTION" && n.department !== "ALL"))
      setStats(data)
      setStaffPending(staffPendingRes.data || [])
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Dashboard fetch error:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
    // 30-second polling fallback
    timerRef.current = setInterval(() => fetchData(true), 30000)

    // Real-time: connect WebSocket and re-fetch on any notice event
    wsService.connect(user?.id)
    const wsHandler = (msg) => {
      if (["new_notice", "notice_deleted", "notice_updated", "emergency"].includes(msg.type)) {
        fetchData(true)
      }
    }
    wsService.addListener(wsHandler)

    return () => {
      clearInterval(timerRef.current)
      wsService.removeListener(wsHandler)
      wsService.disconnect()
    }
  }, [fetchData])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const { data } = await api.post("/notices/", {
        title: formData.title, description: formData.description,
        category: formData.category, department: user?.department || "CSE",
        deadline: formData.deadline || null, priority: "MEDIUM",
        target_year: formData.target_year || "ALL",
      })
      for (const f of formData.attachments) {
        try { await uploadAttachment(data.id, f) } catch (err) { console.error("Upload fail:", f.name) }
      }
      setShowCreate(false)
      setFormData({ title: "", description: "", category: "General", deadline: "", target_year: "ALL", attachments: [] })
      fetchData(true)
    } catch { alert("Failed to create notice. Please try again.") }
  }

  const handleStaffCreate = async (e) => {
    e.preventDefault()
    try {
      const { data } = await api.post("/notices/staff-notices/", {
        title: staffForm.title,
        description: staffForm.description,
        category: staffForm.category,
        department: staffForm.department,
        is_urgent: staffForm.is_urgent,
      })
      if (data?.id && staffAttachFiles.length > 0) {
        for (const f of staffAttachFiles) {
          try { await uploadAttachment(data.id, f) } catch (err) { console.error("Upload fail:", f.name) }
        }
      }
      setShowStaffCreate(false)
      setStaffForm({ title: "", description: "", category: "General", department: "ALL", is_urgent: false })
      setStaffAttachFiles([])
      fetchData(true)
    } catch { alert("Failed to create staff notice.") }
  }


  const handleEdit = async (e) => {
    e.preventDefault()
    try {
      await api.patch("/notices/" + editNotice.id + "/", {
        title: formData.title, description: formData.description,
        category: formData.category, deadline: formData.deadline || null,
        target_year: formData.target_year || "ALL",
      })
      for (const f of formData.attachments) {
        try { await uploadAttachment(editNotice.id, f) } catch (err) { console.error("Upload fail:", f.name) }
      }
      setShowEdit(false); setEditNotice(null)
      setFormData({ title: "", description: "", category: "General", deadline: "", target_year: "ALL", attachments: [] })
      fetchData(true)
      alert("Notice updated!")
    } catch { alert("Failed to update notice.") }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this notice?")) return
    try { await api.delete("/notices/" + id + "/"); fetchData(true) }
    catch { alert("Delete failed.") }
  }

  const openEdit = (n) => {
    setEditNotice(n)
    setFormData({ title: n.title, description: n.description, category: n.category, deadline: n.deadline || "", target_year: n.target_year || "ALL", attachments: [] })
    setShowEdit(true)
  }

  const tabList = { all: notices, own: ownNotices, other: otherNotices, global: globalNotices }
  const filtered = (tabList[activeTab] || []).filter(n =>
    !search || n.title?.toLowerCase().includes(search.toLowerCase()) ||
    n.description?.toLowerCase().includes(search.toLowerCase())
  )

  const byCat      = stats?.by_category || {}
  const catLabels  = ALL_CATS.filter(c => byCat[c] > 0)
  const catValues  = catLabels.map(c => byCat[c])
  const catColors  = catLabels.map(c => CAT_STYLE[c]?.color || "#6B7280")

  const doughnutData = {
    labels: catLabels,
    datasets: [{ data: catValues, backgroundColor: catColors, borderWidth: 2, borderColor: "#ffffff" }],
  }
  const barData = {
    labels: (stats?.top_notices || []).map(n => n.title?.substring(0, 18) + (n.title?.length > 18 ? "..." : "")),
    datasets: [{
      label: "Views",
      data: (stats?.top_notices || []).map(n => n.view_count || 0),
      backgroundColor: ["rgba(245,158,11,0.9)","rgba(99,102,241,0.9)","rgba(16,185,129,0.9)","rgba(239,68,68,0.9)","rgba(56,189,248,0.9)"],
      borderRadius: 14,
      borderSkipped: false,
    }],
  }

  // Daily views – last 7 days (live from DB via EngagementLog)
  const dailyViews  = stats?.daily_views || []
  const dailyLineData = {
    labels: dailyViews.map(d => d.label),
    datasets: [{
      label: "Student Views",
      data: dailyViews.map(d => d.count),
      fill: true,
      tension: 0.4,
      borderColor: "rgba(56,189,248,1)",
      backgroundColor: "rgba(56,189,248,0.12)",
      pointBackgroundColor: "rgba(56,189,248,1)",
      pointRadius: 4,
      borderWidth: 2,
    }],
  }

  // Priority distribution (live DB counts)
  const priDist    = stats?.priority_dist || {}
  const priLabels  = ["LOW", "MEDIUM", "HIGH", "URGENT"]
  const priColors  = ["#22C55E", "#EAB308", "#F97316", "#EF4444"]
  const priorityBarData = {
    labels: priLabels,
    datasets: [{
      label: "Notices",
      data: priLabels.map(p => priDist[p] || 0),
      backgroundColor: priColors,
      borderRadius: 8,
    }],
  }

  // Engagement breakdown (live DB counts)
  const engBreak   = stats?.engagement_breakdown || {}
  const engBarData = {
    labels: ["Viewed", "Downloaded", "Bookmarked", "Shared"],
    datasets: [{
      label: "Interactions",
      data: [engBreak.viewed || 0, engBreak.downloaded || 0, engBreak.bookmarked || 0, engBreak.shared || 0],
      backgroundColor: ["rgba(56,189,248,0.8)","rgba(16,185,129,0.8)","rgba(245,158,11,0.8)","rgba(239,68,68,0.8)"],
      borderRadius: 8,
    }],
  }

  const chartOpts    = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  const topNoticesChartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0,0,0,0.85)', titleColor: '#fff', bodyColor: '#cbd5e1', padding: 10, cornerRadius: 10 } },
    scales: {
      x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.55)', font: { size: 12 } }, border: { display: false } },
      y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false }, ticks: { color: 'rgba(255,255,255,0.55)', font: { size: 12 }, precision: 0 }, border: { display: false } },
    },
  }
  const doughnutOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } } } }
  const lineOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } }, grid: { color: "rgba(0,0,0,0.05)" } },
    },
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-sky-50 dark:bg-[#030c1a] relative overflow-hidden">
      <PageBg />
      <motion.div className="relative z-10 flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-4 border-sky-500/30 border-t-sky-500" />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-sm font-medium text-sky-600/80 dark:text-sky-400/80">Loading dashboard...</motion.p>
      </motion.div>
    </div>
  )

  const activeStudPct = stats?.total_students > 0
    ? Math.round((stats.active_students / stats.total_students) * 100) : 0

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-[#030c1a] relative">
      <PageBg />
      <Navbar />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <motion.span
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 shadow-lg shadow-sky-500/30 ring-1 ring-white/10"
              >
                <GraduationCap className="w-5 h-5 text-white" />
              </motion.span>
              {user?.department || "Department"} Dashboard
            </h1>
            <div className="flex items-center gap-3 mt-1.5 ml-1 text-sm text-gray-500">
              <span>Manage your department notices</span>
              {lastUpdated && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-1.5 text-xs">
                  <span className={"w-1.5 h-1.5 rounded-full " + (refreshing ? "bg-yellow-400 animate-pulse" : "bg-emerald-400")} />
                  Updated {lastUpdated.toLocaleTimeString()}
                </motion.span>
              )}
            </div>
          </div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
            className="flex items-center gap-2">
            <button onClick={() => fetchData(true)} title="Refresh"
              className={"p-2.5 rounded-xl border border-sky-200 dark:border-white/[0.08] bg-sky-50 dark:bg-white/[0.04] backdrop-blur-sm text-gray-500 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-400 dark:hover:border-sky-500/30 transition-all " + (refreshing ? "animate-spin" : "")}>
              <RefreshCw className="w-4 h-4" />
            </button>
            <motion.button
              onClick={() => { window.location.href = '/department/hod-access' }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sky-200 dark:border-white/[0.08] bg-white/90 dark:bg-white/[0.05] text-slate-700 dark:text-slate-200 hover:border-sky-400 hover:text-sky-700 dark:hover:text-sky-100 shadow-sm transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-sky-600" /> HOD Access
              {staffPending.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  {staffPending.length}
                </span>
              )}
            </motion.button>
            <motion.button
              onClick={() => setShowStaffCreate(true)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-200 dark:border-white/[0.08] bg-amber-50/80 dark:bg-white/[0.05] text-amber-700 dark:text-amber-200 hover:border-amber-400 hover:text-amber-800 dark:hover:text-amber-100 shadow-sm transition-all"
            >
              <Bell className="w-4 h-4 text-amber-600" /> Staff Notice
            </motion.button>
            <motion.button
              onClick={() => { window.location.href = '/department/timetable' }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sky-200 dark:border-white/[0.08] bg-white/90 dark:bg-white/[0.05] text-slate-700 dark:text-slate-200 hover:border-sky-400 hover:text-sky-700 dark:hover:text-sky-100 shadow-sm transition-all"
            >
              <Calendar className="w-4 h-4 text-sky-600" /> Timetable
            </motion.button>
            <motion.button onClick={() => setShowCreate(true)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl hover:from-sky-400 hover:to-cyan-500 shadow-lg shadow-sky-500/25 font-medium transition-all ring-1 ring-white/10">
              <Plus className="w-4 h-4" /> Create Notice
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 mb-8">
          <StatCard icon={Layers}        label="Board Total"   value={notices.length}                 sub="all approved"              from="from-sky-500"     to="to-sky-700"      delay={0.00} />
          <StatCard icon={FileText}      label="Your Notices"  value={ownNotices.length}              sub={user?.department}          from="from-purple-500"  to="to-purple-700"   delay={0.05} />
          <StatCard icon={Eye}           label="Total Views"   value={stats?.total_views ?? 0}        sub="on dept notices"           from="from-cyan-500"   to="to-teal-600"   delay={0.10} />
          <StatCard icon={CheckCircle2}  label="Approved"      value={stats?.approved ?? 0}           sub="published"                 from="from-emerald-500"  to="to-green-600"  delay={0.15} />
          <StatCard icon={Activity}      label="Active Stdnts" value={stats?.active_students ?? 0}    sub={activeStudPct + "% engaged"} from="from-cyan-500"   to="to-cyan-700"     delay={0.20} />
          <StatCard icon={AlertTriangle} label="High Risk"     value={stats?.high_risk_students ?? 0} sub="no engagement"             from="from-rose-500"    to="to-red-600"    delay={0.25} />
        </div>

        {/* Analytics Header */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}
          className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
              <Activity className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </motion.span>
            Live Analytics
            <span className="flex items-center gap-1 text-xs font-normal text-emerald-400 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Real-time · auto-refresh 30s
            </span>
          </h2>
        </motion.div>

        {/* Analytics Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

          {/* Category Distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white/80 dark:bg-[#0b1e36]/70 backdrop-blur-xl rounded-2xl p-5 shadow-lg hover:shadow-2xl hover:shadow-sky-500/5 border border-sky-200/60 dark:border-white/[0.06] hover:border-sky-300/60 dark:hover:border-sky-500/20 transition-all duration-300 ring-1 ring-sky-100/50 dark:ring-white/[0.04]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-sky-600 dark:text-sky-400" /> Category Distribution
              </h3>
              <span className="text-xs text-gray-500 bg-sky-50 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">{catLabels.length} active</span>
            </div>
            {catLabels.length > 0
              ? <div className="h-52"><Doughnut data={doughnutData} options={doughnutOpts} /></div>
              : <p className="text-gray-500 text-sm text-center py-10">No notices yet</p>}
          </motion.div>

          {/* Daily Views – live from EngagementLog */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-white/80 dark:bg-[#0b1e36]/70 backdrop-blur-xl rounded-2xl p-5 shadow-lg hover:shadow-2xl hover:shadow-cyan-500/5 border border-sky-200/60 dark:border-white/[0.06] hover:border-cyan-300/40 dark:hover:border-cyan-500/20 transition-all duration-300 ring-1 ring-sky-100/50 dark:ring-white/[0.04]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500 dark:text-blue-400" /> Daily Student Views
              </h3>
              <span className="text-xs text-gray-500 bg-sky-50 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">Last 7 days</span>
            </div>
            {dailyViews.some(d => d.count > 0)
              ? <div className="h-52"><Line data={dailyLineData} options={lineOpts} /></div>
              : <div className="h-52 flex flex-col items-center justify-center gap-2">
                  <Eye className="w-8 h-8 text-gray-300" />
                  <p className="text-gray-500 text-sm">No views logged yet</p>
                  <p className="text-xs text-gray-400">Data appears as students open notices</p>
                </div>}
          </motion.div>
        </div>

        {/* Top Notices by Views – full-width showcase */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="mb-5 bg-gradient-to-br from-[#1e0533] via-[#0d163d] to-[#081428] backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/[0.08] ring-1 ring-white/[0.04] overflow-hidden relative">
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-8 w-40 h-40 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-purple-700/8 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="p-2 bg-yellow-500/20 rounded-xl ring-1 ring-yellow-500/30">
                  <Zap className="w-5 h-5 text-yellow-400" />
                </span>
                Top Notices by Views
              </h3>
              <span className="text-sm font-semibold text-amber-400 bg-amber-500/15 px-4 py-1.5 rounded-full ring-1 ring-amber-500/30">Top 5</span>
            </div>
            {(stats?.top_notices?.length ?? 0) > 0
              ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                  <div className="lg:col-span-2">
                    <div className="h-72"><Bar data={barData} options={topNoticesChartOpts} /></div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {(stats?.top_notices || []).slice(0, 5).map((n, i) => (
                      <div key={i} className="flex items-center gap-3 group">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                          i === 0 ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/40' :
                          i === 1 ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' :
                          i === 2 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
                          'bg-white/10 text-white/70'}`}>{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-amber-300 transition-colors">{n.title}</p>
                          <p className="text-xs text-white/45 mt-0.5">{n.view_count || 0} views</p>
                        </div>
                        <div className={`w-1.5 h-9 rounded-full flex-shrink-0 ${
                          i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-indigo-500' : i === 2 ? 'bg-emerald-500' : i === 3 ? 'bg-red-400' : 'bg-sky-400'}`} style={{ opacity: 0.7 - i * 0.1 }} />
                      </div>
                    ))}
                  </div>
                </div>
              )
              : <p className="text-white/40 text-sm text-center py-14">No view data yet</p>
            }
          </div>
        </motion.div>

        {/* Analytics Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">

          {/* Priority Distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
            className="bg-white/80 dark:bg-[#0b1e36]/70 backdrop-blur-xl rounded-2xl p-5 shadow-lg hover:shadow-2xl hover:shadow-orange-500/5 border border-sky-200/60 dark:border-white/[0.06] hover:border-orange-300/40 dark:hover:border-orange-500/15 transition-all duration-300 ring-1 ring-sky-100/50 dark:ring-white/[0.04]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" /> Priority Distribution
              </h3>
              <span className="text-xs text-gray-500 bg-sky-50 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">Your notices</span>
            </div>
            <div className="h-44"><Bar data={priorityBarData} options={chartOpts} /></div>
          </motion.div>

          {/* Engagement Breakdown */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className="bg-white/80 dark:bg-[#0b1e36]/70 backdrop-blur-xl rounded-2xl p-5 shadow-lg hover:shadow-2xl hover:shadow-cyan-500/5 border border-sky-200/60 dark:border-white/[0.06] hover:border-cyan-300/40 dark:hover:border-cyan-500/15 transition-all duration-300 ring-1 ring-sky-100/50 dark:ring-white/[0.04]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Engagement Breakdown
              </h3>
              <span className="text-xs text-gray-500 bg-sky-50 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">Total interactions</span>
            </div>
            {Object.values(engBreak).some(v => v > 0)
              ? <div className="h-44"><Bar data={engBarData} options={chartOpts} /></div>
              : <div className="h-44 flex flex-col items-center justify-center gap-1">
                  <Users className="w-8 h-8 text-gray-300" />
                  <p className="text-gray-500 text-sm">No interactions yet</p>
                </div>}
          </motion.div>

          {/* Student Engagement Summary */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
            className="bg-white/80 dark:bg-[#0b1e36]/70 backdrop-blur-xl rounded-2xl p-5 shadow-lg hover:shadow-2xl hover:shadow-purple-500/5 border border-sky-200/60 dark:border-white/[0.06] hover:border-purple-300/40 dark:hover:border-purple-500/15 transition-all duration-300 ring-1 ring-sky-100/50 dark:ring-white/[0.04] flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500 dark:text-purple-400" /> Student Engagement
            </h3>
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-600 dark:text-gray-400">Active students</span>
                <span className="text-sm font-bold text-emerald-400">{stats?.active_students ?? 0}/{stats?.total_students ?? 0}</span>
              </div>
              <div className="h-2 bg-sky-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: activeStudPct + "%" }} transition={{ duration: 0.8, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-sky-500 to-cyan-500 rounded-full" />
              </div>
              <p className="text-xs text-gray-500 mt-1">{activeStudPct}% engagement rate</p>
            </div>
            <div className="space-y-2 pt-1">
              {[
                { label: "Total Interactions", val: (engBreak.viewed||0)+(engBreak.downloaded||0)+(engBreak.bookmarked||0)+(engBreak.shared||0), color: "text-sky-600" },
                { label: "Views",      val: engBreak.viewed     || 0, color: "text-blue-400" },
                { label: "Downloads",  val: engBreak.downloaded || 0, color: "text-emerald-400" },
                { label: "Bookmarks",  val: engBreak.bookmarked || 0, color: "text-amber-400" },
              ].map(s => (
                <div key={s.label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{s.label}</span>
                  <span className={"font-bold " + s.color}>{s.val}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 border-t border-sky-100 dark:border-white/[0.06] pt-3">
              {[
                { label: "Approved", val: stats?.approved ?? 0,  color: "text-green-400" },
                { label: "Pending",  val: stats?.pending  ?? 0,  color: "text-yellow-400" },
                { label: "Rejected", val: stats?.rejected ?? 0,  color: "text-red-400" },
              ].map(s => (
                <div key={s.label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{s.label}</span>
                  <span className={"font-bold " + s.color}>{s.val}</span>
                </div>
              ))}
            </div>
            {(stats?.high_risk_students ?? 0) > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span><strong>{stats.high_risk_students}</strong> students with zero views</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Tab Bar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white/80 dark:bg-[#0b1e36]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-sky-200/60 dark:border-white/[0.06] mb-5 ring-1 ring-sky-100/50 dark:ring-white/[0.04]">
          <div className="flex items-center gap-1 p-1.5 overflow-x-auto">
            {TABS.map(t => {
              const list   = tabList[t.id] || []
              const active = activeTab === t.id
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={"relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all " +
                    (active ? "text-white" : "text-gray-500 dark:text-gray-400 hover:bg-sky-100/60 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-200")}>
                  {active && (
                    <motion.div layoutId="activeTab" className="absolute inset-0 bg-gradient-to-r from-sky-500 to-cyan-600 rounded-xl shadow-lg shadow-sky-500/25"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }} />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                    <span className={"px-1.5 py-0.5 rounded-md text-xs font-bold " +
                      (active ? "bg-white/20 text-white" : "bg-sky-100 dark:bg-white/[0.06] text-sky-600 dark:text-sky-400")}>
                      {list.length}
                    </span>
                  </span>
                </button>
              )
            })}
            <div className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl border border-sky-200 dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.04] backdrop-blur-sm shrink-0">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search..." className="bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none w-32" />
              {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300" /></button>}
            </div>
          </div>
        </motion.div>

        {/* Notice List */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="col-span-3 flex flex-col items-center py-24 bg-white/80 dark:bg-[#0b1e36]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-sky-200/60 dark:border-white/[0.06] ring-1 ring-sky-100/50 dark:ring-white/[0.04]">
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                  <FileText className="w-14 h-14 mb-3 text-gray-300" />
                </motion.div>
                <p className="font-medium text-gray-400 mb-1">
                  {search ? "No notices match your search" : "No notices here yet"}
                </p>
                {activeTab === "own" && !search && (
                  <button onClick={() => setShowCreate(true)} className="mt-4 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl text-sm font-semibold hover:from-sky-400 hover:to-cyan-500 transition-all shadow-lg shadow-sky-500/25 ring-1 ring-white/10">
                    Create your first notice
                  </button>
                )}
              </motion.div>
            ) : filtered.map((n, i) => (
              <NoticeCard key={n.id} notice={n} index={i} editable={activeTab === "own"} onEdit={openEdit} onDelete={handleDelete} onView={setViewNotice} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Notice View Modal ── */}
      <AnimatePresence>
        {viewNotice && (
          <NoticeViewModal
            notice={viewNotice}
            onClose={() => setViewNotice(null)}
            onEdit={(n) => { setViewNotice(null); openEdit(n) }}
            editable={ownNotices.some(o => o.id === viewNotice.id)}
          />
        )}
      </AnimatePresence>

      {/* Staff Notice Create Modal */}
      <AnimatePresence>
        {showStaffCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setShowStaffCreate(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-sky-50/95 dark:bg-[#0b1e36]/95 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto ring-1 ring-sky-200/60 dark:ring-white/[0.08] border border-sky-200/60 dark:border-white/[0.06]">
              <div className="flex items-center justify-between p-6 border-b border-sky-200 dark:border-white/[0.06] bg-gradient-to-r from-amber-100 dark:from-amber-600/10 to-yellow-100 dark:to-yellow-600/10 rounded-t-2xl">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Staff Notice</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Requires HOD + Admin approval (ALL skips HOD)</p>
                </div>
                <button onClick={() => { setShowStaffCreate(false); setStaffAttachFiles([]) }} className="p-2 rounded-xl hover:bg-sky-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleStaffCreate} className="p-6 space-y-5">
                <Field label="Title *">
                  <input required value={staffForm.title} onChange={e => setStaffForm(p => ({ ...p, title: e.target.value }))}
                    className={inputCls} placeholder="e.g., Staff Meeting Today" />
                </Field>
                <Field label="Description *">
                  <textarea required rows={4} value={staffForm.description} onChange={e => setStaffForm(p => ({ ...p, description: e.target.value }))}
                    className={inputCls} placeholder="Enter staff notice details..." />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Category *">
                    <select required value={staffForm.category} onChange={e => setStaffForm(p => ({ ...p, category: e.target.value }))} className={inputCls}>
                      {ALL_CATS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Department *">
                    <select required value={staffForm.department} onChange={e => setStaffForm(p => ({ ...p, department: e.target.value }))} className={inputCls}>
                      {["ALL", user?.department || "CSE"].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={staffForm.is_urgent} onChange={e => setStaffForm(p => ({ ...p, is_urgent: e.target.checked }))} />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Mark as urgent</span>
                </div>
                <Field label="Attachments">
                  {staffAttachFiles.length > 0 && (
                    <ul className="space-y-1 mb-2">
                      {staffAttachFiles.map((f, i) => (
                        <li key={i} className="flex items-center justify-between bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 px-3 py-2 rounded-lg text-xs">
                          <span className="flex items-center gap-2 truncate text-gray-600 dark:text-gray-300">
                            <Paperclip className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />{f.name}
                          </span>
                          <button type="button" onClick={() => setStaffAttachFiles(p => p.filter((_, j) => j !== i))}>
                            <X className="w-3.5 h-3.5 text-red-400 hover:text-red-300" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer px-4 py-3 border-2 border-dashed border-sky-200 dark:border-white/[0.08] rounded-xl hover:border-sky-400 dark:hover:border-sky-500/40 hover:bg-sky-50/50 dark:hover:bg-white/[0.03] transition-colors">
                    <Upload className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Add files (PDF, images, docs, video...)</span>
                    <input ref={staffFileInputRef} type="file" multiple className="hidden" onChange={e => {
                      const files = Array.from(e.target.files || [])
                      setStaffAttachFiles(p => [...p, ...files])
                      e.target.value = ""
                    }} />
                  </label>
                </Field>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/25 ring-1 ring-white/10">
                    Submit for Approval
                  </button>
                  <button type="button" onClick={() => { setShowStaffCreate(false); setStaffAttachFiles([]) }} className="px-5 py-2.5 bg-sky-50 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-sky-100 dark:hover:bg-white/[0.1] border border-sky-200 dark:border-white/[0.08] transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-sky-50/95 dark:bg-[#0b1e36]/95 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ring-1 ring-sky-200/60 dark:ring-white/[0.08] border border-sky-200/60 dark:border-white/[0.06]">
              <div className="flex items-center justify-between p-6 border-b border-sky-200 dark:border-white/[0.06] bg-gradient-to-r from-sky-100 dark:from-sky-600/10 to-cyan-100 dark:to-cyan-600/10 rounded-t-2xl">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Department Notice</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Submitted for admin approval</p>
                </div>
                <button onClick={() => setShowCreate(false)} className="p-2 rounded-xl hover:bg-sky-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-5">
                <Field label="Title *">
                  <input required value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                    className={inputCls} placeholder="e.g., Internal Test - Java Programming" />
                </Field>
                <Field label="Description *">
                  <textarea required rows={4} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    className={inputCls} placeholder="Enter detailed description..." />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Category *">
                    <select required value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} className={inputCls}>
                      {ALL_CATS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Deadline *">
                    <input type="date" required value={formData.deadline} onChange={e => setFormData(p => ({ ...p, deadline: e.target.value }))} className={inputCls} />
                  </Field>
                </div>
                <Field label="Target Year">
                  <select value={formData.target_year} onChange={e => setFormData(p => ({ ...p, target_year: e.target.value }))} className={inputCls}>
                    <option value="ALL">All Years</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">Final Year</option>
                  </select>
                </Field>
                <Field label="Attachments">
                  {formData.attachments.length > 0 && (
                    <ul className="space-y-1 mb-2">
                      {formData.attachments.map((f, i) => (
                        <li key={i} className="flex items-center justify-between bg-sky-50 dark:bg-white/[0.05] px-3 py-1.5 rounded-lg text-xs border border-sky-200 dark:border-white/[0.06]">
                          <span className="truncate text-gray-700 dark:text-gray-300">{f.name}</span>
                          <button type="button" onClick={() => setFormData(p => ({ ...p, attachments: p.attachments.filter((_, j) => j !== i) }))}>
                            <X className="w-3.5 h-3.5 text-red-400 hover:text-red-300" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer px-4 py-3 border-2 border-dashed border-sky-200 dark:border-white/[0.08] rounded-xl hover:border-sky-400 dark:hover:border-sky-500/40 hover:bg-sky-50/50 dark:hover:bg-white/[0.03] transition-colors">
                    <Upload className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm text-gray-500">Add files (PDF, images, docs, video...)</span>
                    <input type="file" multiple className="hidden" onChange={e => {
                      const files = Array.from(e.target.files)
                      setFormData(p => ({ ...p, attachments: [...p.attachments, ...files] }))
                      e.target.value = ""
                    }} />
                  </label>
                </Field>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl font-semibold hover:from-sky-400 hover:to-cyan-500 transition-all shadow-lg shadow-sky-500/25 ring-1 ring-white/10">
                    Create Notice
                  </button>
                  <button type="button" onClick={() => setShowCreate(false)} className="px-5 py-2.5 bg-sky-50 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-sky-100 dark:hover:bg-white/[0.1] border border-sky-200 dark:border-white/[0.08] transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEdit && editNotice && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => { setShowEdit(false); setEditNotice(null); setFormData({ title: "", description: "", category: "General", deadline: "", target_year: "ALL", attachments: [] }) }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-sky-50/95 dark:bg-[#0b1e36]/95 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ring-1 ring-sky-200/60 dark:ring-white/[0.08] border border-sky-200/60 dark:border-white/[0.06]">
              <div className="flex items-center justify-between p-6 border-b border-sky-200 dark:border-white/[0.06] bg-gradient-to-r from-sky-100 dark:from-sky-600/10 to-cyan-100 dark:to-cyan-600/10 rounded-t-2xl">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Notice</h2>
                  <p className="text-xs text-gray-500 mt-0.5">You can also add more attachments below</p>
                </div>
                <button onClick={() => { setShowEdit(false); setEditNotice(null); setFormData({ title: "", description: "", category: "General", deadline: "", target_year: "ALL", attachments: [] }) }} className="p-2 rounded-xl hover:bg-sky-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleEdit} className="p-6 space-y-5">
                <Field label="Title *">
                  <input required value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Description *">
                  <textarea required rows={4} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Category *">
                    <select required value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} className={inputCls}>
                      {ALL_CATS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Deadline">
                    <input type="date" value={formData.deadline} onChange={e => setFormData(p => ({ ...p, deadline: e.target.value }))} className={inputCls} />
                  </Field>
                </div>
                <Field label="Target Year">
                  <select value={formData.target_year} onChange={e => setFormData(p => ({ ...p, target_year: e.target.value }))} className={inputCls}>
                    <option value="ALL">All Years</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">Final Year</option>
                  </select>
                </Field>

                {/* Existing attachments */}
                {editNotice?.attachments?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Existing Attachments</p>
                    <div className="space-y-1.5">
                      {editNotice.attachments.map((att, i) => {
                        const name = att.file_name || att.file?.split("/").pop() || `File ${i + 1}`
                        const url  = att.file || att.url || ""
                        return (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 bg-sky-50 dark:bg-white/[0.05] border border-sky-200 dark:border-white/[0.06] rounded-lg text-xs">
                            <Paperclip className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                            <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{name}</span>
                            {url && (
                              <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sky-600 hover:text-sky-700 font-medium">
                                <ExternalLink className="w-3 h-3" /> Open
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Add new attachments */}
                <Field label="Add More Attachments">
                  {formData.attachments.length > 0 && (
                    <ul className="space-y-1 mb-2">
                      {formData.attachments.map((f, i) => (
                        <li key={i} className="flex items-center justify-between bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 px-3 py-2 rounded-lg text-xs">
                          <span className="flex items-center gap-2 truncate text-gray-600 dark:text-gray-300">
                            <Paperclip className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />{f.name}
                          </span>
                          <button type="button" onClick={() => setFormData(p => ({ ...p, attachments: p.attachments.filter((_, j) => j !== i) }))}>
                            <X className="w-3.5 h-3.5 text-red-400 hover:text-red-300" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer px-4 py-3 border-2 border-dashed border-sky-200 dark:border-white/[0.08] rounded-xl hover:border-sky-400 dark:hover:border-sky-500/40 hover:bg-sky-50/50 dark:hover:bg-white/[0.03] transition-colors">
                    <Upload className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Upload additional files (PDF, images, docs…)</span>
                    <input type="file" multiple className="hidden" onChange={e => {
                      const files = Array.from(e.target.files)
                      setFormData(p => ({ ...p, attachments: [...p.attachments, ...files] }))
                      e.target.value = ""
                    }} />
                  </label>
                </Field>

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-600 text-white rounded-xl font-semibold hover:from-sky-400 hover:to-cyan-500 transition-all shadow-lg shadow-sky-500/25 ring-1 ring-white/10">
                    Save Changes
                  </button>
                  <button type="button"
                    onClick={() => { setShowEdit(false); setEditNotice(null); setFormData({ title: "", description: "", category: "General", deadline: "", target_year: "ALL", attachments: [] }) }}
                    className="px-5 py-2.5 bg-sky-50 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-sky-100 dark:hover:bg-white/[0.1] border border-sky-200 dark:border-white/[0.08] transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DepartmentDashboard