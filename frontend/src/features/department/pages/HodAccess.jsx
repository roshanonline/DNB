import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ShieldCheck, ArrowLeft, CheckCircle2, XCircle,
  RefreshCw, AlertTriangle, Tag, Clock, Building2,
  Sparkles, ChevronRight,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import Navbar from "../../../shared/components/Navbar"
import api from "../../../shared/services/api"

/* ─── Sky palette ─── */
const SKY = {
  50:  '#f0f9ff',
  100: '#e0f2fe',
  200: '#bae6fd',
  300: '#7dd3fc',
  400: '#38bdf8',
  500: '#0ea5e9',
  600: '#0284c7',
  700: '#0369a1',
  800: '#075985',
  900: '#0c4a6e',
}

/* ─── Category accent colours ─── */
const CATEGORY_COLOR = {
  Academic:  { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  Leave:     { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  Events:    { bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe' },
  Urgent:    { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  Circulars: { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
}
const getCatStyle = (cat) => CATEGORY_COLOR[cat] || CATEGORY_COLOR.Circulars

/* ─── Skeleton loader ─── */
const SkeletonCard = ({ delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay }}
    style={{
      borderRadius: 20,
      background: '#fff',
      border: `1.5px solid ${SKY[100]}`,
      padding: 24,
      boxShadow: '0 2px 8px rgba(14,165,233,0.06)',
    }}
  >
    {[80, 120, 60, 40].map((w, i) => (
      <div key={i} style={{
        height: i === 0 ? 20 : 14,
        width: `${w}%`,
        borderRadius: 8,
        marginBottom: 12,
        background: 'linear-gradient(90deg,#f0f9ff 25%,#e0f2fe 50%,#f0f9ff 75%)',
        backgroundSize: '600px 100%',
        animation: 'shimmer 1.4s infinite linear',
      }} />
    ))}
  </motion.div>
)

/* ─── Notice card ─── */
const NoticeCard = ({ notice: n, index, onAction }) => {
  const cat = getCatStyle(n.category)

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 26 }}
      style={{
        borderRadius: 20,
        background: '#fff',
        border: `1.5px solid ${SKY[100]}`,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(14,165,233,0.07)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'box-shadow 0.22s ease, transform 0.22s ease',
      }}
      whileHover={{
        y: -4,
        boxShadow: '0 16px 40px rgba(14,165,233,0.14)',
        transition: { duration: 0.2 },
      }}
    >
      {/* Top accent stripe */}
      <div style={{
        height: 4,
        background: `linear-gradient(90deg, ${SKY[400]}, ${SKY[600]})`,
      }} />

      {/* Card body */}
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              margin: '0 0 6px',
              fontSize: '1rem',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.35,
              letterSpacing: '-.01em',
            }}>
              {n.title}
            </h3>
            <p style={{
              margin: 0,
              fontSize: '.85rem',
              color: '#64748b',
              lineHeight: 1.55,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {n.description}
            </p>
          </div>

          {n.is_urgent && (
            <motion.span
              animate={{ scale: [1, 1.07, 1] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 999,
                background: '#fee2e2',
                color: '#dc2626',
                fontSize: '.7rem',
                fontWeight: 800,
                letterSpacing: '.05em',
                textTransform: 'uppercase',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={11} /> Urgent
            </motion.span>
          )}
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {/* Category chip */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 999,
            background: cat.bg, color: cat.color,
            border: `1px solid ${cat.border}`,
            fontSize: '.72rem', fontWeight: 700,
            letterSpacing: '.05em', textTransform: 'uppercase',
          }}>
            <Tag size={10} /> {n.category}
          </span>

          {/* Department chip */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 999,
            background: SKY[50], color: SKY[700],
            border: `1px solid ${SKY[200]}`,
            fontSize: '.72rem', fontWeight: 700,
            letterSpacing: '.05em', textTransform: 'uppercase',
          }}>
            <Building2 size={10} /> {n.department}
          </span>
        </div>

        {/* Full content preview */}
        {n.full_content && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 12,
            background: SKY[50],
            border: `1px solid ${SKY[100]}`,
            fontSize: '.8rem',
            color: '#475569',
            lineHeight: 1.55,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {n.full_content}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onAction(n.id, 'approve')}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '10px 16px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              fontSize: '.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16,185,129,0.24)',
              fontFamily: 'inherit',
            }}
          >
            <CheckCircle2 size={16} /> Approve
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onAction(n.id, 'reject')}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '10px 16px',
              borderRadius: 12,
              border: `1.5px solid #fecaca`,
              background: '#fff5f5',
              color: '#dc2626',
              fontSize: '.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <XCircle size={16} /> Reject
          </motion.button>
        </div>
      </div>
    </motion.article>
  )
}

/* ─── Empty state ─── */
const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      gridColumn: '1 / -1',
      borderRadius: 24,
      background: '#fff',
      border: `1.5px solid ${SKY[100]}`,
      padding: '56px 32px',
      textAlign: 'center',
      boxShadow: '0 4px 16px rgba(14,165,233,0.07)',
    }}
  >
    <div style={{
      width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
      background: `linear-gradient(135deg, ${SKY[100]}, ${SKY[200]})`,
      display: 'grid', placeItems: 'center',
    }}>
      <Sparkles size={32} color={SKY[500]} />
    </div>
    <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
      All clear!
    </h3>
    <p style={{ margin: 0, fontSize: '.9rem', color: '#94a3b8', lineHeight: 1.6 }}>
      No staff notices pending HOD approval right now.
    </p>
  </motion.div>
)

/* ══════════════════════════════════════════
   Main component
══════════════════════════════════════════ */
const HodAccess = () => {
  const [pending, setPending]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const navigate = useNavigate()

  const fetchPending = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const { data } = await api.get('/notices/staff-notices/pending-hod/')
      setPending(data || [])
    } catch {
      setPending([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchPending() }, [])

  const handleAction = async (id, action) => {
    try {
      await api.post(`/notices/staff-notices/${id}/approve-hod/`, { action })
      setPending(prev => prev.filter(n => n.id !== id))
    } catch {
      alert('Failed to update staff notice.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: SKY[50] }}>
      <Navbar />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>

        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 32,
          }}
        >
          {/* Left: icon + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: `linear-gradient(135deg, ${SKY[500]}, ${SKY[700]})`,
              boxShadow: `0 10px 28px rgba(14,165,233,0.3)`,
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <ShieldCheck size={26} color="#fff" />
            </div>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '1.6rem',
                fontWeight: 900,
                color: '#0f172a',
                letterSpacing: '-.02em',
                lineHeight: 1.2,
              }}>
                HOD Approval Center
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '.85rem', color: '#64748b' }}>
                Review and action staff notices before admin
              </p>
            </div>
          </div>

          {/* Right: actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/department')}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 18px',
                borderRadius: 12,
                border: `1.5px solid ${SKY[200]}`,
                background: '#fff',
                color: SKY[700],
                fontWeight: 700,
                fontSize: '.88rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(14,165,233,0.07)',
              }}
            >
              <ArrowLeft size={16} /> Dashboard
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => fetchPending(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 20px',
                borderRadius: 12,
                border: 'none',
                background: `linear-gradient(135deg, ${SKY[500]}, ${SKY[600]})`,
                color: '#fff',
                fontWeight: 700,
                fontSize: '.88rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: `0 6px 18px rgba(14,165,233,0.28)`,
              }}
            >
              <RefreshCw size={15} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
              Refresh
            </motion.button>
          </div>
        </motion.div>

        {/* ── Stats strip ── */}
        {!loading && pending.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 20px',
              borderRadius: 16,
              background: '#fff',
              border: `1.5px solid ${SKY[100]}`,
              marginBottom: 24,
              boxShadow: '0 2px 8px rgba(14,165,233,0.06)',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${SKY[100]}, ${SKY[200]})`,
              display: 'grid', placeItems: 'center',
            }}>
              <ShieldCheck size={18} color={SKY[600]} />
            </div>
            <div>
              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: SKY[700] }}>{pending.length}</span>
              <span style={{ fontSize: '.85rem', color: '#64748b', marginLeft: 8 }}>
                notice{pending.length !== 1 ? 's' : ''} awaiting your review
              </span>
            </div>
            <ChevronRight size={16} color={SKY[400]} style={{ marginLeft: 'auto' }} />
          </motion.div>
        )}

        {/* ── Cards grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 18,
        }}>
          {loading ? (
            [0, 1, 2, 3].map(i => <SkeletonCard key={i} delay={i * 0.08} />)
          ) : pending.length === 0 ? (
            <EmptyState />
          ) : (
            <AnimatePresence>
              {pending.map((n, i) => (
                <NoticeCard key={n.id} notice={n} index={i} onAction={handleAction} />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default HodAccess