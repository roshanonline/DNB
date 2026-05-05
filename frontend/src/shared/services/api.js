/**
 * API Service - Axios Configuration
 */
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Let browser set Content-Type for FormData (multipart uploads)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If token expired, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) throw new Error('No refresh token')
        const response = await axios.post('http://localhost:8000/api/accounts/token/refresh/', {
          refresh: refreshToken,
        })

        const { access } = response.data
        localStorage.setItem('access_token', access)

        originalRequest.headers.Authorization = `Bearer ${access}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, clear everything and redirect
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

/**
 * Upload a file attachment to a notice.
 * @param {number} noticeId
 * @param {File} file
 */
export const uploadAttachment = (noticeId, file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post(`/notices/${noticeId}/attachments/`, form)
}

/**
 * Fetch attachments for a notice.
 * @param {number} noticeId
 */
export const getAttachments = (noticeId) => api.get(`/notices/${noticeId}/attachments/`)

/**
 * Force-download any URL as a file (works cross-origin via blob).
 * @param {string} url   – full URL to the file
 * @param {string} name  – desired filename
 */
export const downloadFile = async (url, name) => {
  try {
    const response = await api.get(url, { responseType: 'blob' })
    const blob = response.data
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = name || 'download'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(blobUrl) }, 200)
  } catch (err) {
    console.error('Download failed:', err)
    throw err
  }
}

export default api
