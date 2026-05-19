import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { usuario, logout } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const links = [
    { path: '/dashboard', label: 'Dashboard',  roles: ['admin', 'supervisor', 'operador'] },
    { path: '/marcaje',   label: 'Marcaje',     roles: ['admin', 'supervisor', 'operador'] },
    { path: '/personal',  label: 'Personal',    roles: ['admin', 'supervisor'] },
    { path: '/horarios',  label: 'Horarios',    roles: ['admin'] },
    { path: '/reportes',  label: 'Reportes',    roles: ['admin', 'supervisor'] },
  ]

  const visibles = links.filter(l => l.roles.includes(usuario?.rol))
  const activo   = (path) => location.pathname.startsWith(path)

  return (
    <nav className="bg-blue-900 text-white px-6 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-8">
        <div>
          <h1 className="text-lg font-bold leading-tight">UPTAIET</h1>
          <p className="text-blue-300 text-xs">Control de Asistencia</p>
        </div>
        <div className="flex items-center gap-1">
          {visibles.map(link => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activo(link.path)
                  ? 'bg-white text-blue-900'
                  : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium">{usuario?.username}</p>
          <p className="text-blue-300 text-xs capitalize">{usuario?.rol}</p>
        </div>
        <button
          onClick={logout}
          className="bg-blue-800 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs transition"
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  )
}