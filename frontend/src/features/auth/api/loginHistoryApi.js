import api from '../../../shared/services/api'

export const getMyLoginHistory = (params) => api.get('/accounts/login-history/', { params })
export const getAdminLoginActivity = (params) => api.get('/accounts/admin/login-activity/', { params })
export const getAdminLoginHistoryByRole = (role, params) => api.get(`/accounts/admin/login-history/${role}/`, { params })
export const getAdminLoginAnalytics = (params) => api.get('/accounts/admin/login-analytics/', { params })
