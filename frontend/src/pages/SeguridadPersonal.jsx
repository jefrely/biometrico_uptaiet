import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const PREGUNTAS = [
  { value: 'mascota',   label: '¿Cuál es el nombre de tu primera mascota?'        },
  { value: 'ciudad',    label: '¿En qué ciudad naciste?'                           },
  { value: 'madre',     label: '¿Cuál es el apellido de soltera de tu madre?'      },
  { value: 'colegio',   label: '¿Cómo se llamaba tu colegio primario?'             },
  { value: 'libro',     label: '¿Cuál es tu libro favorito?'                       },
  { value: 'pelicula',  label: '¿Cuál es tu película favorita?'                    },
  { value: 'deporte',   label: '¿Cuál es tu deporte favorito?'                     },
]

export default function SeguridadPersonal() {
  const navigate = useNavigate()

  const [tab,         setTab]         = useState('preguntas')
  const [mensaje,     setMensaje]     = useState(null)
  const [cargando,    setCargando]    = useState(false)
  const [tienePin,    setTienePin]    = useState(false)
  const [tienePreg,   setTienePreg]   = useState(false)

  const [formPreg, setFormPreg] = useState({
    pregunta_1: 'mascota', respuesta_1: '',
    pregunta_2: 'ciudad',  respuesta_2: '',
  })

  const [formPin, setFormPin] = useState({
    pin: '', confirmar: ''
  })

  useEffect(() => { cargarEstado() }, [])

  const cargarEstado = async () => {
    try {
      const [pregRes, pinRes] = await Promise.all([
        api.get('/auth/preguntas-seguridad/'),
        api.get('/auth/pin/'),
      ])
      setTienePreg(pregRes.data.configuradas)
      setTienePin(pinRes.data.tiene_pin)
    } catch {
      mostrarMensaje('Error al cargar estado de seguridad.', 'error')
    }
  }

  const mostrarMensaje = (texto, tipo = 'ok') => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje(null), 5000)
  }

  const guardarPreguntas = async () => {
    if (!formPreg.respuesta_1 || !formPreg.respuesta_2) {
      mostrarMensaje('Complete ambas respuestas.', 'error'); return
    }
    if (formPreg.pregunta_1 === formPreg.pregunta_2) {
      mostrarMensaje('Las dos preguntas deben ser diferentes.', 'error'); return
    }
    setCargando(true)
    try {
      await api.post('/auth/preguntas-seguridad/', formPreg)
      mostrarMensaje('Preguntas de seguridad guardadas correctamente.')
      setTienePreg(true)
      setFormPreg({ ...formPreg, respuesta_1: '', respuesta_2: '' })
    } catch (e) {
      mostrarMensaje(e.response?.data?.error || 'Error al guardar.', 'error')
    } finally {
      setCargando(false)
    }
  }

  const guardarPin = async () => {
    if (!formPin.pin || formPin.pin.length !== 6 || !/^\d+$/.test(formPin.pin)) {
      mostrarMensaje('El PIN debe ser exactamente 6 dígitos numéricos.', 'error'); return
    }
    if (formPin.pin !== formPin.confirmar) {
      mostrarMensaje('Los PINs no coinciden.', 'error'); return
    }
    setCargando(true)
    try {
      await api.post('/auth/pin/', formPin)
      mostrarMensaje('PIN de seguridad configurado correctamente.')
      setTienePin(true)
      setFormPin({ pin: '', confirmar: '' })
    } catch (e) {
      mostrarMensaje(e.response?.data?.error || 'Error al guardar.', 'error')
    } finally {
      setCargando(false)
    }
  }

  const desactivarPin = async () => {
    if (!confirm('¿Desactivar el PIN de seguridad? El sistema solo pedirá contraseña.')) return
    try {
      await api.delete('/auth/pin/')
      mostrarMensaje('PIN desactivado.')
      setTienePin(false)
    } catch {
      mostrarMensaje('Error al desactivar el PIN.', 'error')
    }
  }

  const inputClass = "w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <div className="max-w-2xl space-y-6">

      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-xl transition">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Seguridad Personal</h2>
          <p className="text-gray-400 text-sm">Configura la recuperación de contraseña y el segundo factor</p>
        </div>
      </div>

      {mensaje && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* Resumen de estado */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-2xl p-4 border-2 ${tienePreg ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{tienePreg ? '✅' : '⚠️'}</span>
            <div>
              <p className="font-bold text-sm text-gray-700">Preguntas de seguridad</p>
              <p className={`text-xs ${tienePreg ? 'text-emerald-600' : 'text-amber-600'}`}>
                {tienePreg ? 'Configuradas' : 'No configuradas'}
              </p>
            </div>
          </div>
        </div>
        <div className={`rounded-2xl p-4 border-2 ${tienePin ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{tienePin ? '🔐' : '🔓'}</span>
            <div>
              <p className="font-bold text-sm text-gray-700">PIN de seguridad (2FA)</p>
              <p className={`text-xs ${tienePin ? 'text-emerald-600' : 'text-gray-400'}`}>
                {tienePin ? 'Activo' : 'No configurado'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'preguntas', label: '❓ Preguntas de Seguridad' },
          { key: 'pin',       label: '🔐 PIN de Dos Factores'    },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2 text-sm font-medium border-b-2 transition ${
              tab === t.key
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Preguntas */}
      {tab === 'preguntas' && (
        <div className="bg-white rounded-2xl shadow p-6 space-y-5">
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-semibold mb-1">¿Para qué sirve esto?</p>
            <p>Si olvidas tu contraseña, el sistema te hará estas preguntas para verificar tu identidad antes de dejarte crear una nueva contraseña. Las respuestas se guardan de forma segura y no son visibles por nadie.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pregunta 1</label>
            <select value={formPreg.pregunta_1}
              onChange={e => setFormPreg({...formPreg, pregunta_1: e.target.value})}
              className={inputClass}>
              {PREGUNTAS.filter(p => p.value !== formPreg.pregunta_2).map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <input type="text" value={formPreg.respuesta_1}
              onChange={e => setFormPreg({...formPreg, respuesta_1: e.target.value})}
              className={`${inputClass} mt-2`}
              placeholder="Tu respuesta (no distingue mayúsculas)"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pregunta 2</label>
            <select value={formPreg.pregunta_2}
              onChange={e => setFormPreg({...formPreg, pregunta_2: e.target.value})}
              className={inputClass}>
              {PREGUNTAS.filter(p => p.value !== formPreg.pregunta_1).map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <input type="text" value={formPreg.respuesta_2}
              onChange={e => setFormPreg({...formPreg, respuesta_2: e.target.value})}
              className={`${inputClass} mt-2`}
              placeholder="Tu respuesta (no distingue mayúsculas)"/>
          </div>

          <button onClick={guardarPreguntas} disabled={cargando}
            className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800 disabled:opacity-50">
            {cargando ? 'Guardando...' : tienePreg ? 'Actualizar preguntas' : 'Guardar preguntas'}
          </button>
        </div>
      )}

      {/* Tab PIN */}
      {tab === 'pin' && (
        <div className="bg-white rounded-2xl shadow p-6 space-y-5">
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-semibold mb-1">¿Qué es el PIN de dos factores?</p>
            <p>Agrega una segunda capa de seguridad. Cuando actives esta opción, al iniciar sesión el sistema primero pedirá tu contraseña y luego tu PIN de 6 dígitos. Aunque alguien robe tu contraseña, no podrá entrar sin el PIN.</p>
          </div>

          {tienePin && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-emerald-700 text-sm">🔐 PIN activo</p>
                <p className="text-emerald-600 text-xs">El sistema pedirá tu PIN al iniciar sesión</p>
              </div>
              <button onClick={desactivarPin}
                className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-200">
                Desactivar
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tienePin ? 'Nuevo PIN (6 dígitos)' : 'PIN de 6 dígitos'}
            </label>
            <input
              type="password"
              value={formPin.pin}
              maxLength={6}
              onChange={e => setFormPin({...formPin, pin: e.target.value.replace(/\D/g, '')})}
              className={`${inputClass} text-center text-2xl tracking-widest`}
              placeholder="● ● ● ● ● ●"
            />
            <p className="text-xs text-gray-400 mt-1">
              Solo números, exactamente 6 dígitos. Ejemplo: 123456
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar PIN</label>
            <input
              type="password"
              value={formPin.confirmar}
              maxLength={6}
              onChange={e => setFormPin({...formPin, confirmar: e.target.value.replace(/\D/g, '')})}
              className={`${inputClass} text-center text-2xl tracking-widest ${
                formPin.confirmar && formPin.confirmar !== formPin.pin
                  ? 'border-red-300' : formPin.confirmar && formPin.confirmar === formPin.pin
                  ? 'border-emerald-300' : ''
              }`}
              placeholder="● ● ● ● ● ●"
            />
            {formPin.confirmar && formPin.pin && (
              <p className={`text-xs mt-1 ${formPin.confirmar === formPin.pin ? 'text-emerald-600' : 'text-red-500'}`}>
                {formPin.confirmar === formPin.pin ? '✅ Los PINs coinciden' : '❌ Los PINs no coinciden'}
              </p>
            )}
          </div>

          <button onClick={guardarPin} disabled={cargando}
            className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800 disabled:opacity-50">
            {cargando ? 'Guardando...' : tienePin ? 'Actualizar PIN' : 'Activar PIN de seguridad'}
          </button>
        </div>
      )}
    </div>
  )
}