import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, FileText, Music,
  Video, Table, File, Eye, Calendar, ChevronDown, X, ImageIcon,
  Bookmark, BookmarkCheck, Bell, Share2, Printer, CheckCircle,
  Brain, Sparkles, Zap, Info, AlertTriangle,
} from 'lucide-react'
import Navbar from '../../../shared/components/Navbar'
import api from '../../../shared/services/api'
import { downloadFile } from '../../../shared/services/api'
import wsService from '../../../shared/services/socket'
import { useAuth } from '../../auth/context/AuthContext'

// ── Category config ───────────────────────────────────────────────────
const CATEGORY_CONFIG = {
  Academic:   { icon: '📚', gradient: 'from-blue-500 to-indigo-600',   light: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'   },
  Exam:       { icon: '📝', gradient: 'from-red-500 to-rose-600',      light: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'       },
  Placement:  { icon: '💼', gradient: 'from-green-500 to-emerald-600', light: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  Event:      { icon: '🎉', gradient: 'from-purple-500 to-violet-600', light: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  Holiday:    { icon: '🏖️', gradient: 'from-yellow-400 to-orange-500', light: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  Scholarship:{ icon: '🎓', gradient: 'from-pink-500 to-fuchsia-600',  light: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'   },
  Workshop:   { icon: '🛠️', gradient: 'from-teal-500 to-cyan-600',    light: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'   },
  Internship: { icon: '🏢', gradient: 'from-indigo-500 to-violet-600', light: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  General:    { icon: '📢', gradient: 'from-gray-500 to-slate-600',    light: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'     },
}
const getCatCfg = (cat) => CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.General

// ── Priority helpers ──────────────────────────────────────────────────
function priorityGradient(score) {
  if (score >= 0.9) return 'from-red-500 to-rose-600'
  if (score >= 0.7) return 'from-orange-400 to-amber-500'
  if (score >= 0.5) return 'from-blue-500 to-indigo-500'
  return 'from-gray-400 to-gray-500'
}
function priorityBg(score) {
  if (score >= 0.9) return 'bg-red-500'
  if (score >= 0.7) return 'bg-orange-400'
  if (score >= 0.5) return 'bg-blue-500'
  return 'bg-gray-400'
}

// ── Attachment badge helpers ──────────────────────────────────────────
const MEDIA_BASE = '/media'

const AttachBadge = ({ label, colorClass, icon: Icon, href }) => {
  const inner = (
    <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full text-white font-bold ${colorClass} ${href ? 'hover:opacity-80 active:scale-95 transition-all' : ''}`}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
      {href && <span className="ml-0.5 opacity-70">↓</span>}
    </span>
  )
  if (href)
    return (
      <button type="button" onClick={() => downloadFile(href, href.split('/').pop())} className="cursor-pointer bg-transparent border-0 p-0">
        {inner}
      </button>
    )
  return inner
}

function NoticeAttachments({ notice }) {
  const badges = []
  const mediaHref = (file) => file ? `${MEDIA_BASE}/${file}` : undefined
  if (notice.pdf_file)   badges.push(<AttachBadge key="pdf" label="PDF"   colorClass="bg-red-500"    icon={FileText} href={mediaHref(notice.pdf_file)} />)
  if (notice.image_file) badges.push(<AttachBadge key="img" label="Image" colorClass="bg-purple-500" icon={ImageIcon} href={mediaHref(notice.image_file)} />)
  if (notice.video_file) badges.push(<AttachBadge key="vid" label="Video" colorClass="bg-pink-500"   icon={Video}     href={mediaHref(notice.video_file)} />)
  if (notice.audio_file) badges.push(<AttachBadge key="aud" label="Audio" colorClass="bg-yellow-500" icon={Music}     href={mediaHref(notice.audio_file)} />)
  if (notice.excel_file) badges.push(<AttachBadge key="xl"  label="Excel" colorClass="bg-green-600"  icon={Table}     href={mediaHref(notice.excel_file)} />)
  if (notice.ppt_file)   badges.push(<AttachBadge key="ppt" label="PPT"   colorClass="bg-orange-500" icon={File}      href={mediaHref(notice.ppt_file)} />)
  if (notice.csv_file)   badges.push(<AttachBadge key="csv" label="CSV"   colorClass="bg-teal-500"   icon={Table}     href={mediaHref(notice.csv_file)} />)
  if (badges.length === 0) return null
  return <div className="flex flex-wrap gap-1.5">{badges}</div>
}

// ── Deadline badge ────────────────────────────────────────────────────
function DeadlineBadge({ deadline }) {
  if (!deadline) return null
  const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000)
  let text, cls
  if (diff < 0)        { text = 'Expired'; cls = 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400' }
  else if (diff === 0) { text = 'Today!';  cls = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' }
  else if (diff <= 3)  { text = `${diff}d`; cls = 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' }
  else if (diff <= 7)  { text = `${diff}d`; cls = 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' }
  else                 { text = `${diff}d`; cls = 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-bold ${cls}`}>
      <Calendar className="w-3.5 h-3.5" />
      {text}
    </span>
  )
}

// ── Notice Card ───────────────────────────────────────────────────────
function NoticeCard({ notice, index, onView }) {
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [isSaved, setIsSaved] = useState(notice.is_bookmarked || false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [showReminder, setShowReminder]   = useState(false)
  const [reminderDate, setReminderDate]   = useState(
    notice.deadline ? notice.deadline.split('T')[0] : ''
  )
  const [reminderTime, setReminderTime]   = useState(
    notice.deadline ? notice.deadline.split('T')[1]?.slice(0,5) || '09:00' : '09:00'
  )
  const [reminderDone, setReminderDone]   = useState(false)
  const [reminderLoading, setReminderLoading] = useState(false)
  const [reminderEmail, setReminderEmail] = useState('')
  const [linkCopied, setLinkCopied]       = useState(false)
  const cfg = getCatCfg(notice.category)

  // Pre-fill email from user account once loaded
  useEffect(() => {
    if (user?.email && !reminderEmail) setReminderEmail(user.email)
  }, [user?.email])

  const handleClick = () => {
    setExpanded(true)
    onView(notice.id)
  }

  const handleSave = async () => {
    try {
      if (isSaved) { await api.delete(`/notices/${notice.id}/save/`); setIsSaved(false) }
      else         { await api.post(`/notices/${notice.id}/save/`);   setIsSaved(true)  }
    } catch { setIsSaved(v => !v) }
  }

  const handleBookmark = async () => {
    try {
      if (isBookmarked) { await api.delete(`/notices/${notice.id}/bookmark/`); setIsBookmarked(false) }
      else              { await api.post(`/notices/${notice.id}/bookmark/`);   setIsBookmarked(true)  }
    } catch { setIsBookmarked(v => !v) }
  }

  const handleShare = () => {
    const url = `${window.location.origin}/notices/${notice.id}`
    if (navigator.share) navigator.share({ title: notice.title, text: notice.description, url }).catch(() => {})
    else { navigator.clipboard.writeText(url); alert('Link copied to clipboard!') }
  }

  const handleReminder = async () => {
    if (!reminderDate || !reminderTime) return
    if (!reminderEmail) return alert('Please enter an email address.')
    setReminderLoading(true)
    try {
      await api.post('/reminders/', {
        notice_id         : notice.id,
        reminder_datetime : `${reminderDate}T${reminderTime}:00`,
        email             : reminderEmail,
        message           : '',
      })
      setReminderDone(true)
    } catch { alert('Failed to set reminder. Please try again.') }
    finally  { setReminderLoading(false) }
  }

  const handleCopyNoticeLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/notice/${notice.id}`)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const thumbSrc = notice.thumbnail
    ? (notice.thumbnail.startsWith('http') ? notice.thumbnail : `/media/${notice.thumbnail}`)
    : null

  // Deadline urgency (document spec: days_remaining ≤ 3 → highlight notice)
  const daysLeft = notice.days_remaining !== null && notice.days_remaining !== undefined
    ? notice.days_remaining
    : (notice.deadline ? Math.ceil((new Date(notice.deadline) - new Date()) / 86400000) : null)
  const isDeadlineUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: index * 0.07, type: 'spring', stiffness: 220, damping: 22 }}
        whileHover={{ y: -8, scale: 1.02, boxShadow: '0 24px 48px -8px rgba(0,0,0,0.18)' }}
        whileTap={{ scale: 0.97 }}
        onClick={handleClick}
        style={{
          borderLeft: notice.risk_indicator ? `4px solid ${notice.risk_indicator.color}` : 'none',
        }}
        className={`group bg-white dark:bg-gray-800/90 rounded-3xl shadow-md
                   cursor-pointer overflow-hidden flex flex-col
                   ${isDeadlineUrgent
                     ? 'border-2 border-red-400 dark:border-red-500 shadow-red-200/60 dark:shadow-red-900/40'
                     : 'border border-gray-100 dark:border-gray-700/60'
                   }`}
      >
        {/* ── Urgent Deadline Banner (≤ 3 days) ── */}
        {isDeadlineUrgent && (
          <div className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-red-500 to-orange-500 py-1.5 px-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider animate-pulse">
              ⚠️ Deadline {daysLeft === 0 ? 'TODAY' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
            </span>
          </div>
        )}
        {/* ── Thumbnail / Header Banner ── */}
        <div className={`relative h-64 overflow-hidden bg-gradient-to-br ${cfg.gradient}`}>
          {thumbSrc && !imgError ? (
            <img
              src={thumbSrc}
              alt={notice.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-30">
              <span className="text-[9rem]">{cfg.icon}</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Category pill on top-left */}
          <span className={`absolute top-3 left-3 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/30`}>
            {cfg.icon} {notice.category}
          </span>

          {/* Notice ID on top-right */}
          <span className="absolute top-3 right-3 text-xs text-white/90 font-mono font-semibold bg-black/30 px-2.5 py-1 rounded-full">
            #{notice.notice_id}
          </span>

          {/* Title overlaid at bottom of banner */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
            <h3 className="text-xl font-extrabold text-white leading-snug line-clamp-2 drop-shadow-lg">
              {notice.title}
            </h3>
          </div>
        </div>

        {/* ── Card Body ── */}
        <div className="flex flex-col flex-1 p-5 gap-4">

          {/* Description */}
          <p className="text-base text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed flex-1">
            {notice.description}
          </p>

          {/* Attachments */}
          <NoticeAttachments notice={notice} />

          {/* Footer: deadline + views */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/60">
            <DeadlineBadge deadline={notice.deadline} />
            <span className="flex items-center gap-1.5 text-base font-semibold text-gray-500 dark:text-gray-400">
              <Eye className="w-5 h-5" />
              {(notice.view_count || 0).toLocaleString()}
            </span>
          </div>

          {/* LightGBM Priority bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <motion.div
                className={`h-3 rounded-full bg-gradient-to-r ${priorityGradient(notice.priority_score)}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(notice.priority_score * 100)}%` }}
                transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
              />
            </div>
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 w-10 text-right">
              {(notice.priority_score * 100).toFixed(0)}%
            </span>
          </div>

          {/* ML Algorithm Score Badges */}
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-semibold border border-green-200 dark:border-green-800">
              <Zap className="w-3 h-3" />
              LightGBM {(notice.priority_score * 100).toFixed(0)}%
            </span>
            {notice.recommendation_score != null && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 font-semibold border border-purple-200 dark:border-purple-800">
                <Sparkles className="w-3 h-3" />
                SVD {(notice.recommendation_score * 100).toFixed(0)}%
              </span>
            )}
            {notice.similarity_score != null && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800">
                <Brain className="w-3 h-3" />
                BERT {(notice.similarity_score * 100).toFixed(0)}%
              </span>
            )}
            {notice.risk_indicator && (
              <span 
                className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border`}
                style={{
                  backgroundColor: notice.risk_indicator.color + '15',
                  color: notice.risk_indicator.color,
                  borderColor: notice.risk_indicator.color + '40',
                }}
              >
                <AlertTriangle className="w-3 h-3" />
                {notice.risk_indicator.level}
                {notice.risk_indicator.days_remaining !== null && notice.risk_indicator.days_remaining !== undefined && (
                  <span className="ml-1">({notice.risk_indicator.days_remaining}d)</span>
                )}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-5"
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden flex"
              style={{ height: 'calc(100vh - 40px)' }}
            >
              {/* ── LEFT: full-height banner ── */}
              <div className={`relative w-2/5 flex-shrink-0 bg-gradient-to-br ${cfg.gradient}`}>
                {thumbSrc && !imgError ? (
                  <img
                    src={thumbSrc}
                    alt={notice.title}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-20">
                    <span className="text-[12rem]">{cfg.icon}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />

                {/* Category pill */}
                <span className="absolute top-5 left-5 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30">
                  {cfg.icon} {notice.category}
                </span>

                {/* Bottom title area */}
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <p className="text-white/60 text-sm font-medium mb-2">#{notice.notice_id}</p>
                  <h2 className="text-3xl font-black text-white leading-tight drop-shadow-lg mb-2">
                    {notice.title}
                  </h2>
                  <p className="text-white/70 text-base">{notice.department} · {notice.department_type}</p>
                </div>
              </div>

              {/* ── RIGHT: content panel ── */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top bar */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-gray-700/60 flex-shrink-0">
                  <div className="flex flex-wrap gap-2">
                    {/* Deadline — show full date + relative days */}
                    {notice.deadline ? (() => {
                      const dl = new Date(notice.deadline)
                      const diff = Math.ceil((dl - new Date()) / 86400000)
                      const dateStr = dl.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      const relStr = diff < 0 ? 'Expired' : diff === 0 ? 'Today' : `${diff}d left`
                      const cls = diff < 0
                        ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        : diff <= 3
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                          : diff <= 7
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                      return (
                        <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-bold ${cls}`}>
                          <Calendar className="w-4 h-4" />
                          {dateStr}
                          <span className="opacity-60 font-medium">·</span>
                          {relStr}
                        </span>
                      )
                    })() : null}
                    <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                      <Eye className="w-4 h-4" /> {(notice.view_count || 0).toLocaleString()} views
                    </span>
                    <span className={`inline-flex text-sm px-3 py-1 rounded-full font-bold ${cfg.light}`}>
                      Priority {(notice.priority_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <button
                    onClick={() => setExpanded(false)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition flex-shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

                  {/* Description */}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Description</p>
                    <p className="text-base text-gray-700 dark:text-gray-300 leading-loose whitespace-pre-line">
                      {notice.description}
                    </p>
                  </div>

                  {/* Attachments */}
                  {(notice.pdf_file || notice.image_file || notice.video_file || notice.audio_file || notice.excel_file || notice.ppt_file || notice.csv_file) && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Attachments</p>
                      <NoticeAttachments notice={notice} />
                    </div>
                  )}

                  {/* Priority bar */}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Priority Score</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <motion.div
                          className={`h-3 rounded-full bg-gradient-to-r ${priorityGradient(notice.priority_score)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round(notice.priority_score * 100)}%` }}
                          transition={{ duration: 0.9 }}
                        />
                      </div>
                      <span className="text-base font-black text-gray-600 dark:text-gray-300 w-12 text-right">
                        {(notice.priority_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</p>
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={handleSave}
                        className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-base font-bold transition-all ${
                          isSaved
                            ? 'bg-green-500 text-white shadow-lg shadow-green-200 dark:shadow-green-900/30'
                            : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100'
                        }`}
                      >
                        {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                        {isSaved ? 'Saved!' : 'Save Notice'}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={handleBookmark}
                        className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-base font-bold transition-all ${
                          isBookmarked
                            ? 'bg-purple-500 text-white shadow-lg shadow-purple-200 dark:shadow-purple-900/30'
                            : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-100'
                        }`}
                      >
                        <Bookmark className="w-5 h-5" />
                        {isBookmarked ? 'Bookmarked!' : 'Bookmark'}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setShowReminder(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-base font-bold bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-100 transition-all"
                      >
                        <Bell className="w-5 h-5" />
                        Set Reminder
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={handleShare}
                        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-base font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all"
                      >
                        <Share2 className="w-5 h-5" />
                        Share
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                        onClick={() => window.print()}
                        className="col-span-2 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-base font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      >
                        <Printer className="w-5 h-5" />
                        Print
                      </motion.button>
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 dark:text-gray-500 pb-2">
                    Notice #{notice.notice_id} · Created: {notice.created_at ? new Date(notice.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reminder Modal ── */}
      <AnimatePresence>
        {showReminder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => { setShowReminder(false); setReminderDone(false) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">Set Email Reminder</h3>
                    <p className="text-white/70 text-xs">{cfg.icon} {notice.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowReminder(false); setReminderDone(false) }}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                {reminderDone ? (
                  /* ── Success State ── */
                  <div className="flex flex-col items-center py-10 px-6 gap-4">
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                      className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200"
                    >
                      <CheckCircle className="w-10 h-10 text-white" />
                    </motion.div>
                    <div className="text-center">
                      <p className="text-xl font-black text-gray-900 dark:text-white">Reminder Set!</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        A full email with notice details &amp; link will be sent to:
                      </p>
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1 break-all">{reminderEmail}</p>
                    </div>
                    <div className="w-full bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p><span className="font-semibold">📌 Notice:</span> {notice.title}</p>
                      <p><span className="font-semibold">📅 Remind on:</span> {new Date(`${reminderDate}T${reminderTime}`).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                    <button
                      onClick={() => { setShowReminder(false); setReminderDone(false) }}
                      className="w-full py-3 rounded-xl text-sm font-bold bg-green-500 text-white hover:bg-green-600 transition"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  /* ── Form ── */
                  <div className="p-5 space-y-4">

                    {/* Notice Title */}
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 border border-orange-100 dark:border-orange-800">
                      <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-0.5">Notice</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug">{notice.title}</p>
                    </div>

                    {/* Description Preview */}
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">📄 Description</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                        {notice.description || 'No description.'}
                      </p>
                    </div>

                    {/* Notice Deadline + Link row */}
                    <div className="grid grid-cols-2 gap-2">
                      {notice.deadline && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-100 dark:border-amber-800">
                          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-0.5">⏳ Deadline</p>
                          <p className="text-xs font-semibold text-gray-800 dark:text-white">
                            {new Date(notice.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(notice.deadline).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </p>
                        </div>
                      )}
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 border border-indigo-100 dark:border-indigo-800 flex flex-col justify-between">
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">🔗 Notice Link</p>
                        <button
                          onClick={handleCopyNoticeLink}
                          className="text-xs bg-indigo-100 dark:bg-indigo-800 hover:bg-indigo-200 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-lg transition font-medium"
                        >
                          {linkCopied ? '✅ Copied!' : 'Copy Link'}
                        </button>
                      </div>
                    </div>

                    {/* Editable email input */}
                    <div>
                      <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">✉️ Send Reminder Email To</label>
                      <input
                        type="email"
                        value={reminderEmail}
                        onChange={e => setReminderEmail(e.target.value)}
                        placeholder="Enter email address..."
                        className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl text-sm text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition"
                      />
                      <p className="text-xs text-gray-400 mt-1 ml-1">Pre-filled from your account. You can change it.</p>
                    </div>

                    {/* Date & Time pickers */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">📅 Date</label>
                        <input
                          type="date"
                          value={reminderDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={e => setReminderDate(e.target.value)}
                          className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">🕐 Time</label>
                        <input
                          type="time"
                          value={reminderTime}
                          onChange={e => setReminderTime(e.target.value)}
                          className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 outline-none"
                        />
                      </div>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleReminder}
                      disabled={!reminderDate || !reminderTime || reminderLoading}
                      className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {reminderLoading
                        ? <><span className="animate-spin">⏳</span> Setting Reminder...</>
                        : <><Bell className="w-4 h-4" /> Confirm &amp; Send Email</>
                      }
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Section ───────────────────────────────────────────────────────────
function NoticeSection({ title, gradientClass, borderClass, badge, icon, notices, onView }) {
  const [showAll, setShowAll] = useState(false)
  if (!notices || notices.length === 0) return null
  const display = showAll ? notices : notices.slice(0, 8)

  return (
    <section className="mb-14">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-10 rounded-full bg-gradient-to-b ${gradientClass}`} />
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              {icon} {title}
            </h2>
          </div>
          <span className={`px-3 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${gradientClass}`}>
            {notices.length}
          </span>
        </div>
        {notices.length > 8 && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {showAll ? 'Show less' : `View all ${notices.length}`}
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showAll ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-7"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.07 } },
        }}
      >
        <AnimatePresence>
          {display.map((notice, i) => (
            <NoticeCard key={notice.id} notice={notice} index={i} onView={onView} />
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}

// ── ML Algorithm Info Panel ───────────────────────────────────────────
function MLInfoPanel({ show }) {
  if (!show) return null
  const algorithms = [
    {
      color: 'from-green-500 to-emerald-600',
      icon: '🟢', name: 'LightGBM',
      role: 'Notice Priority Ranking',
      where: 'All notice lists — sorted by score',
      desc: 'Ranks every notice with 7 features: year_importance (W1), dept_match (W2), deadline urgency (W3), admin_priority (W4), student_preference_score (W5), category_weight, engagement_score. Notices with ≤3 day deadlines are highlighted and trigger alerts.',
    },
    {
      color: 'from-blue-500 to-indigo-600',
      icon: '🔵', name: 'DistilBERT',
      role: 'Semantic Smart Search',
      where: 'Search bar — understands meaning',
      desc: 'Converts notice text to 384-dim vectors using paraphrase-MiniLM-L3-v2. Searching "exam postponed" finds "examination rescheduled" via cosine similarity — no keyword match needed.',
    },
    {
      color: 'from-amber-500 to-orange-500',
      icon: '🟡', name: 'Cox Model',
      role: 'Deadline Risk Prediction',
      where: 'Risk banner at top of dashboard',
      desc: 'Survival analysis model trained on engagement patterns. Inputs: engagement_rate, missed_count, days_to_deadline, unread_urgent. Outputs risk_score 0→1 and triggers alerts.',
    },
    {
      color: 'from-purple-500 to-violet-600',
      icon: '🟣', name: 'SVD Matrix Factorization',
      role: 'Personalised Recommendations',
      where: '"Recommended for You" section',
      desc: 'Decomposes your view/bookmark/save history into latent preference factors. Predicts your rating for every unread notice and surfaces the highest-scoring unseen ones first.',
    },
  ]
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
    >
      {algorithms.map((alg, i) => (
        <motion.div
          key={alg.name}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md border border-gray-100 dark:border-gray-700/60"
        >
          <div className={`bg-gradient-to-r ${alg.color} px-4 py-3`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{alg.icon}</span>
              <div>
                <p className="text-white font-black text-sm">{alg.name}</p>
                <p className="text-white/80 text-xs font-semibold">{alg.role}</p>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{alg.where}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{alg.desc}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}

// ── DistilBERT Semantic Search Results ───────────────────────────────
function SmartSearchResults({ results, query, suggestedCategory, loading, onView }) {
  if (!query) return null
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600" />
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-500" />
            DistilBERT Semantic Search
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing results for: <em className="text-blue-600 dark:text-blue-400">"{query}"</em>
            {suggestedCategory && (
              <span className="ml-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                Suggested: {suggestedCategory}
              </span>
            )}
          </p>
        </div>
        {loading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
            className="rounded-full h-5 w-5 border-2 border-blue-200 border-t-blue-500 ml-auto"
          />
        )}
      </div>
      {!loading && results && results.length === 0 && (
        <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60">
          <Brain className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">No semantically similar notices found</p>
        </div>
      )}
      {results && results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-7">
          {results.map((notice, i) => (
            <NoticeCard key={notice.id} notice={notice} index={i} onView={onView} />
          ))}
        </div>
      )}
    </section>
  )
}

// ── SVD Recommended Section ───────────────────────────────────────────
function RecommendedSection({ notices, onView }) {
  if (!notices || notices.length === 0) return null
  const [showAll, setShowAll] = useState(false)
  const display = showAll ? notices : notices.slice(0, 6)
  return (
    <section className="mb-14">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-purple-500 to-violet-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Recommended for You
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">SVD Matrix Factorization · based on your engagement history</p>
          </div>
          <span className="px-3 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-violet-600">
            {notices.length}
          </span>
        </div>
        {notices.length > 6 && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            {showAll ? 'Show less' : `View all ${notices.length}`}
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showAll ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-7">
        {display.map((notice, i) => (
          <NoticeCard key={notice.id} notice={notice} index={i} onView={onView} />
        ))}
      </div>
    </section>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────
const StudentDashboard = () => {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [semanticSearchQuery, setSemanticSearchQuery] = useState('')  // DistilBERT semantic search
  const [keywordSearchQuery, setKeywordSearchQuery] = useState('')   // Keyword search by title
  // ── ML state ──────────────────────────────────────────────────────
  const [mlData, setMlData] = useState(null)          // Cox risk + SVD recommendations
  const [semanticResults, setSemanticResults] = useState(null)   // DistilBERT search results
  const [semanticLoading, setSemanticLoading] = useState(false)
  const [showMLInfo, setShowMLInfo] = useState(false)  // toggle ML info panel
  const [notificationNotice, setNotificationNotice] = useState(null)  // Notice from notification click

  const CATEGORIES = [
    { id: 'all',         label: 'All' },
    { id: 'Exam',        label: '📝 Exams' },
    { id: 'Academic',    label: '📚 Academic' },
    { id: 'Placement',   label: '💼 Placement' },
    { id: 'Event',       label: '🎉 Events' },
    { id: 'Scholarship', label: '🎓 Scholarship' },
    { id: 'Workshop',    label: '🛠️ Workshop' },
    { id: 'Internship',  label: '🏢 Internship' },
    { id: 'Holiday',     label: '🏖️ Holiday' },
  ]

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = {}
      if (selectedCategory !== 'all') params.category = selectedCategory
      // Note: text search handled by DistilBERT (fetchSemanticSearch) below
      const { data: res } = await api.get('/notices/student/notices/', { params })
      setData(res)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError('Failed to load notices. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [selectedCategory])

  // ── Fetch ML data (Cox risk + SVD recommendations) from /dashboard/
  const fetchMLData = useCallback(async () => {
    try {
      const { data: res } = await api.get('/notices/dashboard/')
      setMlData(res)
    } catch (err) {
      console.error('[ML] Dashboard data error:', err)
    }
  }, [])

  // ── DistilBERT semantic search (meaning-based, not keyword) ─────────
  const fetchSemanticSearch = useCallback(async (q) => {
    if (!q.trim()) { setSemanticResults(null); return }
    try {
      setSemanticLoading(true)
      const { data: res } = await api.get('/notices/search/', { params: { q: q.trim(), top_k: 20 } })
      setSemanticResults(res)
    } catch (err) {
      console.error('[DistilBERT] Search error:', err)
      setSemanticResults(null)
    } finally {
      setSemanticLoading(false)
    }
  }, [])

  // ── Keyword search (by title) ──────────────────────────────────────
  const keywordSearchResults = keywordSearchQuery.trim() 
    ? (data?.your_department || [])
        .concat(data?.institution || [])
        .concat(data?.other_departments || [])
        .filter(notice => 
          notice.title.toLowerCase().includes(keywordSearchQuery.toLowerCase()) ||
          (notice.description || '').toLowerCase().includes(keywordSearchQuery.toLowerCase())
        )
        .slice(0, 20)
    : []

  // ── Handle notification click: open modal with notice details ────────
  const handleNotificationClick = useCallback(async (noticeId) => {
    try {
      const { data: notice } = await api.get(`/notices/student/notices/${noticeId}/`)
      setNotificationNotice(notice)
    } catch (err) {
      console.error('[Notification] Error fetching notice:', err)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchMLData() }, [fetchMLData])

  // Real-time: re-fetch whenever any notice changes
  useEffect(() => {
    wsService.connect(user?.id)
    const wsHandler = (msg) => {
      if (['new_notice', 'notice_deleted', 'notice_updated', 'emergency'].includes(msg.type)) {
        fetchData()
        fetchMLData()
      }
    }
    wsService.addListener(wsHandler)
    return () => {
      wsService.removeListener(wsHandler)
      wsService.disconnect()
    }
  }, [fetchData, fetchMLData, user?.id])
  
  // Semantic search: trigger on semantic query change
  useEffect(() => {
    const timer = setTimeout(() => fetchSemanticSearch(semanticSearchQuery), 400)
    return () => clearTimeout(timer)
  }, [semanticSearchQuery, fetchSemanticSearch])

  const handleViewIncrement = async (noticeId) => {
    try {
      await api.post(`/notices/student/notices/${noticeId}/view/`)
    } catch (_) { /* silent */ }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-100 dark:bg-gray-950 gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          className="rounded-full h-14 w-14 border-4 border-indigo-200 border-t-indigo-500"
        />
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Loading notices…</p>
      </div>
    )
  }

  const totals = data?.totals || {}
  const yourDept = data?.your_department || []
  const institution = data?.institution || []
  const otherDepts = data?.other_departments || []

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gray-950">
      <Navbar onNotificationClick={handleNotificationClick} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Hero Header ── */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 rounded-3xl p-7 mb-8 overflow-hidden shadow-xl">
          {/* decorative circles */}
          <div className="absolute -top-8 -right-8 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 left-16 w-36 h-36 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">SmartBoard 360 · AI-Powered</p>
              <h1 className="text-3xl font-extrabold text-white mb-1">
                Welcome, {user?.first_name || user?.username}! 👋
              </h1>
              <p className="text-blue-100 text-sm">
                Department:{' '}
                <span className="font-bold text-white">{user?.department || 'CSE'}</span>
                {' '}·{' '}Notices ranked by LightGBM · Cox Risk · SVD Recommendations
              </p>
            </div>
            <button
              onClick={() => setShowMLInfo(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-bold backdrop-blur-sm border border-white/30 transition-all flex-shrink-0"
            >
              <Brain className="w-4 h-4" />
              {showMLInfo ? 'Hide' : '4 ML Algorithms'}
              <Info className="w-3.5 h-3.5 opacity-70" />
            </button>
          </div>
        </div>

        {/* ── 4 ML Algorithm Info Panel (toggleable) ── */}
        <AnimatePresence>
          {showMLInfo && <MLInfoPanel show={showMLInfo} />}
        </AnimatePresence>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Notices',                              value: totals.total || 0,              gradient: 'from-blue-500 to-indigo-600',   shadow: 'shadow-blue-200 dark:shadow-blue-900/30'   },
            { label: `Dept (${user?.department || 'CSE'})`,        value: totals.your_department || 0,    gradient: 'from-emerald-500 to-green-600',  shadow: 'shadow-green-200 dark:shadow-green-900/30'  },
            { label: 'Institution',                                value: totals.institution || 0,        gradient: 'from-purple-500 to-violet-600',  shadow: 'shadow-purple-200 dark:shadow-purple-900/30' },
            { label: 'Other Depts',                                value: totals.other_departments || 0,  gradient: 'from-orange-400 to-pink-500',    shadow: 'shadow-orange-200 dark:shadow-orange-900/30' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-5 text-white shadow-lg ${s.shadow}`}
            >
              <p className="text-white/80 text-xs font-medium truncate">{s.label}</p>
              <p className="text-4xl font-black mt-1">{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Search Section: TWO SEPARATE SEARCHES ── */}
        
        {/* Search 1: Keyword Search (by title) */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5" />
          <input
            type="text"
            placeholder="🔍 Search notices by title name..."
            value={keywordSearchQuery}
            onChange={e => setKeywordSearchQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700
                       rounded-2xl text-gray-900 dark:text-white placeholder-gray-400
                       focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none shadow-sm"
          />
          {keywordSearchQuery && (
            <button onClick={() => setKeywordSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Search 2: DistilBERT Semantic Search (by meaning) */}
        <div className="relative mb-6">
          <Brain className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-5 h-5" />
          <input
            type="text"
            placeholder="🧠 DistilBERT semantic search — try 'exam postponed' to find 'examination rescheduled'..."
            value={semanticSearchQuery}
            onChange={e => setSemanticSearchQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700
                       rounded-2xl text-gray-900 dark:text-white placeholder-gray-400
                       focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none shadow-sm"
          />
          {semanticSearchQuery && (
            <button onClick={() => setSemanticSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* ── Category Chips ── */}
        <div className="flex flex-wrap gap-2 mb-10">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200
                ${selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-md scale-105'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:shadow hover:border-indigo-300'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* ── Keyword Search Results (shown at the bottom when searching by title) ── */}
        {keywordSearchQuery && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-1 w-8 bg-blue-500 rounded-full" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                📌 Keyword Search Results
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">({keywordSearchResults.length} found)</span>
            </div>
            
            {keywordSearchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-7">
                {keywordSearchResults.map((notice, i) => (
                  <NoticeCard key={notice.id} notice={notice} index={i} onView={handleViewIncrement} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800">
                <Search className="w-12 h-12 text-blue-300 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No notices found matching "<strong>{keywordSearchQuery}</strong>"</p>
              </div>
            )}
          </section>
        )}

        {/* ── DistilBERT Semantic Search Results (shown when using semantic search) ── */}
        {semanticSearchQuery && (
          <SmartSearchResults
            results={semanticResults?.results || []}
            query={semanticSearchQuery}
            suggestedCategory={semanticResults?.suggested_category}
            loading={semanticLoading}
            onView={handleViewIncrement}
          />
        )}

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-6 text-red-700 dark:text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchData} className="underline text-sm ml-4">Retry</button>
          </div>
        )}

        {/* ── SVD Matrix Factorization: Recommended for You (shown when NOT searching) ── */}
        {!keywordSearchQuery && !semanticSearchQuery && (
          <RecommendedSection
            notices={mlData?.recommended_for_you || []}
            onView={handleViewIncrement}
          />
        )}

        {/* ── LightGBM notice groups (sorted by priority_score) (shown when NOT searching) ── */}
        {!keywordSearchQuery && !semanticSearchQuery && (
          <>
          <NoticeSection
            title={`Your Department (${user?.department || 'CSE'})`}
            gradientClass="from-blue-500 to-indigo-600"
            icon="📌"
            notices={yourDept}
            onView={handleViewIncrement}
          />
          <NoticeSection
            title="Institution Notices"
            gradientClass="from-purple-500 to-violet-600"
            icon="🏛️"
            notices={institution}
            onView={handleViewIncrement}
          />
          <NoticeSection
            title="Other Departments"
            gradientClass="from-gray-400 to-slate-500"
            icon="📢"
            notices={otherDepts}
            onView={handleViewIncrement}
          />
          </>
        )}

        {/* ── Notification Modal: Display notice when clicked from notification ── */}
        <AnimatePresence>
          {notificationNotice && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-5"
              onClick={() => setNotificationNotice(null)}
            >
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 16 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex max-h-[90vh]"
              >
                {/* Modal Content - Notice Detail View */}
                {(() => {
                  const cfg = getCatCfg(notificationNotice.category)
                  const thumbSrc = notificationNotice.image_file ? `/media/${notificationNotice.image_file}` : undefined
                  
                  return (
                    <>
                      {/* LEFT: Banner */}
                      <div className={`relative w-2/5 flex-shrink-0 bg-gradient-to-br ${cfg.gradient}`}>
                        {thumbSrc && (
                          <img src={thumbSrc} alt={notificationNotice.title} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
                        <span className="absolute top-5 left-5 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30">
                          {cfg.icon} {notificationNotice.category}
                        </span>
                        <div className="absolute bottom-0 left-0 right-0 p-8">
                          <p className="text-white/60 text-sm font-medium mb-2">#{notificationNotice.id}</p>
                          <h2 className="text-3xl font-black text-white leading-tight drop-shadow-lg">{notificationNotice.title}</h2>
                          <p className="text-white/70 text-base mt-2">{notificationNotice.department}</p>
                        </div>
                      </div>

                      {/* RIGHT: Content */}
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-gray-700/60 flex-shrink-0">
                          <div className="flex flex-wrap gap-2">
                            {notificationNotice.deadline && (
                              <span className="text-xs font-bold uppercase px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                📅 {new Date(notificationNotice.deadline).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <button 
                            onClick={() => setNotificationNotice(null)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          >
                            <X className="w-5 h-5 text-gray-500" />
                          </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-8 py-6">
                          {notificationNotice.description && (
                            <div className="prose dark:prose-invert max-w-none">
                              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {notificationNotice.description}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-100 dark:border-gray-700/60 px-8 py-4 bg-gray-50 dark:bg-gray-800/30 flex-shrink-0">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Posted by {notificationNotice.created_by_name || 'Admin'} on {new Date(notificationNotice.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty state ── */}
        {!error && totals.total === 0 && (
          <div className="text-center py-24">
            <div className="inline-block p-7 bg-white dark:bg-gray-800 rounded-3xl shadow-md mb-5">
              <Search className="w-14 h-14 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No notices found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try a different category or clear your search</p>
          </div>
        )}

      </div>
    </div>
  )
}

export default StudentDashboard
