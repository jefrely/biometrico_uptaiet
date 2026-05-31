import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [verPassword, setVerPassword] = useState(false)
  const [error,setError] = useState('')
  const [cargando,setCargando]  = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')
    try {
      await login(form.username, form.password)
      navigate('/dashboard')
    } catch {
      setError('Usuario o contraseña incorrectos.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo y nombre */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl overflow-hidden">
            <img src="/logo.png" alt="UPTAIET" className="w-full h-full object-contain"
              onError={e => { e.target.onerror=null; e.target.parentNode.innerHTML='<span class="text-blue-900 font-black text-2xl">UP</span>' }}
            />
          </div>
          <h1 className="text-white font-black text-2xl tracking-wide">UPTAIET</h1>
          <p className="text-blue-300 text-sm mt-1">Universidad Politécnica Territorial</p>
          <p className="text-blue-300 text-sm">Agroindustrial del Estado Táchira</p>
          <p className="text-blue-400 text-xs mt-2">Sistema de Control de Asistencia Biométrico</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-gray-800 font-bold text-xl mb-6 text-center">Iniciar Sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuario
              </label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Ingrese su usuario"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={verPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Ingrese su contraseña"
                  required
                />
                <button type="button" onClick={() => setVerPassword(!verPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                  {verPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <button type="submit" disabled={cargando}
              className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition disabled:opacity-50 text-sm">
              {cargando ? 'Verificando...' : 'Ingresar al Sistema'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Sede Rubio — Sistema Biométrico v1.0
          </p>
        </div>
      </div>
    </div>
  )
}