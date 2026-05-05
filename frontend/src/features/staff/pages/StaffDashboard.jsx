import React, { useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import {
  Bell, Calendar, Check, FileText, Filter, LayoutDashboard,
  LogOut, Menu, Search, X, ChevronLeft, ChevronRight,
  Clock, Download, Eye, Sparkles, TrendingUp, Activity,
  BookOpen, AlertTriangle, Tag, User, Zap,
} from 'lucide-react'
import {
  getStaffLoginActivity, getStaffNotices, getStaffSession,
  markStaffNoticeRead, staffLogout,
} from '../services/staffApi'

/* ─────────────────────────── constants ─────────────────────────── */
const CATEGORY_ITEMS = ['ALL', 'Academic', 'Leave', 'Events', 'Urgent', 'Circulars']

const CATEGORY_META = {
  Academic: { color: '#3b82f6', bg: '#dbeafe', icon: BookOpen, dot: '#2563eb' },
  Leave:    { color: '#10b981', bg: '#d1fae5', icon: Calendar,  dot: '#10b981' },
  Events:   { color: '#8b5cf6', bg: '#ede9fe', icon: Sparkles,  dot: '#7c3aed' },
  Urgent:   { color: '#ef4444', bg: '#fee2e2', icon: Zap,       dot: '#dc2626' },
  Circulars:{ color: '#f59e0b', bg: '#fef3c7', icon: FileText,  dot: '#f59e0b' },
}

const sidebarItems = [
  { key: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { key: 'calendar',  label: 'Calendar',   icon: Calendar },
  { key: 'search',    label: 'Search',     icon: Search },
]

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/* ─────────────────────────── helpers ─────────────────────────── */
const getCategoryMeta = (cat) => CATEGORY_META[cat] || CATEGORY_META.Circulars

const TILE_THEMES = [
  { a: '#0ea5e9', b: '#6366f1', bg: '#e0f2fe', dot: '#0284c7' },
  { a: '#f97316', b: '#fb7185', bg: '#fff7ed', dot: '#ea580c' },
  { a: '#10b981', b: '#22c55e', bg: '#ecfdf5', dot: '#059669' },
  { a: '#8b5cf6', b: '#ec4899', bg: '#f5f3ff', dot: '#7c3aed' },
  { a: '#0f172a', b: '#38bdf8', bg: '#e2e8f0', dot: '#0ea5e9' },
  { a: '#f59e0b', b: '#84cc16', bg: '#fef9c3', dot: '#d97706' },
]

const pickTheme = (notice) => {
  const seed = (notice?.id || 0) + (notice?.title?.length || 0)
  return TILE_THEMES[Math.abs(seed) % TILE_THEMES.length]
}

const buildTileThumb = (theme, label) => {
  const text = (label || 'Notice').toUpperCase().slice(0, 10)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${theme.a}" />
          <stop offset="1" stop-color="${theme.b}" />
        </linearGradient>
        <pattern id="p" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
          <rect width="80" height="80" fill="none" />
          <circle cx="10" cy="10" r="6" fill="rgba(255,255,255,0.25)" />
          <circle cx="50" cy="50" r="6" fill="rgba(255,255,255,0.18)" />
          <circle cx="70" cy="20" r="4" fill="rgba(255,255,255,0.18)" />
        </pattern>
      </defs>
      <rect width="900" height="600" fill="url(#g)" />
      <rect width="900" height="600" fill="url(#p)" />
      <rect x="60" y="70" width="780" height="420" rx="28" fill="rgba(255,255,255,0.15)" />
      <text x="80" y="470" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="44" font-weight="800" fill="rgba(255,255,255,0.9)">${text}</text>
      <text x="80" y="520" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="2" fill="rgba(255,255,255,0.7)">STAFF BOARD</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const buildCalendarDays = (year, month, notices) => {
  const start      = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startWeekDay = start.getDay()
  const noticeMap  = notices.reduce((acc, n) => {
    const d = new Date(n.date_time).getDate()
    if (!acc[d]) acc[d] = []
    acc[d].push(n)
    return acc
  }, {})
  const days = []
  for (let i = 0; i < startWeekDay; i++) days.push({ day: null, notices: [] })
  for (let d = 1; d <= daysInMonth; d++) days.push({ day: d, notices: noticeMap[d] || [] })
  return days
}

/* ─────────────────────────── sub-components ─────────────────────────── */

/** Animated stat tile */
const StatTile = ({ label, value, icon: Icon, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 28, scale: 0.90 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, type: 'spring', stiffness: 280, damping: 22 }}
    whileHover={{ y: -6, boxShadow: `0 24px 48px ${color}28` }}
    style={{
      borderRadius: 20, padding: '20px 22px',
      background: `linear-gradient(135deg, ${color}16, ${color}06)`,
      border: `1px solid ${color}28`, cursor: 'default',
      backdropFilter: 'blur(12px)', flex: 1, minWidth: 140,
      position: 'relative', overflow: 'hidden',
      boxShadow: `0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)`,
    }}
  >
    {/* Decorative circle */}
    <div style={{
      position: 'absolute', right: -18, bottom: -18,
      width: 80, height: 80, borderRadius: 999,
      background: `${color}10`, border: `2px solid ${color}15`,
      pointerEvents: 'none',
    }} />
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', position: 'relative', zIndex: 1 }}>
      <div>
        <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'rgba(148,163,184,0.8)', marginBottom: 8, letterSpacing: '.07em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: '2.1rem', fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      </div>
      <div style={{
        width: 44, height: 44, borderRadius: 14,
        background: `${color}20`, border: `1px solid ${color}30`,
        display:'grid', placeItems:'center',
        boxShadow: `0 4px 12px ${color}20`,
      }}>
        <Icon size={20} color={color} />
      </div>
    </div>
  </motion.div>
)

/** Bold tile notice card */
const NoticeCard = ({ notice, index, onOpen, onMarkRead }) => {
  const meta = getCategoryMeta(notice.category)
  const Meta = meta.icon
  const tileTheme = pickTheme(notice)
  const [imgError, setImgError] = useState(false)
  const fallbackThumb = buildTileThumb(tileTheme, notice.category || 'Notice')
  const thumbSrc = notice.thumbnail
    ? (notice.thumbnail.startsWith('http') ? notice.thumbnail : `/media/${notice.thumbnail}`)
    : (notice.image_file ? `/media/${notice.image_file}` : fallbackThumb)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, height: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 280, damping: 24 }}
      whileHover={{ y: -6, boxShadow: `0 26px 52px ${meta.color}2e` }}
      style={{
        borderRadius: 26,
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
        border: `2px solid ${tileTheme.a}22`,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 310,
        boxShadow: `0 6px 18px ${tileTheme.a}1a`,
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      onClick={() => onOpen(notice)}
    >
      {/* Color block header */}
      <div style={{
        height: 190,
        background: `linear-gradient(135deg, ${tileTheme.bg}, ${tileTheme.a}22)`,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.7), transparent 55%)',
        }} />
        {thumbSrc && !imgError ? (
          <img
            src={thumbSrc}
            alt={notice.title}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
            <Meta size={78} color={meta.color} style={{ opacity: 0.25 }} />
          </div>
        )}

        {/* Category chip */}
        <span style={{
          position: 'absolute', top: 14, left: 14,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 999,
          background: '#ffffff',
          color: meta.color, fontSize: '.7rem',
          fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
          border: `2px solid ${meta.color}22`,
        }}>
          {notice.category}
        </span>

        {/* Unread dot */}
        {!notice.is_read && (
          <span style={{
            position: 'absolute', top: 16, right: 16,
            width: 12, height: 12, borderRadius: 999,
            background: tileTheme.dot,
            boxShadow: `0 0 0 4px ${tileTheme.a}26`,
          }} />
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <h4 style={{
          margin: 0, fontSize: '1.05rem', fontWeight: 900,
          color: '#0f172a', lineHeight: 1.35, letterSpacing: '-.01em',
        }}>
          {notice.title}
        </h4>
        <p style={{
          margin: 0, fontSize: '.88rem', color: '#475569', lineHeight: 1.6,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {notice.description}
        </p>

        {/* Meta row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: '.75rem', color: '#94a3b8', marginTop: 'auto',
        }}>
          <Clock size={12} color={tileTheme.dot} />
          <span>{new Date(notice.date_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
          {notice.is_read && (
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', fontWeight: 800 }}>
              <Check size={11} /> Read
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }} onClick={e => e.stopPropagation()}>
          <motion.button
            whileTap={{ scale: 0.93 }} whileHover={{ scale: 1.04 }}
            style={{
              flex: 1, border: 'none', borderRadius: 14, padding: '9px 0',
              fontSize: '.8rem', fontWeight: 800, cursor: 'pointer',
              background: `linear-gradient(135deg, ${tileTheme.a}, ${tileTheme.b})`,
              color: '#fff', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: `0 8px 16px ${tileTheme.a}2e`,
            }}
            onClick={() => onOpen(notice)}
          >
            <Eye size={13} /> View
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.93 }} whileHover={{ scale: 1.04 }}
            style={{
              flex: 1, borderRadius: 14, padding: '9px 0',
              fontSize: '.8rem', fontWeight: 800, cursor: 'pointer',
              border: `2px solid ${notice.is_read ? '#e2e8f0' : tileTheme.a}22`,
              background: notice.is_read ? '#f8fafc' : '#ffffff',
              color: notice.is_read ? '#94a3b8' : tileTheme.b,
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
            onClick={() => onMarkRead(notice.id)}
          >
            <Check size={13} />
            {notice.is_read ? 'Read' : 'Mark Read'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

/** Reminder Modal */
const ReminderModal = ({ isOpen, date, onClose, onSave, reminderNote, setReminderNote, reminderTime, setReminderTime }) => {
  if (!isOpen) return null
  
  const dateObj = date ? new Date(date) : new Date()
  const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)',
        display: 'grid', placeItems: 'center', zIndex: 200,
        backdropFilter: 'blur(4px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 24, padding: '28px 24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          width: '100%', maxWidth: 420,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
            display: 'grid', placeItems: 'center', color: '#fff',
          }}>
            <Bell size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>Set Reminder</h3>
            <p style={{ margin: '4px 0 0', fontSize: '.85rem', color: '#64748b' }}>{dateStr}</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Note */}
          <div>
            <label style={{ fontSize: '.85rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
              Reminder Note
            </label>
            <textarea
              value={reminderNote}
              onChange={e => setReminderNote(e.target.value)}
              placeholder="Enter your reminder message..."
              style={{
                width: '100%', borderRadius: 12, border: '1px solid #e2e8f0',
                padding: '10px 12px', fontSize: '.9rem', fontFamily: 'inherit',
                minHeight: 80, outline: 'none', resize: 'none',
              }}
            />
          </div>

          {/* Time */}
          <div>
            <label style={{ fontSize: '.85rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
              Time
            </label>
            <input
              type="time"
              value={reminderTime}
              onChange={e => setReminderTime(e.target.value)}
              style={{
                width: '100%', borderRadius: 12, border: '1px solid #e2e8f0',
                padding: '10px 12px', fontSize: '.9rem', outline: 'none',
              }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={onClose}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 12,
                border: '1px solid #e2e8f0', background: '#f8fafc',
                fontWeight: 700, cursor: 'pointer', color: '#475569',
              }}
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={onSave}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 12,
                border: 'none', background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
                fontWeight: 700, cursor: 'pointer', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Bell size={16} /> Set Reminder
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/** Advanced Calendar */
const AdvancedCalendar = ({ notices, onSelectNotice, reminders, onSetReminder, onOpenReminderModal }) => {
  const today   = new Date()
  const [calYear,  setCalYear]  = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [hoveredDay, setHoveredDay] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)

  const days = useMemo(() => buildCalendarDays(calYear, calMonth, notices), [calYear, calMonth, notices])

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11) }
    else setCalMonth(m => m-1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0) }
    else setCalMonth(m => m+1)
    setSelectedDay(null)
  }

  const monthName = new Date(calYear, calMonth).toLocaleString('default', { month: 'long' })

  return (
    <motion.div
      initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
      style={{
        borderRadius:24, background:'rgba(255,255,255,0.92)',
        border:'1px solid #dbeafe', padding:24,
        boxShadow:'0 20px 60px rgba(37,99,235,0.1)',
        backdropFilter:'blur(12px)',
      }}
    >
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ margin:0, fontSize:'1.5rem', fontWeight:800, color:'#1e293b' }}>{monthName}</h2>
          <span style={{ fontSize:'.84rem', color:'#64748b', fontWeight:600 }}>{calYear}</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <motion.button whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }}
            onClick={prevMonth}
            style={{ width:38, height:38, borderRadius:12, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', display:'grid', placeItems:'center' }}>
            <ChevronLeft size={18} color="#475569" />
          </motion.button>
          <motion.button whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }}
            onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()) }}
            style={{ padding:'0 14px', height:38, borderRadius:12, border:'none', background:'linear-gradient(135deg,#2563eb,#7c3aed)', color:'#fff', fontWeight:700, fontSize:'.8rem', cursor:'pointer' }}>
            Today
          </motion.button>
          <motion.button whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }}
            onClick={nextMonth}
            style={{ width:38, height:38, borderRadius:12, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', display:'grid', placeItems:'center' }}>
            <ChevronRight size={18} color="#475569" />
          </motion.button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:16 }}>
        {Object.entries(CATEGORY_META).map(([k,v]) => (
          <span key={k} style={{ display:'flex', alignItems:'center', gap:5, fontSize:'.73rem', fontWeight:600, color:'#64748b' }}>
            <span style={{ width:8, height:8, borderRadius:999, background:v.dot, display:'inline-block' }} />{k}
          </span>
        ))}
      </div>

      {/* Weekday headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6, marginBottom:8 }}>
        {WEEK_DAYS.map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:'.73rem', fontWeight:700, color:'#94a3b8', padding:'4px 0', letterSpacing:'.05em' }}>{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <motion.div
        key={`${calYear}-${calMonth}`}
        initial={{ opacity:0, x: 20 }}
        animate={{ opacity:1, x:0 }}
        transition={{ type:'spring', stiffness:300, damping:28 }}
        style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6 }}
      >
        {days.map((entry, i) => {
          const isToday = entry.day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()
          const isSelected = entry.day === selectedDay
          const isHovered  = entry.day === hoveredDay
          const hasNotices = entry.notices.length > 0
          return (
            <motion.button
              key={`${entry.day || 'e'}-${i}`}
              whileHover={entry.day ? { scale:1.06 } : {}}
              whileTap={entry.day ? { scale:0.96 } : {}}
              onClick={() => {
                if (!entry.day) return
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(entry.day).padStart(2, '0')}`
                if (entry.day === selectedDay) {
                  setSelectedDay(null)
                } else {
                  setSelectedDay(entry.day)
                  onOpenReminderModal(dateStr)
                }
              }}
              onMouseEnter={() => entry.day && setHoveredDay(entry.day)}
              onMouseLeave={() => setHoveredDay(null)}
              style={{
                minHeight:72, border:'none', borderRadius:14, padding:'8px 6px',
                cursor: entry.day ? 'pointer' : 'default',
                opacity: entry.day ? 1 : 0,
                pointerEvents: entry.day ? 'auto' : 'none',
                background: isSelected
                  ? 'linear-gradient(135deg,#2563eb,#7c3aed)'
                  : isToday
                  ? 'linear-gradient(135deg,#dbeafe,#ede9fe)'
                  : hasNotices
                  ? '#f8fafc'
                  : '#fff',
                border: isToday && !isSelected ? '2px solid #6366f1' : `1px solid ${isSelected ? 'transparent' : '#f1f5f9'}`,
                boxShadow: isSelected ? '0 8px 24px rgba(99,102,241,0.3)' : isHovered ? '0 4px 16px rgba(37,99,235,0.12)' : 'none',
                transition: 'all 0.2s ease',
                display:'flex', flexDirection:'column', alignItems:'center', position: 'relative',
              }}
            >
              {/* Reminder indicator */}
              {reminders.some(r => r.date === `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(entry.day).padStart(2, '0')}` && !r.completed) && (
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  style={{
                    position: 'absolute', top: 2, right: 2,
                    width: 6, height: 6, borderRadius: 999,
                    background: '#f59e0b', boxShadow: '0 0 6px rgba(245, 158, 11, 0.8)',
                  }}
                />
              )}
              <span style={{
                fontWeight: isToday || isSelected ? 800 : 600,
                fontSize: '.9rem',
                color: isSelected ? '#fff' : isToday ? '#2563eb' : '#334155',
                marginBottom:6,
              }}>
                {entry.day}
              </span>
              {/* category dots */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:3, justifyContent:'center' }}>
                {entry.notices.slice(0,5).map((n,ni) => {
                  const m = getCategoryMeta(n.category)
                  return (
                    <motion.span
                      key={n.id}
                      initial={{ scale:0 }} animate={{ scale:1 }}
                      transition={{ delay: ni*0.05 }}
                      title={n.title}
                      style={{ width:7, height:7, borderRadius:999, background: isSelected ? 'rgba(255,255,255,0.8)' : m.dot }}
                    />
                  )
                })}
                {entry.notices.length > 5 && (
                  <span style={{ fontSize:'.55rem', color: isSelected ? 'rgba(255,255,255,0.7)' : '#94a3b8', fontWeight:700 }}>+{entry.notices.length-5}</span>
                )}
              </div>
            </motion.button>
          )
        })}
      </motion.div>

      {/* Selected day notices */}
    </motion.div>
  )
}

/** Notice popup modal */
const NoticeModal = ({ notice, onClose, onMarkRead }) => {
  const meta = getCategoryMeta(notice.category)
  const Meta = meta.icon
  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{
        position:'fixed', inset:0, background:'rgba(15,23,42,0.55)',
        display:'grid', placeItems:'center', padding:20, zIndex:100,
        backdropFilter:'blur(6px)',
      }}
    >
      <motion.div
        initial={{ opacity:0, scale:0.88, y:32 }}
        animate={{ opacity:1, scale:1, y:0 }}
        exit={{ opacity:0, scale:0.9, y:20 }}
        transition={{ type:'spring', stiffness:300, damping:26 }}
        onClick={e => e.stopPropagation()}
        style={{
          width:'min(680px,100%)', borderRadius:28, overflow:'hidden',
          background:'#fff', boxShadow:'0 32px 80px rgba(15,23,42,0.28)',
        }}
      >
        {/* Colored header band */}
        <div style={{
          background:`linear-gradient(135deg, ${meta.color}, ${meta.color}bb)`,
          padding:'22px 24px',
          position:'relative',
        }}>
          <motion.div
            animate={{ rotate:[0,360] }} transition={{ duration:20, repeat:Infinity, ease:'linear' }}
            style={{ position:'absolute', right:20, top:20, opacity:0.15, width:80, height:80, borderRadius:999, border:`20px solid #fff` }}
          />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:14, background:'rgba(255,255,255,0.25)', display:'grid', placeItems:'center' }}>
                <Meta size={22} color="#fff" />
              </div>
              <div>
                <span style={{ fontSize:'.72rem', fontWeight:700, color:'rgba(255,255,255,0.8)', letterSpacing:'.08em', textTransform:'uppercase' }}>
                  {notice.category}
                </span>
                <h2 style={{ margin:'4px 0 0', color:'#fff', fontSize:'1.25rem', fontWeight:800 }}>{notice.title}</h2>
              </div>
            </div>
            <motion.button
              whileHover={{ scale:1.1, rotate:90 }} whileTap={{ scale:0.9 }}
              onClick={onClose}
              style={{ width:34, height:34, borderRadius:10, border:'none', background:'rgba(255,255,255,0.25)', color:'#fff', cursor:'pointer', display:'grid', placeItems:'center', flexShrink:0 }}
            >
              <X size={16} />
            </motion.button>
          </div>

          <div style={{ display:'flex', gap:16, marginTop:14 }}>
            <span style={{ fontSize:'.77rem', color:'rgba(255,255,255,0.85)', display:'flex', alignItems:'center', gap:5 }}>
              <Clock size={13} /> {new Date(notice.date_time).toLocaleString()}
            </span>
            {notice.department && (
              <span style={{ fontSize:'.77rem', color:'rgba(255,255,255,0.85)', display:'flex', alignItems:'center', gap:5 }}>
                <User size={13} /> {notice.department}
              </span>
            )}
            {notice.is_urgent && (
              <span style={{ fontSize:'.72rem', fontWeight:700, background:'rgba(255,255,255,0.25)', color:'#fff', padding:'2px 9px', borderRadius:999, display:'flex', alignItems:'center', gap:4 }}>
                <AlertTriangle size={11} /> URGENT
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'24px 24px 20px' }}>
          <p style={{ margin:'0 0 20px', color:'#334155', lineHeight:1.7, fontSize:'.95rem' }}>
            {notice.full_content || notice.description}
          </p>

          {/* Tags */}
          {notice.tags?.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
              {notice.tags.map(t => (
                <span key={t} style={{ fontSize:'.73rem', fontWeight:700, padding:'4px 10px', borderRadius:999, background:'#f1f5f9', color:'#475569', display:'flex', alignItems:'center', gap:4 }}>
                  <Tag size={10} />{t}
                </span>
              ))}
            </div>
          )}

          {/* Attachments */}
          {notice.attachments?.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
              {notice.attachments.map(a => (
                <motion.button
                  key={a.name} whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
                  style={{
                    border:`1px solid ${meta.color}40`, borderRadius:10, padding:'7px 14px',
                    fontSize:'.82rem', fontWeight:700, background: meta.bg, color: meta.color,
                    cursor:'pointer', display:'flex', alignItems:'center', gap:6,
                  }}>
                  <Download size={13} /> {a.name}
                </motion.button>
              ))}
            </div>
          )}

          {/* Footer actions */}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:16, borderTop:'1px solid #f1f5f9' }}>
            <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
              onClick={onClose}
              style={{ padding:'9px 20px', borderRadius:12, border:'1px solid #e2e8f0', background:'#fff', fontWeight:700, cursor:'pointer', color:'#475569' }}>
              Close
            </motion.button>
            <motion.button whileHover={{ scale:1.04, boxShadow:`0 8px 20px ${meta.color}44` }} whileTap={{ scale:0.96 }}
              onClick={() => onMarkRead(notice.id)}
              style={{
                padding:'9px 20px', borderRadius:12, border:'none',
                background:`linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`,
                color:'#fff', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8,
              }}>
              <Check size={15} /> {notice.is_read ? '✓ Already Read' : 'Mark as Read'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─────────────────────────── main component ─────────────────────────── */
const StaffDashboard = () => {
  const [staff,           setStaff]             = useState(null)
  const [flash,           setFlash]             = useState({ type:'', text:'' })
  const [loading,         setLoading]           = useState(true)
  const [sidebarOpen,     setSidebarOpen]       = useState(false)
  const [activeView,      setActiveView]        = useState('dashboard')

  const [query,           setQuery]             = useState('')
  const [category,        setCategory]          = useState('ALL')
  const [department,      setDepartment]        = useState('CSE')
  const [selectedDate,    setSelectedDate]      = useState('')

  const [suggestions,     setSuggestions]       = useState([])
  const [notices,         setNotices]           = useState([])
  const [highlights,      setHighlights]        = useState([])
  const [notifications,   setNotifications]     = useState([])
  const [unreadCount,     setUnreadCount]       = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [selectedNotice,  setSelectedNotice]    = useState(null)
  const [activity,        setActivity]          = useState([])
  const [reminders,       setReminders]         = useState([])
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [selectedReminderDate, setSelectedReminderDate] = useState(null)
  const [reminderNote,    setReminderNote]      = useState('')
  const [reminderTime,    setReminderTime]      = useState('09:00')
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null)

  const flashTimer = useRef(null)

  const showFlash = (type, text) => {
    setFlash({ type, text })
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash({ type:'', text:'' }), 3500)
  }

  const loadNotices = async (extra = {}) => {
    const params = {
      q: extra.q ?? query,
      category: extra.category ?? category,
      department: extra.department ?? department,
      date: extra.date ?? selectedDate,
    }
    const { data } = await getStaffNotices(params)
    setNotices(data?.notices || [])
    setHighlights(data?.highlights || [])
    setNotifications(data?.notifications || [])
    setSuggestions(data?.suggestions || [])
    setUnreadCount(data?.unread_count || 0)
  }

  useEffect(() => {
    const boot = async () => {
      setLoading(true)
      try {
        const { data } = await getStaffSession()
        if (!data?.logged_in) { window.location.href = '/login'; return }
        setStaff(data.staff)
        await Promise.all([loadNotices(), getStaffLoginActivity().then(r => setActivity(r.data?.items || []))])
      } catch { window.location.href = '/login' }
      finally  { setLoading(false) }
    }
    boot()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { if (!loading) loadNotices() }, 220)
    return () => clearTimeout(t)
  }, [query, category, department, selectedDate])

  const handleLogout = async () => {
    try { await staffLogout(); window.location.href = '/login' }
    catch { showFlash('error', 'Unable to logout right now.') }
  }

  const handleMarkRead = async (noticeId) => {
    try {
      await markStaffNoticeRead(noticeId)
      showFlash('success', 'Notice marked as read.')
      await loadNotices()
      if (selectedNotice?.id === noticeId) setSelectedNotice(p => ({ ...p, is_read: true }))
    } catch { showFlash('error', 'Failed to mark as read.') }
  }

  const handleSetReminder = () => {
    if (!selectedReminderDate || !reminderTime) {
      showFlash('error', 'Please fill in all fields')
      return
    }

    // Check if the reminder date and time is in the past
    const now = new Date()
    const reminderDateTime = new Date(`${selectedReminderDate}T${reminderTime}`)
    
    if (reminderDateTime < now) {
      showFlash('error', 'Do not set the reminder in previous date and time')
      return
    }

    const reminder = {
      id: Date.now(),
      date: selectedReminderDate,
      time: reminderTime,
      note: reminderNote,
      completed: false,
    }
    setReminders([...reminders, reminder])
    showFlash('success', 'Reminder set successfully!')
    setShowReminderModal(false)
    setReminderNote('')
    setReminderTime('09:00')
    setSelectedReminderDate(null)
  }

  const getDueReminders = () => {
    const now = new Date()
    return reminders.filter(r => {
      if (r.completed) return false
      const reminderDateTime = new Date(`${r.date}T${r.time}`)
      return reminderDateTime <= now
    })
  }

  const handleCompleteReminder = (reminderId) => {
    setReminders(reminders.map(r => r.id === reminderId ? { ...r, completed: true } : r))
  }

  const handleDeleteReminder = (reminderId) => {
    setReminders(reminders.filter(r => r.id !== reminderId))
    showFlash('success', 'Reminder cancelled')
  }

  const getReminderStatus = (reminder) => {
    const now = new Date()
    const reminderDateTime = new Date(`${reminder.date}T${reminder.time}`)
    if (reminder.completed) return 'completed'
    if (reminderDateTime <= now) return 'sent'
    return 'unsent'
  }

  const getSelectedDateReminders = () => {
    if (!selectedCalendarDate) return []
    return reminders.filter(r => r.date === selectedCalendarDate)
  }

  const getSelectedDateNotices = () => {
    if (!selectedCalendarDate) return []
    return notices.filter(n => new Date(n.date_time).toISOString().split('T')[0] === selectedCalendarDate)
  }

  /* ── loading spinner ── */
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'grid', placeItems:'center',
      background:'radial-gradient(circle at 30% 20%, #dbeafe, #eef2ff 40%, #f8fafc)' }}>
      <div style={{ textAlign:'center' }}>
        <motion.div
          animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:'linear' }}
          style={{ width:52, height:52, borderRadius:999, border:'4px solid #bfdbfe', borderTopColor:'#4f46e5', margin:'0 auto 16px' }}
        />
        <motion.p animate={{ opacity:[0.5,1,0.5] }} transition={{ duration:1.5, repeat:Infinity }}
          style={{ color:'#64748b', fontWeight:600 }}>Loading Staff Board…</motion.p>
      </div>
    </div>
  )

  const stats = [
    { label:'Total Notices', value: notices.length,                icon: FileText,     color:'#3b82f6' },
    { label:'Unread',        value: unreadCount,                   icon: Bell,         color:'#ef4444' },
    { label:'Urgent',        value: highlights.length,             icon: AlertTriangle, color:'#f59e0b' },
    { label:'This Month',    value: notices.filter(n => new Date(n.date_time).getMonth() === new Date().getMonth()).length, icon: TrendingUp, color:'#10b981' },
  ]

  return (
    <div style={{
      minHeight:'100vh',
      background:'radial-gradient(circle at top left, #dbeafe 0%, #eef2ff 35%, #f8fafc 75%)',
      color:'#0f172a', fontFamily:'system-ui,-apple-system,sans-serif',
    }}>
      <div style={{ display:'block', minHeight:'100vh' }}>

        {/* ── Sidebar ── */}
        <AnimatePresence>
          <motion.aside
            initial={false}
            animate={{ x: sidebarOpen || window.innerWidth > 1024 ? 0 : -260 }}
            transition={{ type:'spring', stiffness:300, damping:30 }}
            style={{
              display:'none',
              borderRight:'1px solid rgba(148,163,184,0.2)',
              padding:'20px 14px', background:'rgba(255,255,255,0.85)',
              backdropFilter:'blur(12px)', position:'sticky', top:0, height:'100vh',
              overflowY:'auto', zIndex:40,
            }}
          >
            {/* Brand */}
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.1 }}
              style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
              <motion.div
                whileHover={{ rotate:10, scale:1.05 }}
                style={{
                  width:42, height:42, borderRadius:14, display:'grid', placeItems:'center',
                  background:'linear-gradient(135deg,#2563eb,#7c3aed)', color:'#fff', fontWeight:800, fontSize:'1.1rem',
                  boxShadow:'0 6px 18px rgba(79,70,229,0.35)',
                }}>SB</motion.div>
              <div>
                <div style={{ fontWeight:800, color:'#1e293b' }}>Staff Board</div>
                <div style={{ fontSize:'.75rem', color:'#64748b' }}>{staff?.department || 'CSE'} Dept</div>
              </div>
            </motion.div>

            {/* Nav items */}
            {sidebarItems.map((item, i) => {
              const Icon = item.icon
              const isActive = activeView === item.key
              return (
                <motion.button
                  key={item.key}
                  initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }}
                  transition={{ delay: 0.1 + i*0.07 }}
                  whileHover={{ x:4 }} whileTap={{ scale:0.96 }}
                  onClick={() => { setActiveView(item.key); setSidebarOpen(false) }}
                  style={{
                    width:'100%', display:'flex', alignItems:'center', gap:12,
                    padding:'11px 14px', border:'none', borderRadius:14, cursor:'pointer',
                    marginBottom:6, position:'relative', overflow:'hidden',
                    background: isActive ? 'transparent' : 'transparent',
                    color: isActive ? '#1e3a8a' : '#475569',
                    fontWeight: isActive ? 700 : 500, fontSize:'.92rem',
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      style={{ position:'absolute', inset:0, borderRadius:14, background:'linear-gradient(135deg,rgba(37,99,235,0.14),rgba(124,58,237,0.12))' }}
                    />
                  )}
                  <Icon size={17} style={{ position:'relative', zIndex:1 }} />
                  <span style={{ position:'relative', zIndex:1 }}>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-dot"
                      style={{ marginLeft:'auto', width:6, height:6, borderRadius:999, background:'#4f46e5', position:'relative', zIndex:1 }}
                    />
                  )}
                </motion.button>
              )
            })}

            {/* Logout */}
            <motion.button
              initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }}
              whileHover={{ x:4, color:'#dc2626' }} onClick={handleLogout}
              style={{
                width:'100%', display:'flex', alignItems:'center', gap:12,
                padding:'11px 14px', border:'none', borderRadius:14, cursor:'pointer',
                marginTop:16, background:'transparent', color:'#64748b', fontWeight:500, fontSize:'.92rem',
              }}>
              <LogOut size={16} /> Sign Out
            </motion.button>
          </motion.aside>
        </AnimatePresence>

        {/* ── Main ── */}
        <div style={{ display:'flex', flexDirection:'column', minWidth:0 }}>

          {/* Topbar */}
          <motion.header
            initial={{ y:-60, opacity:0 }} animate={{ y:0, opacity:1 }}
            transition={{ type:'spring', stiffness:200, damping:22 }}
            style={{
              display:'grid', gridTemplateColumns:'1fr minmax(240px,480px) auto',
              alignItems:'center', gap:12, padding:'14px 22px',
              position:'sticky', top:0, zIndex:20,
              background:'rgba(255,255,255,0.82)', backdropFilter:'blur(16px)',
              borderBottom:'1px solid rgba(148,163,184,0.2)',
              boxShadow:'0 4px 20px rgba(37,99,235,0.07)',
            }}
          >
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <motion.button whileTap={{ scale:0.9 }}
                onClick={() => setSidebarOpen(v => !v)}
                style={{ display:'none', width:36, height:36, borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', placeItems:'center' }}>
                {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
              </motion.button>
              <span style={{ fontWeight:800, color:'#1e3a8a', fontSize:'1rem' }}>Digital Notice Board</span>
            </div>

            {/* Search */}
            <div style={{ position:'relative' }}>
              <Search size={15} style={{ position:'absolute', top:11, left:13, color:'#94a3b8' }} />
              <input
                value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search notices, circulars..."
                style={{
                  width:'100%', border:'1px solid #e2e8f0', borderRadius:999,
                  padding:'9px 14px 9px 38px', background:'rgba(255,255,255,0.95)',
                  fontSize:'.88rem', outline:'none', boxSizing:'border-box',
                  transition:'border-color .2s, box-shadow .2s',
                }}
                onFocus={e => { e.target.style.borderColor='#6366f1'; e.target.style.boxShadow='0 0 0 4px rgba(99,102,241,0.12)' }}
                onBlur={e  => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none' }}
              />
              <AnimatePresence>
                {suggestions.length > 0 && query && (
                  <motion.div
                    initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
                    style={{
                      position:'absolute', top:'calc(100% + 6px)', left:0, right:0, borderRadius:14,
                      background:'#fff', border:'1px solid #dbeafe', boxShadow:'0 16px 40px rgba(30,64,175,0.14)',
                      overflow:'hidden', zIndex:50,
                    }}
                  >
                    {suggestions.map(s => (
                      <button key={s} onClick={() => { setQuery(s); setSuggestions([]) }}
                        style={{ width:'100%', textAlign:'left', border:'none', background:'transparent', padding:'10px 14px', cursor:'pointer', fontSize:'.88rem', color:'#334155' }}
                        onMouseOver={e => e.currentTarget.style.background='#eff6ff'}
                        onMouseOut={e => e.currentTarget.style.background='transparent'}>
                        <Search size={12} style={{ marginRight:8, color:'#94a3b8', verticalAlign:'middle' }} />{s}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right actions */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {/* Bell */}
              <div style={{ position:'relative' }}>
                <motion.button whileHover={{ scale:1.08 }} whileTap={{ scale:0.92 }}
                  onClick={() => setShowNotifications(v => !v)}
                  style={{ width:38, height:38, borderRadius:12, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', display:'grid', placeItems:'center', position:'relative' }}>
                  <motion.div animate={unreadCount > 0 ? { rotate:[0,15,-15,0] } : {}} transition={{ repeat:Infinity, duration:2, repeatDelay:3 }}>
                    <Bell size={17} color="#475569" />
                  </motion.div>
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale:0 }} animate={{ scale:1 }}
                      style={{
                        position:'absolute', top:-6, right:-6,
                        minWidth:18, height:18, borderRadius:999, background:'#ef4444',
                        color:'#fff', fontSize:'.65rem', fontWeight:800,
                        display:'grid', placeItems:'center', padding:'0 4px',
                        boxShadow:'0 2px 8px rgba(239,68,68,0.5)',
                      }}
                    >{unreadCount}</motion.span>
                  )}
                </motion.button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity:0, scale:0.92, y:-10 }}
                      animate={{ opacity:1, scale:1, y:0 }}
                      exit={{ opacity:0, scale:0.92, y:-10 }}
                      style={{
                        position:'absolute', right:0, top:'calc(100% + 10px)',
                        width:320, maxHeight:360, overflowY:'auto', borderRadius:18,
                        background:'#fff', border:'1px solid #dbeafe',
                        boxShadow:'0 20px 50px rgba(30,64,175,0.2)', zIndex:60,
                      }}
                    >
                      <div style={{ padding:'12px 16px', fontWeight:800, borderBottom:'1px solid #f1f5f9', color:'#1e293b' }}>
                        Notifications {unreadCount > 0 && <span style={{ background:'#fee2e2', color:'#ef4444', borderRadius:999, padding:'2px 8px', fontSize:'.7rem' }}>{unreadCount} new</span>}
                      </div>
                      {notifications.length ? notifications.map(n => {
                        const m = getCategoryMeta(n.category)
                        return (
                          <motion.button key={n.id} whileHover={{ background:'#f8fafc' }}
                            onClick={() => { setShowNotifications(false); setSelectedNotice(n) }}
                            style={{ width:'100%', textAlign:'left', border:'none', background:'transparent', padding:'12px 16px', cursor:'pointer', display:'flex', gap:10, alignItems:'flex-start' }}>
                            <div style={{ width:8, height:8, borderRadius:999, background:m.dot, marginTop:5, flexShrink:0 }} />
                            <div>
                              <div style={{ fontWeight:700, fontSize:'.88rem', color:'#1e293b' }}>{n.title}</div>
                              <div style={{ fontSize:'.74rem', color:'#94a3b8', marginTop:2 }}>{new Date(n.date_time).toLocaleString()}</div>
                            </div>
                          </motion.button>
                        )
                      }) : (
                        <div style={{ padding:20, textAlign:'center', color:'#94a3b8', fontSize:'.88rem' }}>No new notifications</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Staff info */}
              <div style={{ textAlign:'right', fontSize:'.8rem' }}>
                <div style={{ fontWeight:700, color:'#1e293b' }}>{staff?.staff_id}</div>
                <div style={{ color:'#64748b' }}>Staff</div>
              </div>

              <motion.button
                whileHover={{ scale:1.03 }}
                whileTap={{ scale:0.98 }}
                onClick={handleLogout}
                style={{
                  display:'inline-flex', alignItems:'center', gap:8,
                  padding:'10px 14px', borderRadius:14, border:'1px solid #fecaca',
                  background:'linear-gradient(135deg, #fff1f2, #fee2e2)',
                  color:'#b91c1c', fontWeight:700, cursor:'pointer',
                  boxShadow:'0 6px 16px rgba(239,68,68,0.08)',
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </motion.button>
            </div>
          </motion.header>

          <div style={{ padding:'16px 22px 0' }}>
            <motion.div
              initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
              transition={{ delay:0.12 }}
              style={{
                display:'flex', flexWrap:'wrap', gap:10,
                padding:12, borderRadius:20,
                background:'rgba(255,255,255,0.72)',
                border:'1px solid rgba(148,163,184,0.2)',
                boxShadow:'0 8px 30px rgba(37,99,235,0.07)',
                backdropFilter:'blur(12px)',
              }}
            >
              {sidebarItems.map((item) => {
                const Icon = item.icon
                const isActive = activeView === item.key
                return (
                  <motion.button
                    key={item.key}
                    whileHover={{ y:-1 }}
                    whileTap={{ scale:0.98 }}
                    onClick={() => setActiveView(item.key)}
                    style={{
                      display:'inline-flex', alignItems:'center', gap:10,
                      padding:'10px 14px', border:'none', borderRadius:14, cursor:'pointer',
                      background: isActive ? 'linear-gradient(135deg, rgba(37,99,235,0.16), rgba(124,58,237,0.14))' : 'transparent',
                      color: isActive ? '#1e3a8a' : '#475569',
                      fontWeight: isActive ? 700 : 500,
                      boxShadow: isActive ? 'inset 0 0 0 1px rgba(79,70,229,0.18)' : 'none',
                    }}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </motion.button>
                )
              })}
            </motion.div>
          </div>

          {/* Content */}
          <main style={{ padding:'20px 22px 32px', display:'grid', gap:20 }}>
            {/* Flash */}
            <AnimatePresence>
              {flash.text && (
                <motion.div
                  initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-16 }}
                  style={{
                    position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
                    zIndex: 9999, width: 'calc(100% - 32px)', maxWidth: '500px',
                    borderRadius:14, padding:'12px 16px', fontWeight:700, fontSize:'.9rem',
                    background: flash.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: flash.type === 'success' ? '#166534' : '#991b1b',
                    border: `1px solid ${flash.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                    display:'flex', justifyContent:'space-between', alignItems: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                >
                  {flash.text}
                  <X size={16} style={{ cursor:'pointer' }} onClick={() => setFlash({ type:'', text:'' })} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats - only on dashboard */}
            {activeView === 'dashboard' && (
              <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                {stats.map((s, i) => <StatTile key={s.label} {...s} delay={i*0.07} />)}
              </div>
            )}

            {/* Filters - only show when not on dashboard */}
            {activeView !== 'dashboard' && (
              <motion.section
                initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
                style={{
                  borderRadius:20, padding:'16px 18px',
                  background:'rgba(255,255,255,0.88)', backdropFilter:'blur(12px)',
                  border:'1px solid rgba(148,163,184,0.2)', boxShadow:'0 8px 30px rgba(37,99,235,0.07)',
                }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                  <Filter size={15} color="#4f46e5" />
                  <strong style={{ color:'#1e293b', fontSize:'.9rem' }}>Smart Filters</strong>
                </div>
                <div style={{ display:'grid', gap:10, gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))' }}>
                  {[
                    { value:department, onChange:e=>setDepartment(e.target.value), opts:['ALL','CSE','ECE','EEE','MECH','CIVIL'], label:'Department' },
                    { value:category,   onChange:e=>setCategory(e.target.value),   opts:CATEGORY_ITEMS, label:'Category' },
                  ].map(f => (
                    <select key={f.label} value={f.value} onChange={f.onChange}
                      style={{ border:'1px solid #e2e8f0', borderRadius:12, padding:'10px 12px', background:'#fff', fontSize:'.88rem', color:'#334155', cursor:'pointer', outline:'none' }}>
                      {f.opts.map(o => <option key={o} value={o}>{o === 'ALL' ? `All ${f.label}s` : o}</option>)}
                    </select>
                  ))}
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                    style={{ border:'1px solid #e2e8f0', borderRadius:12, padding:'10px 12px', background:'#fff', fontSize:'.88rem', color:'#334155', outline:'none' }}
                  />
                  <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                    onClick={() => { setQuery(''); setCategory('ALL'); setDepartment('CSE'); setSelectedDate('') }}
                    style={{ border:'1px solid #e2e8f0', borderRadius:12, padding:'10px 16px', background:'#fff', fontWeight:700, fontSize:'.88rem', color:'#64748b', cursor:'pointer' }}>
                    Reset
                  </motion.button>
                </div>
              </motion.section>
            )}

            {/* Dashboard view - stats, highlights, and today's notices */}
            {activeView === 'dashboard' && (() => {
              const todayNotices = notices.filter(n => {
                const noticeDate = new Date(n.date_time).toDateString()
                const today = new Date().toDateString()
                return noticeDate === today
              })
              return (
                <>
                  {/* Highlights */}
                  {highlights.length > 0 && (
                    <section>
                      <h3 style={{ margin:'0 0 12px', fontSize:'.9rem', fontWeight:700, color:'#64748b', letterSpacing:'.06em', textTransform:'uppercase' }}>
                        🔥 Important Highlights
                      </h3>
                      <div style={{ display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))' }}>
                        {highlights.map((h, i) => (
                          <motion.div key={h.id}
                            initial={{ opacity:0, scale:0.92 }} animate={{ opacity:1, scale:1 }}
                            transition={{ delay: i*0.08 }}
                            whileHover={{ y:-4, boxShadow:'0 24px 50px rgba(239,68,68,0.25)' }}
                            onClick={() => setSelectedNotice(h)}
                            style={{
                              borderRadius:20, padding:'18px 20px', cursor:'pointer', overflow:'hidden', position:'relative',
                              background:'linear-gradient(130deg,#dc2626,#f59e0b)',
                              boxShadow:'0 12px 28px rgba(239,68,68,0.22)',
                            }}>
                            <motion.div
                              animate={{ rotate:360 }} transition={{ duration:25, repeat:Infinity, ease:'linear' }}
                              style={{ position:'absolute', right:-20, top:-20, width:100, height:100, borderRadius:999, border:'28px solid rgba(255,255,255,0.1)' }}
                            />
                            <span style={{ fontSize:'.7rem', fontWeight:800, background:'rgba(255,255,255,0.25)', color:'#fff', borderRadius:999, padding:'3px 10px', letterSpacing:'.07em' }}>URGENT</span>
                            <h4 style={{ margin:'10px 0 6px', color:'#fff', fontWeight:800, fontSize:'1.02rem' }}>{h.title}</h4>
                            <p style={{ margin:0, fontSize:'.86rem', color:'rgba(255,255,255,0.88)' }}>{h.description}</p>
                            <motion.div whileHover={{ x:4 }}
                              style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:12, fontSize:'.8rem', fontWeight:700, color:'rgba(255,255,255,0.9)' }}>
                              View Details <ChevronRight size={13} />
                            </motion.div>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Today's Notices */}
                  <section style={{
                    borderRadius:22, background:'rgba(255,255,255,0.88)', backdropFilter:'blur(12px)',
                    border:'1px solid rgba(148,163,184,0.2)', padding:'20px 22px',
                    boxShadow:'0 8px 30px rgba(37,99,235,0.07)',
                  }}>
                    <div style={{ marginBottom:16 }}>
                      <h3 style={{ margin:0, fontSize:'1.05rem', fontWeight:800, color:'#1e293b' }}>
                        Today's Notices <span style={{ fontWeight:500, color:'#94a3b8', fontSize:'.9rem' }}>({todayNotices.length})</span>
                      </h3>
                    </div>
                    <div style={{ maxHeight:500, overflowY:'auto' }}>
                      <AnimatePresence>
                        {todayNotices.length ? (
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:16 }}>
                            {todayNotices.map((n, i) => (
                              <NoticeCard key={n.id} notice={n} index={i} onOpen={setSelectedNotice} onMarkRead={handleMarkRead} />
                            ))}
                          </div>
                        ) : (
                          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                            style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
                            <FileText size={48} style={{ opacity:.2, marginBottom:12 }} />
                            <div style={{ fontWeight:600, fontSize:'.95rem' }}>No notices for today</div>
                            <div style={{ fontSize:'.85rem', marginTop:6 }}>Check back later or use Search to browse all notices</div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </section>
                </>
              )
            })()}

            {/* Search view */}
            {activeView === 'search' && (
              <>
                {/* Notice Feed */}
                <section style={{
                  borderRadius:22, background:'rgba(255,255,255,0.88)', backdropFilter:'blur(12px)',
                  border:'1px solid rgba(148,163,184,0.2)', padding:'16px 18px',
                  boxShadow:'0 8px 30px rgba(37,99,235,0.07)',
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <h3 style={{ margin:0, fontSize:'1rem', fontWeight:800, color:'#1e293b' }}>
                      Notice Feed <span style={{ fontWeight:500, color:'#94a3b8', fontSize:'.85rem' }}>({notices.length})</span>
                    </h3>
                    <div style={{ display:'flex', gap:6 }}>
                      {['ALL','Urgent','Academic'].map(c => (
                        <motion.button key={c} whileTap={{ scale:0.92 }}
                          onClick={() => setCategory(c)}
                          style={{
                            border: category === c ? 'none' : '1px solid #e2e8f0',
                            borderRadius:999, padding:'4px 12px', fontSize:'.75rem', fontWeight:700, cursor:'pointer',
                            background: category === c ? 'linear-gradient(135deg,#2563eb,#7c3aed)' : '#fff',
                            color: category === c ? '#fff' : '#475569',
                          }}>{c}</motion.button>
                      ))}
                    </div>
                  </div>
                  <div style={{ maxHeight:480, overflowY:'auto' }}>
                    <AnimatePresence>
                      {notices.length ? (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:14 }}>
                          {notices.map((n, i) => (
                            <NoticeCard key={n.id} notice={n} index={i} onOpen={setSelectedNotice} onMarkRead={handleMarkRead} />
                          ))}
                        </div>
                      ) : (
                        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                          style={{ textAlign:'center', padding:'40px 20px', color:'#94a3b8' }}>
                          <FileText size={40} style={{ opacity:.3, marginBottom:10 }} />
                          <div style={{ fontWeight:600 }}>No notices found</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </section>
              </>
            )}

            {/* Calendar view */}
            {activeView === 'calendar' && (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <AdvancedCalendar notices={notices} onSelectNotice={setSelectedNotice} reminders={reminders} onOpenReminderModal={(date) => { setSelectedReminderDate(date); setShowReminderModal(true); setSelectedCalendarDate(date) }} />
                
                {selectedCalendarDate && (
                  <motion.div
                    initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
                    style={{
                      borderRadius:24, background:'rgba(255,255,255,0.92)',
                      border:'1px solid #dbeafe', padding:24,
                      boxShadow:'0 20px 60px rgba(37,99,235,0.1)',
                      backdropFilter:'blur(12px)',
                    }}>
                    <h3 style={{ margin:'0 0 16px 0', fontSize:'1.1rem', fontWeight:800, color:'#1e293b' }}>
                      {new Date(selectedCalendarDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                    </h3>
                    
                    {/* Notices for selected date */}
                    {getSelectedDateNotices().length > 0 && (
                      <div style={{ marginBottom:20 }}>
                        <h4 style={{ margin:'0 0 12px 0', fontSize:'.9rem', fontWeight:700, color:'#475569' }}>📋 Notices ({getSelectedDateNotices().length})</h4>
                        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                          {getSelectedDateNotices().map(notice => {
                            const meta = getCategoryMeta(notice.category)
                            return (
                              <motion.div key={notice.id}
                                whileHover={{ scale:1.02 }}
                                onClick={() => setSelectedNotice(notice)}
                                style={{
                                  borderRadius:14, border:`1px solid ${meta.color}40`, padding:'12px 14px',
                                  background: meta.bg, cursor:'pointer',
                                }}>
                                <p style={{ margin:'0 0 6px 0', fontSize:'.9rem', fontWeight:700, color:'#1e293b' }}>{notice.title}</p>
                                <span style={{ fontSize:'.75rem', color:'#64748b' }}>📅 {new Date(notice.date_time).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</span>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Reminders for selected date */}
                    {getSelectedDateReminders().length > 0 && (
                      <div>
                        <h4 style={{ margin:'0 0 12px 0', fontSize:'.9rem', fontWeight:700, color:'#475569' }}>🔔 Reminders ({getSelectedDateReminders().length})</h4>
                        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                          {getSelectedDateReminders().map(reminder => {
                            const status = getReminderStatus(reminder)
                            const statusColor = status === 'sent' ? '#059669' : status === 'completed' ? '#9ca3af' : '#f59e0b'
                            const statusLabel = status === 'sent' ? '✓ Sent' : status === 'completed' ? '✓ Completed' : '⏳ Unsent'
                            return (
                              <motion.div key={reminder.id}
                                initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                                style={{
                                  borderRadius:14, background:'#fff', border:'1px solid #e2e8f0',
                                  padding:'12px 14px', display:'flex', alignItems:'center', gap:12,
                                }}>
                                <div style={{ flex:1 }}>
                                  <p style={{ margin:'0 0 6px 0', fontSize:'.9rem', fontWeight:700, color:'#1e293b' }}>{reminder.note}</p>
                                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                                    <span style={{ fontSize:'.75rem', color:'#64748b' }}>⏰ {reminder.time}</span>
                                    <span style={{ fontSize:'.75rem', fontWeight:700, color: statusColor }}>{statusLabel}</span>
                                  </div>
                                </div>
                                {status === 'unsent' && (
                                  <motion.button
                                    whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
                                    onClick={() => handleDeleteReminder(reminder.id)}
                                    style={{
                                      padding:'6px 12px', borderRadius:8, border:'1px solid #fee2e2', background:'#fef2f2',
                                      color:'#991b1b', fontSize:'.75rem', fontWeight:700, cursor:'pointer', flexShrink:0,
                                    }}>
                                    ✕ Cancel
                                  </motion.button>
                                )}
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    
                    {getSelectedDateNotices().length === 0 && getSelectedDateReminders().length === 0 && (
                      <p style={{ margin:0, color:'#94a3b8', fontSize:'.9rem' }}>No notices or reminders for this date</p>
                    )}
                  </motion.div>
                )}
              </div>
            )}

            {/* Reminders on Dashboard */}
            {activeView === 'dashboard' && getDueReminders().length > 0 && (
              <section style={{
                borderRadius:22, background:'rgba(255,165,0,0.08)', backdropFilter:'blur(12px)',
                border:'1px solid rgba(245,158,11,0.3)', padding:'16px 18px',
                boxShadow:'0 4px 12px rgba(245,158,11,0.1)',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <div style={{ fontSize:'1.4rem' }}>🔔</div>
                  <h3 style={{ margin:0, fontSize:'1rem', fontWeight:800, color:'#1e293b' }}>
                    Active Reminders <span style={{ fontWeight:500, color:'#94a3b8', fontSize:'.85rem' }}>({getDueReminders().length})</span>
                  </h3>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {getDueReminders().map((reminder, i) => (
                    <motion.div key={reminder.id}
                      initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }}
                      transition={{ delay: i*0.05 }}
                      style={{
                        borderRadius:14, background:'#fff', border:'1px solid rgba(245,158,11,0.2)',
                        padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:12,
                      }}>
                      <div style={{ fontSize:'1.2rem', marginTop:2 }}>📌</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:0, fontSize:'.95rem', fontWeight:700, color:'#1e293b', marginBottom:4 }}>{reminder.note || 'No title'}</p>
                        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                          <span style={{ fontSize:'.75rem', color:'#64748b', display:'flex', alignItems:'center', gap:4 }}>
                            📅 {new Date(reminder.date).toLocaleDateString('en-IN')} at {reminder.time}
                          </span>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
                        onClick={() => handleCompleteReminder(reminder.id)}
                        style={{
                          padding:'6px 12px', borderRadius:8, border:'none',
                          background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff',
                          fontSize:'.75rem', fontWeight:700, cursor:'pointer', flexShrink:0,
                        }}>
                        ✓ Done
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

          </main>
        </div>
      </div>

      {/* Reminder Modal */}
      <AnimatePresence>
        {showReminderModal && (
          <ReminderModal
            isOpen={showReminderModal}
            date={selectedReminderDate}
            onClose={() => setShowReminderModal(false)}
            onSave={handleSetReminder}
            reminderNote={reminderNote}
            setReminderNote={setReminderNote}
            reminderTime={reminderTime}
            setReminderTime={setReminderTime}
          />
        )}
      </AnimatePresence>

      {/* ── Notice Popup ── */}
      <AnimatePresence>
        {selectedNotice && (
          <NoticeModal
            notice={selectedNotice}
            onClose={() => setSelectedNotice(null)}
            onMarkRead={handleMarkRead}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default StaffDashboard