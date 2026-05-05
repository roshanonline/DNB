import React from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Eye, Clock, Bookmark } from 'lucide-react'
import { motion } from 'framer-motion'

const BigThumbnail = ({ notice, index }) => {
  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'HIGH':
        return {
          border: 'border-red-500',
          glow: 'glow-high',
          bg: 'bg-red-50 dark:bg-red-900/20',
          badge: 'bg-red-500',
          text: 'text-red-600 dark:text-red-400'
        }
      case 'MEDIUM':
        return {
          border: 'border-orange-500',
          glow: 'glow-medium',
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          badge: 'bg-orange-500',
          text: 'text-orange-600 dark:text-orange-400'
        }
      default:
        return {
          border: 'border-blue-500',
          glow: 'glow-low',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          badge: 'bg-blue-500',
          text: 'text-blue-600 dark:text-blue-400'
        }
    }
  }

  const style = getPriorityStyle(notice.priority || notice.priority_level)

  // Compute days_remaining if not provided
  const daysRemaining = notice.days_remaining !== undefined
    ? notice.days_remaining
    : notice.deadline
      ? Math.ceil((new Date(notice.deadline) - new Date()) / (1000 * 60 * 60 * 24))
      : null

  const mlScore = notice.ml_score !== undefined ? notice.ml_score : (notice.view_count ? Math.min(notice.view_count / 500, 1) : 0.5)

  const getDeadlineColor = (days) => {
    if (days === null) return 'text-gray-500'
    if (days === 0) return 'text-red-600 dark:text-red-400'
    if (days <= 2) return 'text-orange-600 dark:text-orange-400'
    return 'text-green-600 dark:text-green-400'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="relative group"
    >
      <Link to={`/notice/${notice.id}`}>
        <div 
          className={`
            relative overflow-hidden rounded-xl border-2 ${style.border}
            bg-white dark:bg-gray-800 shadow-lg hover:shadow-2xl
            transition-all duration-300 transform hover:scale-105
            ${style.glow} card-hover h-80
          `}
        >
          {/* Thumbnail Image */}
          <div 
            className="relative h-48 overflow-hidden"
            style={{ background: notice.gradient || 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
          >
            {notice.thumbnail && !notice.thumbnail.startsWith('thumbnail_') ? (
              <img 
                src={notice.thumbnail} 
                alt={notice.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-white text-7xl opacity-30 select-none">
                  {notice.emoji || '📢'}
                </div>
              </div>
            )}
            
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            
            {/* Priority Badge */}
            <div className={`absolute top-3 left-3 ${style.badge} text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center space-x-1`}>
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              <span>{notice.priority}</span>
            </div>

            {/* Bookmark Icon */}
            <button className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full hover:scale-110 transition-transform">
              <Bookmark className="w-4 h-4 text-gray-700 dark:text-gray-200" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {notice.title}
            </h3>

            {/* Category & Department */}
            <div className="flex items-center justify-between text-sm">
              <span className={`px-2 py-1 ${style.bg} ${style.text} rounded-full font-medium`}>
                {notice.category}
              </span>
              {notice.department_name || notice.department && (
                <span className="flex items-center text-gray-600 dark:text-gray-400">
                  <MapPin className="w-3 h-3 mr-1" />
                  {notice.department_name || notice.department}
                </span>
              )}
            </div>

            {/* Deadline & Info */}
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              {notice.deadline && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span className={getDeadlineColor(daysRemaining)}>
                    {daysRemaining === 0 && 'Today'}
                    {daysRemaining === 1 && 'Tomorrow'}
                    {daysRemaining > 1 && `${daysRemaining} days`}
                    {daysRemaining < 0 && 'Expired'}
                    {daysRemaining === null && 'No deadline'}
                  </span>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span>{notice.view_count || 0}</span>
                </div>
              </div>
            </div>

            {/* ML Score Indicator */}
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`${style.badge} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${Math.round(mlScore * 100)}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round(mlScore * 100)}%
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default BigThumbnail
