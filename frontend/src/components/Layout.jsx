import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const MENU = [
   {
    path: '/dashboard', label: 'Dashboard', roles: ['admin','supervisor','operador'],
    icono: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
  },
  {
    path: '/marcaje', label: 'Marcaje', roles: ['admin','supervisor','operador'],
    icono: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"/></svg>
  },
 
  {
    path: '/personal', label: 'Personal', roles: ['admin','supervisor'],
    icono: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
  },
  {
    path: '/historial', label: 'Asistencia', roles: ['admin','supervisor'],
    icono: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
  },
  {
    path: '/reportes', label: 'Reportes', roles: ['admin','supervisor'],
    icono: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
  },
  {
    path: '/horarios', label: 'Horarios', roles: ['admin'],
    icono: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
  },
  {
    path: '/incidencias', label: 'Incidencias', roles: ['admin','supervisor'],
    icono: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
  },
  {
    path: '/dispositivos', label: 'Dispositivos', roles: ['admin'],
    icono: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
  },
  {
    path: '/usuarios', label: 'Usuarios y Roles', roles: ['admin'],
    icono: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
  },
  {
    path: '/configuracion', label: 'Configuración', roles: ['admin'],
    icono: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
  },
]

export default function Layout({ children }) {
  const { usuario, logout } = useAuth()
  const navigate= useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const activo = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const [modulosPermitidos, setModulosPermitidos] = useState([])

  useEffect(() => {
    if (usuario?.rol !== 'admin') {
      api.get('/auth/perfil/').then(res => {
        // Los módulos vienen del token o del perfil
      })
    }
  }, [usuario])

  const puedeVerModulo = (item) => {
     
    if (usuario?.rol === 'admin') return true
    if (usuario?.rol === 'supervisor') {
      // Supervisores ven todo excepto usuarios y roles
      return item.key !== 'usuarios'
    }
    const modulo = item.path.replace('/', '')// Operadores: solo lo que el admin asignó explícitamente
    return (usuario?.modulos || []).includes(modulo)
  }
  

  const visibles = MENU.filter(m => puedeVerModulo(m))

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* ── Sidebar ── */}
      <aside className={`${collapsed ? 'w-16' : 'w-60'} bg-blue-950 flex flex-col fixed h-full z-30 transition-all duration-300 shadow-xl`}>

        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-4 border-b border-blue-900 ${collapsed ? 'justify-center px-2' : ''}`}>
          <div className="w-9 h-9 flex-shrink-0 bg-white rounded-lg overflow-hidden flex items-center justify-center">
            <img src="/logo.png" alt="UPTAIET" className="w-full h-full object-contain"
              onError={e => { e.target.onerror=null; e.target.src=''; e.target.parentNode.innerHTML='<span class="text-blue-900 font-black text-xs">UP</span>' }}
            />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-white font-bold text-sm leading-tight">UPTAIET</p>
              <p className="text-blue-400 leading-tight" style={{fontSize:'9px'}}>Sistema de Asistencia Biométrica</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {visibles.map(item => (
            <button key={item.path}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : ''}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150
                ${collapsed ? 'justify-center px-2' : ''}
                ${activo(item.path)
                  ? 'bg-blue-700 text-white font-semibold border-r-4 border-white'
                  : 'text-blue-300 hover:bg-blue-900 hover:text-white'
                }`}
            >
              <span className="flex-shrink-0">{item.icono}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
              
            </button>
          ))}
        </nav>

        {/* Footer sidebar */}
        <div className="border-t border-blue-900 p-3">
          {!collapsed && (
            <div className="mb-2 px-1">
              <p className="text-white text-xs font-semibold truncate">{usuario?.username}</p>
              <p className="text-blue-400 text-xs capitalize">{usuario?.rol}</p>
            </div>
          )}

          {!collapsed && (
            <button onClick={() => navigate('/cambiar-password')}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 rounded-lg text-xs transition mb-1">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
              </svg>
              Cambiar contraseña
            </button>
          )}

          {!collapsed && (
            <button onClick={() => navigate('/seguridad-personal')}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 rounded-lg text-xs transition mb-1">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              Seguridad personal
            </button>
          )}

          <button onClick={logout} title={collapsed ? 'Cerrar sesión' : ''}
            className={`w-full flex items-center gap-2 px-2 py-2 text-red-400 hover:bg-red-900/30 hover:text-red-300 rounded-lg text-xs transition ${collapsed ? 'justify-center' : ''}`}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            {!collapsed && 'Cerrar sesión'}

          </button>
        </div>
      </aside>

      {/* ── Contenido ── */}
      <div className={`flex-1 flex flex-col ${collapsed ? 'ml-16' : 'ml-60'} transition-all duration-300`}>

        {/* Topbar */}
        <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setCollapsed(!collapsed)}
            className="text-gray-500 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-800 capitalize">{usuario?.username}</p>
              <p className="text-xs text-gray-400 capitalize">{usuario?.rol}</p>
            </div>
            <div className="w-9 h-9 bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {usuario?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Página */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}