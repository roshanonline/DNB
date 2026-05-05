import axios from 'axios'

const staffApi = axios.create({
  baseURL: '/api/staff',
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const staffLogin = (payload) => staffApi.post('/login', payload)
export const staffLogout = () => staffApi.post('/logout')
export const getStaffSession = () => staffApi.get('/session')
export const getStaffNotices = (params) => staffApi.get('/notices', { params })
export const markStaffNoticeRead = (noticeId) => staffApi.post(`/notices/${noticeId}/read`)
export const getStaffLoginActivity = () => staffApi.get('/login-activity')

export default staffApi
