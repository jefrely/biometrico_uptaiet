import { useState, useEffect } from 'react'
import api from '../services/api'

export default function Marcaje() {
  const [tipo,      setTipo]      = useState('entrada')
  const [estado,    setEstado]    = useState('esperando')
  const [resultado, setResultado] = useState(null)
  const [horaActual, setHoraActual] = useState('')
  const [fechaActual, setFechaActual] = useState('')

  useEffect(() => {
    const actualizar = () => {
      const ahora = new Date()
      setHoraActual(ahora.toLocaleTimeString('es-VE', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      }))
      setFechaActual(ahora.toLocaleDateString('es-VE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }))
    }
    actualizar()
    const intervalo = setInterval(actualizar, 1000)
    return () => clearInterval(intervalo)
  }, [])

  const iniciarMarcaje = async () => {
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
    setTimeout(() => {
      setEstado('esperando')
      setResultado(null)
    }, 6000)
  }

  const colores = {
    esperando:'from-blue-900 to-blue-800',
    procesando:'from-yellow-600 to-yellow-500',
    exito:'from-green-700 to-green-600',
    error:'from-red-700 to-red-600',
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${colores[estado]} transition-all duration-700 flex flex-col`}>

      {/* Header con logo y reloj */}
      <div className="flex items-center justify-between px-8 py-4 bg-black/20">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
            <span className="text-blue-900 font-black text-xs text-center leading-tight">UPTAIET<br/></span>
          </div>
          <div>
            <h1 className="text-white font-black text-xl tracking-wide">UPTAIET</h1>
            <p className="text-blue-200 text-xs">Universidad Politécnica Territorial Agroindustrial del Estado Táchira</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-mono text-3xl font-bold">{horaActual}</p>
          <p className="text-blue-200 text-sm capitalize">{fechaActual}</p>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">

        {/* Selector entrada/salida */}
        <div className="flex gap-4 mb-10">
          {['entrada', 'salida'].map(t => (
            <button key={t} onClick={() => setTipo(t)}
              className={`px-10 py-3 rounded-xl font-bold text-lg capitalize transition-all ${
                tipo === t
                  ? 'bg-white text-blue-900 shadow-lg scale-105'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Zona de marcaje o resultado */}
        {(estado === 'esperando' || estado === 'procesando') && (
          <div onClick={iniciarMarcaje}
            className="cursor-pointer w-56 h-56 rounded-full bg-white/10 border-4 border-white/40
                       flex flex-col items-center justify-center hover:bg-white/20 hover:scale-105
                       transition-all duration-300 mb-8 shadow-2xl">
            <svg className="w-28 h-28 text-white" fill="currentColor" viewBox="0 0 64 64">
              <path d="M32 4C20 4 10 14 10 26c0 8 4 15 10 20v10h4v-8h16v8h4V46c6-5 10-12 10-20C54 14 44 4 32 4zm0 4c9.9 0 18 8.1 18 18S41.9 44 32 44 14 35.9 14 26 22.1 8 32 8zm0 4c-7.7 0-14 6.3-14 14s6.3 14 14 14 14-6.3 14-14S39.7 12 32 12zm0 4c5.5 0 10 4.5 10 10s-4.5 10-10 10-10-4.5-10-10 4.5-10 10-10z"/>
            </svg>
            <p className="text-white/80 text-sm mt-2 font-medium">
              {estado === 'procesando' ? 'Verificando...' : 'Toque para marcar'}
            </p>
          </div>
        )}

        {/* Ficha de resultado exitoso */}
        {resultado && estado === 'exito' && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center animate-pulse-once">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-1">{resultado.empleado}</h2>
            <p className="text-gray-500 text-sm mb-4">{resultado.cedula}</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Tipo</p>
                <p className="font-bold text-gray-700 capitalize">{resultado.tipo}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Hora</p>
                <p className="font-bold text-gray-700">{resultado.hora}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Departamento</p>
                <p className="font-bold text-gray-700 text-xs">{resultado.departamento}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Estado</p>
                <p className={`font-bold text-xs ${resultado.es_retardo ? 'text-yellow-600' : 'text-green-600'}`}>
                  {resultado.es_retardo ? `Retraso ${resultado.minutos_retardo} min` : 'A tiempo ✓'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {resultado && estado === 'error' && (
          <div className="bg-white/10 border-2 border-white/30 rounded-2xl p-8 text-center max-w-md">
            <p className="text-5xl mb-4">❌</p>
            <p className="text-white text-xl font-bold">{resultado.msg}</p>
            <p className="text-red-200 text-sm mt-2">Intente nuevamente</p>
          </div>
        )}

        {/* Instrucción */}
        {estado === 'esperando' && (
          <p className="text-white/80 text-lg animate-pulse mt-2">
            Coloque su dedo en el escáner ZK9500
          </p>
        )}
        {estado === 'procesando' && (
          <div className="flex items-center gap-3 text-yellow-100 text-lg mt-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
            Verificando huella biométrica...
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-white/40 text-xs">
        Sistema de Control de Asistencia Biométrico — Sede Rubio
      </div>
    </div>
  )
}