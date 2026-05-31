import { useState, useEffect } from 'react'
import api from '../services/api'

export default function Marcaje() {
  const [tipo,       setTipo]       = useState('entrada')
  const [estado,     setEstado]     = useState('esperando')
  const [resultado,  setResultado]  = useState(null)
  const [horaActual, setHoraActual] = useState('')
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
    setTimeout(() => { setEstado('esperando'); setResultado(null) }, 7000)
  }

  const bg = {
    esperando:  'bg-blue-950',
    procesando: 'bg-yellow-700',
    exito:      'bg-emerald-800',
    error:      'bg-red-800',
  }

  return (
    <div className={`min-h-screen ${bg[estado]} flex flex-col transition-colors duration-500`}>

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 bg-black/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl overflow-hidden flex items-center justify-center shadow">
            <img src="/logo.png" alt="UPTAIET" className="w-full h-full object-contain"
              onError={e => { e.target.onerror=null; e.target.parentNode.innerHTML='<span class="text-blue-900 font-black text-sm">UP</span>' }}
            />
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
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">

        {/* Tabs entrada/salida */}
        <div className="flex gap-3 bg-black/20 p-1 rounded-2xl">
          {['entrada','salida'].map(t => (
            <button key={t} onClick={() => setTipo(t)}
              className={`px-10 py-2.5 rounded-xl font-bold text-base capitalize transition-all ${
                tipo === t ? 'bg-white text-blue-900 shadow-lg' : 'text-white/70 hover:text-white'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Zona marcaje */}
        {(estado === 'esperando' || estado === 'procesando') && (
          <div className="flex flex-col items-center gap-6">
            <div onClick={marcar}
              className={`w-52 h-52 rounded-full border-4 border-white/40 flex flex-col items-center justify-center
                cursor-pointer transition-all duration-300 shadow-2xl
                ${estado === 'procesando' ? 'bg-yellow-600/30 scale-95' : 'bg-white/10 hover:bg-white/20 hover:scale-105'}`}>
              <svg className={`w-28 h-28 text-white ${estado === 'procesando' ? 'opacity-50' : ''}`} fill="currentColor" viewBox="0 0 64 64">
                <path d="M32 4C20 4 10 14 10 26c0 8 4 15 10 20v10h4v-8h16v8h4V46c6-5 10-12 10-20C54 14 44 4 32 4zm0 4c9.9 0 18 8.1 18 18S41.9 44 32 44 14 35.9 14 26 22.1 8 32 8zm0 4c-7.7 0-14 6.3-14 14s6.3 14 14 14 14-6.3 14-14S39.7 12 32 12zm0 4c5.5 0 10 4.5 10 10s-4.5 10-10 10-10-4.5-10-10 4.5-10 10-10z"/>
              </svg>
              <p className="text-white/80 text-sm font-medium mt-1">
                {estado === 'procesando' ? 'Verificando...' : 'Toque para marcar'}
              </p>
            </div>

            <p className={`text-white text-lg font-medium ${estado === 'esperando' ? 'animate-pulse' : ''}`}>
              {estado === 'esperando'
                ? 'Coloque su dedo en el escáner ZK9500'
                : '⏳ Verificando huella biométrica...'}
            </p>
          </div>
        )}

        {/* Ficha de éxito */}
        {resultado && estado === 'exito' && (
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <p className="text-emerald-600 font-bold text-sm mb-3">¡Bienvenido!</p>
            <h2 className="text-2xl font-black text-gray-800 mb-1">{resultado.empleado}</h2>
            <p className="text-gray-400 text-sm mb-5">{resultado.cedula}</p>
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Tipo</p>
                <p className="font-bold text-gray-700 capitalize text-sm">{resultado.tipo}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Hora</p>
                <p className="font-bold text-gray-700 text-sm">{resultado.hora}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                <p className="text-xs text-gray-400 mb-1">Departamento</p>
                <p className="font-bold text-gray-700 text-sm">{resultado.departamento}</p>
              </div>
              <div className={`rounded-xl p-3 col-span-2 text-center ${resultado.es_retardo ? 'bg-yellow-50' : 'bg-emerald-50'}`}>
                <p className={`font-bold text-sm ${resultado.es_retardo ? 'text-yellow-700' : 'text-emerald-700'}`}>
                  {resultado.es_retardo
                    ? `⚠️ Retraso de ${resultado.minutos_retardo} minutos`
                    : '✅ Entrada a tiempo'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {resultado && estado === 'error' && (
          <div className="bg-white/10 border-2 border-white/30 rounded-3xl p-10 text-center max-w-sm w-full">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </div>
            <p className="text-white text-xl font-bold mb-2">Huella no reconocida</p>
            <p className="text-red-200 text-sm">{resultado.msg}</p>
            <p className="text-white/50 text-xs mt-4">Coloque el dedo correctamente sobre el sensor</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-center py-3 text-white/30 text-xs">
        Sistema de Asistencia Biométrico — Sede Rubio — v1.0
      </p>
    </div>
  )
}