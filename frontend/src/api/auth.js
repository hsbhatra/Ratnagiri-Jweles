import apiClient from '../lib/apiClient'

const data = (p) => p.then((res) => res.data)

export const authApi = {
  register: (body) => data(apiClient.post('/v1/auth/register', body)),
  resendOtp: (body) => data(apiClient.post('/v1/auth/resend-otp', body)),
  verifyEmail: (body) => data(apiClient.post('/v1/auth/verify-email', body)),
  login: (body) => data(apiClient.post('/v1/auth/login', body)),
  logout: () => data(apiClient.post('/v1/auth/logout')),
  logoutAll: () => data(apiClient.post('/v1/auth/logout-all')),
  me: () => data(apiClient.get('/v1/auth/me')),
  sessions: () => data(apiClient.get('/v1/auth/sessions')),
  revokeSession: (id) => data(apiClient.delete(`/v1/auth/sessions/${id}`)),
  forgotPassword: (body) => data(apiClient.post('/v1/auth/forgot-password', body)),
  resetPassword: (body) => data(apiClient.post('/v1/auth/reset-password', body)),
}

export const userApi = {
  updateProfile: (body) => data(apiClient.patch('/v1/users/me', body)),
  addAddress: (body) => data(apiClient.post('/v1/users/me/addresses', body)),
  updateAddress: (id, body) => data(apiClient.put(`/v1/users/me/addresses/${id}`, body)),
  deleteAddress: (id) => data(apiClient.delete(`/v1/users/me/addresses/${id}`)),
}
