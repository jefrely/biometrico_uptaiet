import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = '/api/auth'

export default function RecuperarPassword() {
  const navigate = useNavigate()
  const [paso,    setPaso]    = useState(1)
  const [cargando,setCargando]= useState(false)
  const [error,   setError]   = useState('')
  const [datos,   setDatos]   = useState({
    username: '', respuesta_1: '', respuesta_2: '',
    token: '', password_nuevo: '', confirmar: ''
  })
  const [preguntas, setPreguntas] = useState({ pregunta_1: '', pregunta_2: '' })

  const post = async (url, body) => {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error')
    return data
  }

  const paso1 = async () => {
    if (!datos.username) { setError('Ingrese su usuario.'); return }
    setCargando(true); setError('')
    try {
      const res = await post(`${API}/recuperar/paso1/`, { username: datos.username })
      setPreguntas({ pregunta_1: res.pregunta_1, pregunta_2: res.pregunta_2 })
      setPaso(2)
    } catch (e) { setError(e.message) } finally { setCargando(false) }
  }

  const paso2 = async () => {
    if (!datos.respuesta_1 || !datos.respuesta_2) { setError('Responda ambas preguntas.'); return }
    setCargando(true); setError('')
    try {
      const res = await post(`${API}/recuperar/paso2/`, {
        username:    datos.username,
        respuesta_1: datos.respuesta_1,
        respuesta_2: datos.respuesta_2,
      })
      setDatos(d => ({ ...d, token: res.token }))
      setPaso(3)
    } catch (e) { setError(e.message) } finally { setCargando(false) }
  }

  const paso3 = async () => {
    if (!datos.password_nuevo || !datos.confirmar) { setError('Complete los campos.'); return }
    if (datos.password_nuevo !== datos.confirmar)  { setError('Las contraseñas no coinciden.'); return }
    if (datos.password_nuevo.length < 8)           { setError('Mínimo 8 caracteres.'); return }
    setCargando(true); setError('')
    try {
      await post(`${API}/recuperar/paso3/`, {
        token:          datos.token,
        password_nuevo: datos.password_nuevo,
        confirmar:      datos.confirmar,
      })
      setPaso(4)
    } catch (e) { setError(e.message) } finally { setCargando(false) }
  }

  const inputClass = "w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <div className="min-h-screen bg-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 overflow-hidden">
            <img src="/logo.png" alt="UPTAIET" className="w-full h-full object-contain"
              onError={e => { e.target.onerror=null; e.target.parentNode.innerHTML='<span class="text-blue-900 font-black">UP</span>' }}/>
          </div>
          <h1 className="text-white font-black text-xl">Recuperar Contraseña</h1>
          <p className="text-blue-300 text-sm">UPTAIET — Sede Rubio</p>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1,2,3].map(n => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                paso > n ? 'bg-emerald-500 text-white' :
                paso === n ? 'bg-white text-blue-900' :
                'bg-blue-800 text-blue-400'
              }`}>
                {paso > n ? '✓' : n}
              </div>
              {n < 3 && <div className={`w-12 h-0.5 ${paso > n ? 'bg-emerald-500' : 'bg-blue-800'}`}/>}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* Paso 1 — Nombre de usuario */}
          {paso === 1 && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-800 text-lg">Paso 1 — Identificación</h2>
              <p className="text-gray-400 text-sm">Ingrese su nombre de usuario para continuar.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <input type="text" value={datos.username}
                  onChange={e => setDatos({...datos, username: e.target.value})}
                  className={inputClass} placeholder="Ingrese su usuario"/>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button onClick={paso1} disabled={cargando}
                className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800 disabled:opacity-50">
                {cargando ? 'Verificando...' : 'Continuar →'}
              </button>
            </div>
          )}

          {/* Paso 2 — Preguntas de seguridad */}
          {paso === 2 && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-800 text-lg">Paso 2 — Preguntas de Seguridad</h2>
              <p className="text-gray-400 text-sm">Responda sus preguntas de seguridad.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{preguntas.pregunta_1}</label>
                <input type="text" value={datos.respuesta_1}
                  onChange={e => setDatos({...datos, respuesta_1: e.target.value})}
                  className={inputClass} placeholder="Su respuesta"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{preguntas.pregunta_2}</label>
                <input type="text" value={datos.respuesta_2}
                  onChange={e => setDatos({...datos, respuesta_2: e.target.value})}
                  className={inputClass} placeholder="Su respuesta"/>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => setPaso(1)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">
                  ← Atrás
                </button>
                <button onClick={paso2} disabled={cargando}
                  className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800 disabled:opacity-50">
                  {cargando ? 'Verificando...' : 'Continuar →'}
                </button>
              </div>
            </div>
          )}

          {/* Paso 3 — Nueva contraseña */}
          {paso === 3 && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-800 text-lg">Paso 3 — Nueva Contraseña</h2>
              <p className="text-gray-400 text-sm">Tiene 15 minutos para completar este paso.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                <input type="password" value={datos.password_nuevo}
                  onChange={e => setDatos({...datos, password_nuevo: e.target.value})}
                  className={inputClass} placeholder="Mínimo 8 caracteres"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                <input type="password" value={datos.confirmar}
                  onChange={e => setDatos({...datos, confirmar: e.target.value})}
                  className={inputClass} placeholder="Repita la contraseña"/>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button onClick={paso3} disabled={cargando}
                className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800 disabled:opacity-50">
                {cargando ? 'Cambiando...' : 'Cambiar Contraseña'}
              </button>
            </div>
          )}

          {/* Paso 4 — Éxito */}
          {paso === 4 && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h2 className="font-bold text-gray-800 text-lg">¡Contraseña cambiada!</h2>
              <p className="text-gray-400 text-sm">Ya puede iniciar sesión con su nueva contraseña.</p>
              <button onClick={() => navigate('/login')}
                className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800">
                Ir al Login
              </button>
            </div>
          )}

          {paso < 4 && (
            <button onClick={() => navigate('/login')}
              className="w-full text-gray-400 hover:text-gray-600 text-sm mt-4">
              ← Volver al login
            </button>
          )}
        </div>
      </div>
    </div>
  )
}