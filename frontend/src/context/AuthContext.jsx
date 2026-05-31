import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [usuario, setUsuario]  = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      api.get('/auth/perfil/')
        .then(res => setUsuario(res.data))
        .catch(() => {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        })
        .finally(() => setCargando(false))
    } else {
      setCargando(false)
    }
  }, [])

  const login = async (username, password) => {
    const res = await api.post('/auth/login/', { username, password })
    localStorage.setItem('access_token',  res.data.access)
    localStorage.setItem('refresh_token', res.data.refresh)
    // Cargar perfil completo con módulos
    const perfil = await api.get('/auth/perfil/')
    setUsuario(perfil.data)
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUsuario(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)