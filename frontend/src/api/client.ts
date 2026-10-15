import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('arm_user')
  if (stored) {
    try {
      const user = JSON.parse(stored)
      if (user.token) {
        config.headers.Authorization = `Bearer ${user.token}`
      }
    } catch {}
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const isLoginAttempt = error.config?.url?.includes('/auth/login')
      if (!isLoginAttempt && localStorage.getItem('arm_user')) {
        localStorage.removeItem('arm_user')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
