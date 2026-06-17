import { useState, useEffect } from 'react'
import api from '../services/api'

const TIPOS = [
  {key: 'entrada', label: 'Entrada', color: 'bg-emerald-600'},
  {key: 'salida', label: 'Salida', color: 'bg-blue-600'},
  {key: 'salida_almuerzo', label: 'Salida Almuerzo', color: 'bg-orange-500'},
  {key: 'entrada_almuerzo', label: 'Entrada Almuerzo', color: 'bg-teal-600'},
]

export default function Marcaje() {
  const [tipo,setTipo] = useState('entrada')
  const [estado,setEstado] = useState('esperando')
  const [resultado,setResultado] = useState(null)
  const [horaActual,setHoraActual] = useState('')
  const [fechaActual,setFechaActual]= useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setHoraActual(now.toLocaleTimeString('es-VE', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true }))
      setFechaActual(now.toLocaleDateString('es-VE', { weekday:'long', day:'numeric', month:'long', year:'numeric' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const marcar = async () => {
    setEstado('procesando')
    setResultado(null)
    try {
      const res = await api.post('/asistencia/marcar/', { tipo })
      setResultado(res.data)
      setEstado(res.data.ok ? 'exito' : 'error')
    } catch {
      setEstado('error')
      setResultado({ msg: 'Error de conexión con el servidor.' })
    }
    setTimeout(() => { setEstado('esperando'); setResultado(null) }, 8000)
  }

  const bg = {
    esperando:'bg-blue-950',
    procesando:'bg-yellow-700',
    exito:'bg-emerald-800',
    error:      'bg-red-800',
  }

  const tipoActual = TIPOS.find(t => t.key === tipo)

  return (
    <div className={`min-h-screen ${bg[estado]} flex flex-col transition-colors duration-500`}>

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 bg-black/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl overflow-hidden flex items-center justify-center shadow">
            <img src="/logo.png" alt="UPTAIET" className="w-full h-full object-contain"
              onError={e => { e.target.onerror=null; e.target.parentNode.innerHTML='<span class="text-blue-900 font-black text-sm">UP</span>' }}/>
          </div>
          <div>
            <p className="text-white font-black text-lg">UPTAIET</p>
            <p className="text-blue-300 text-xs">Universidad Politécnica Territorial Agroindustrial del Estado Táchira</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-mono text-4xl font-bold tracking-wider">{horaActual}</p>
          <p className="text-blue-300 text-sm capitalize">{fechaActual}</p>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">

        {/* Selector tipo */}
        <div className="grid grid-cols-2 gap-2 bg-black/20 p-2 rounded-2xl w-full max-w-md">
          {TIPOS.map(t => (
            <button key={t.key} onClick={() => setTipo(t.key)}
              className={`py-2.5 rounded-xl font-semibold text-sm transition-all ${
                tipo === t.key
                  ? `${t.color} text-white shadow-lg scale-105`
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Zona de marcaje */}
        {(estado === 'esperando' || estado === 'procesando') && (
          <div className="flex flex-col items-center gap-4">
            <div onClick={marcar}
              className={`w-48 h-48 rounded-full border-4 border-white/40 flex flex-col items-center justify-center
                cursor-pointer transition-all duration-300 shadow-2xl
                ${estado === 'procesando' ? 'bg-yellow-600/30 scale-95 cursor-wait' : 'bg-white/10 hover:bg-white/20 hover:scale-105'}`}>
              <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 64 64">
                <path d="M32 4C20 4 10 14 10 26c0 8 4 15 10 20v10h4v-8h16v8h4V46c6-5 10-12 10-20C54 14 44 4 32 4zm0 4c9.9 0 18 8.1 18 18S41.9 44 32 44 14 35.9 14 26 22.1 8 32 8zm0 4c-7.7 0-14 6.3-14 14s6.3 14 14 14 14-6.3 14-14S39.7 12 32 12zm0 4c5.5 0 10 4.5 10 10s-4.5 10-10 10-10-4.5-10-10 4.5-10 10-10z"/>
              </svg>
              <p className="text-white/80 text-xs font-medium mt-1">
                {estado === 'procesando' ? 'Verificando...' : 'Toque para marcar'}
              </p>
            </div>
            <p className={`text-white text-base font-medium ${estado === 'esperando' ? 'animate-pulse' : ''}`}>
              {estado === 'esperando'
                ? `Registrar: ${tipoActual?.label} — Coloque su dedo en el escáner`
                : '⏳ Verificando huella biométrica...'}
            </p>
          </div>
        )}

        {/* Ficha de éxito */}
        {resultado && estado === 'exito' && (
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-4 mb-4">
              {resultado.foto ? (
                <img src={resultado.foto} alt={resultado.empleado}
                  className="w-16 h-16 rounded-full object-cover border-2 border-emerald-200"/>
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-900 flex items-center justify-center text-white font-black text-2xl">
                  {resultado.empleado?.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-black text-gray-800 text-lg leading-tight">{resultado.empleado}</p>
                <p className="text-gray-400 text-xs">{resultado.cedula}</p>
                <p className="text-gray-500 text-xs">{resultado.cargo} — {resultado.departamento}</p>
              </div>
            </div>

            <div className={`text-center py-2 px-4 rounded-xl mb-4 font-bold text-sm ${
              resultado.es_almuerzo ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {resultado.tipo_display}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">Hora</p>
                <p className="font-bold text-gray-700">{resultado.hora}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">Fecha</p>
                <p className="font-bold text-gray-700 text-xs">{resultado.fecha}</p>
              </div>
            </div>

            {/* Estado del marcaje */}
            {resultado.mensaje_estado && (
              <div className={`rounded-xl p-3 text-center text-sm font-medium ${
                resultado.es_retardo        ? 'bg-red-50 text-red-700' :
                resultado.minutos_antes > 0 ? 'bg-blue-50 text-blue-700' :
                resultado.horas_extras > 0  ? 'bg-purple-50 text-purple-700' :
                resultado.horas_faltantes > 0 ? 'bg-amber-50 text-amber-700' :
                'bg-emerald-50 text-emerald-700'
              }`}>
                {resultado.mensaje_estado}
              </div>
            )}

            {/* Horas trabajadas al marcar salida */}
            {resultado.horas_trabajadas && (
              <div className="mt-2 bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xs text-blue-400">Horas trabajadas hoy</p>
                <p className="font-black text-blue-700 text-xl">{resultado.horas_trabajadas.toFixed(1)}h</p>
              </div>
            )}

            {/* Aviso sin horario */}
            {resultado.sin_horario && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <p className="text-amber-700 text-xs font-medium">
                  ⚠️ {resultado.aviso}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {resultado && estado === 'error' && (
          <div className="bg-white/10 border-2 border-white/30 rounded-3xl p-8 text-center max-w-sm w-full">
            <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </div>
            <p className="text-white text-lg font-bold mb-1">
              {resultado.msg?.includes('entrada') || resultado.msg?.includes('salida') ? '⚠️ Aviso' : 'Huella no reconocida'}
            </p>
            <p className="text-red-200 text-sm">{resultado.msg}</p>
          </div>
        )}
      </div>

      <p className="text-center py-3 text-white/30 text-xs">
        Sistema de Asistencia Biométrico — Sede Rubio — v1.0
      </p>
    </div>
  )
}