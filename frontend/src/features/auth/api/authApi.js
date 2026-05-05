import api from '../../../shared/services/api'
export const loginRequest = (payload) => api.post('/token/', payload)
export const registerRequest = (payload) => api.post('/accounts/register/', payload)