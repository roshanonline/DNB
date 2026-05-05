import api from '../../../shared/services/api'
export const getNoticeById = (id) => api.get(`/notices/${id}/`)
export const listNotices = () => api.get('/notices/')