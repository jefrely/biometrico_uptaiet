import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function CambiarPassword() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    password_actual: '',
    password_nuevo:  '',
    confirmar:       ''
  })
  const [verActual,  setVerActual]  = useState(false)
  const [verNuevo,   setVerNuevo]   = useState(false)
  const [guardando,  setGuardando]  = useState(false)
  const [mensaje,    setMensaje]    = useState(null)

  const guardar = async () => {
    if (!form.password_actual || !form.password_nuevo || !form.confirmar) {
      setMensaje({ texto: 'Complete todos los campos.', tipo: 'error' })
      return
    }
    if (form.password_nuevo !== form.confirmar) {
      setMensaje({ texto: 'Las contraseñas nuevas no coinciden.', tipo: 'error' })
      return
    }
    if (form.password_nuevo.length < 8) {
      setMensaje({ texto: 'La contraseña debe tener al menos 8 caracteres.', tipo: 'error' })
      return
    }
    if (form.password_nuevo === form.password_actual) {
      setMensaje({ texto: 'La contraseña nueva debe ser diferente a la actual.', tipo: 'error' })
      return
    }

    setGuardando(true)
    try {
      await api.post('/auth/cambiar-password/', {
        password_actual: form.password_actual,
        password_nuevo:  form.password_nuevo,
      })
      setMensaje({ texto: 'Contraseña cambiada correctamente. Inicie sesión de nuevo.', tipo: 'ok' })
      setTimeout(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        navigate('/login')
      }, 2000)
    } catch (e) {
      setMensaje({
        texto: e.response?.data?.error || 'Error al cambiar la contraseña.',
        tipo: 'error'
      })
    } finally {
      setGuardando(false)
    }
  }

  const OjoIcono = ({ ver, toggle }) => (
    <button type="button" onClick={toggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
      {ver ? (
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
  )

  const fortaleza = (pwd) => {
    if (!pwd) return null
    if (pwd.length < 6) return { label: 'Muy débil', color: 'bg-red-500', ancho: '20%' }
    if (pwd.length < 8) return { label: 'Débil', color: 'bg-orange-500', ancho: '40%' }
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: 'Media', color: 'bg-yellow-500', ancho: '60%' }
    if (!/[^A-Za-z0-9]/.test(pwd)) return { label: 'Fuerte', color: 'bg-blue-500', ancho: '80%' }
    return { label: 'Muy fuerte', color: 'bg-emerald-500', ancho: '100%' }
  }

  const nivel = fortaleza(form.password_nuevo)

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-xl transition">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Cambiar Contraseña</h2>
          <p className="text-gray-400 text-sm">Actualiza tu contraseña de acceso</p>
        </div>
      </div>

      {mensaje && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow p-8 space-y-5">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
          <div className="relative">
            <input
              type={verActual ? 'text' : 'password'}
              value={form.password_actual}
              onChange={e => setForm({...form, password_actual: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ingrese su contraseña actual"
            />
            <OjoIcono ver={verActual} toggle={() => setVerActual(!verActual)}/>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
          <div className="relative">
            <input
              type={verNuevo ? 'text' : 'password'}
              value={form.password_nuevo}
              onChange={e => setForm({...form, password_nuevo: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mínimo 8 caracteres"
            />
            <OjoIcono ver={verNuevo} toggle={() => setVerNuevo(!verNuevo)}/>
          </div>
          {nivel && (
            <div className="mt-2">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${nivel.color}`}
                  style={{width: nivel.ancho}}/>
              </div>
              <p className={`text-xs mt-1 font-medium ${
                nivel.color.replace('bg-','text-')
              }`}>{nivel.label}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contraseña</label>
          <div className="relative">
            <input
              type="password"
              value={form.confirmar}
              onChange={e => setForm({...form, confirmar: e.target.value})}
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                form.confirmar && form.confirmar !== form.password_nuevo
                  ? 'border-red-300 focus:ring-red-500'
                  : form.confirmar && form.confirmar === form.password_nuevo
                  ? 'border-emerald-300 focus:ring-emerald-500'
                  : 'border-gray-300'
              }`}
              placeholder="Repita la nueva contraseña"
            />
            {form.confirmar && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                {form.confirmar === form.password_nuevo ? '✅' : '❌'}
              </span>
            )}
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700 space-y-1">
          <p className="font-semibold mb-2">Requisitos de seguridad:</p>
          <p className={form.password_nuevo.length >= 8 ? 'text-emerald-600' : ''}>
            {form.password_nuevo.length >= 8 ? '✅' : '○'} Mínimo 8 caracteres
          </p>
          <p className={/[A-Z]/.test(form.password_nuevo) ? 'text-emerald-600' : ''}>
            {/[A-Z]/.test(form.password_nuevo) ? '✅' : '○'} Al menos una mayúscula
          </p>
          <p className={/[0-9]/.test(form.password_nuevo) ? 'text-emerald-600' : ''}>
            {/[0-9]/.test(form.password_nuevo) ? '✅' : '○'} Al menos un número
          </p>
        </div>

        <button onClick={guardar} disabled={guardando}
          className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition disabled:opacity-50">
          {guardando ? 'Cambiando contraseña...' : 'Cambiar Contraseña'}
        </button>
      </div>
    </div>
  )
}