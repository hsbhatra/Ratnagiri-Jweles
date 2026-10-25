import axios from 'axios'

// Backend standard response envelope: { success, data, error, meta }
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true, // httpOnly session cookies per NFR-S3
})

// Endpoints where a 401 is a real answer, not an expired access token
const NO_REFRESH = ['/v1/auth/login', '/v1/auth/register', '/v1/auth/verify-email', '/v1/auth/refresh']

let refreshing = null // single-flight: parallel 401s share one refresh call

// Called when a signed-in session turns out to be over (signed out elsewhere, password
// changed on another device, revoked...). The store registers it; see store/index.js.
let onSessionEnded = () => {}
export function setSessionEndedHandler(fn) {
  onSessionEnded = fn
}

apiClient.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    const original = err.config
    const status = err.response?.status
    const shouldRefresh =
      status === 401 && original && !original._retried && !NO_REFRESH.some((p) => original.url?.startsWith(p))

    if (shouldRefresh) {
      original._retried = true
      try {
        refreshing ??= apiClient.post('/v1/auth/refresh').finally(() => {
          refreshing = null
        })
        await refreshing
        return apiClient(original)
      } catch {
        onSessionEnded()
        // and fall through to the original 401
      }
    }

    const payload = err.response?.data ?? {
      success: false,
      error: { message: "Can't reach the server. Check your connection and try again.", code: 'NETWORK' },
    }
    return Promise.reject(payload)
  }
)

export default apiClient
