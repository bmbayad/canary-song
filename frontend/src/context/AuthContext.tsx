import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios, { AxiosInstance } from 'axios'

interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  display_name?: string
  role: string
  status: string
  password_reset_required?: boolean
  preferred_language: string
  timezone?: string
  country_region?: string
  phone?: string
  created_at: string
  updated_at: string
  last_login_at?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>
  googleAuth: (idToken: string) => Promise<void>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<void>
  refreshUser: () => Promise<void>
  apiClient: AxiosInstance
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_URL = 'http://localhost:8000'

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [failedQueue, setFailedQueue] = useState<Array<(token: string) => void>>([])

  const apiClient = axios.create({
    baseURL: API_URL,
  })

  const processQueue = (token: string) => {
    failedQueue.forEach(prom => prom(token))
    setFailedQueue([])
  }

  apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve) => {
            failedQueue.push((token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(apiClient(originalRequest))
            })
          })
        }

        originalRequest._retry = true
        setIsRefreshing(true)

        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            },
          })

          if (response.data.access_token) {
            localStorage.setItem('access_token', response.data.access_token)
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`
            originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`
            processQueue(response.data.access_token)
            setIsRefreshing(false)
            return apiClient(originalRequest)
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError)
          localStorage.removeItem('access_token')
          setUser(null)
          setIsRefreshing(false)
          window.location.href = '/login'
        }
      }

      return Promise.reject(error)
    }
  )

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (token) {
          const res = await apiClient.get('/auth/me')
          setUser(res.data)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('access_token')
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password })
    localStorage.setItem('access_token', response.data.access_token)
    setUser(response.data.user)
  }

  const register = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const response = await apiClient.post('/auth/register', {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    })
    localStorage.setItem('access_token', response.data.access_token)
    setUser(response.data.user)
  }

  const googleAuth = async (idToken: string) => {
    const response = await apiClient.post('/auth/google', { id_token: idToken })
    localStorage.setItem('access_token', response.data.access_token)
    setUser(response.data.user)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    setUser(null)
  }

  const updateProfile = async (data: Partial<User>) => {
    const response = await apiClient.put('/profile/me', data)
    setUser(response.data)
  }

  const refreshUser = async () => {
    try {
      const res = await apiClient.get('/auth/me')
      setUser(res.data)
    } catch (error) {
      console.error('User refresh failed:', error)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      googleAuth,
      logout,
      updateProfile,
      refreshUser,
      apiClient,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

