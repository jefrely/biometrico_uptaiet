import { useState, useEffect } from 'react'
import api from '../services/api'

export default function Configuracion() {
  const [config, setConfig] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando,setGuardando]= useState(false)
  const [mensaje,setMensaje] = useState(null)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    try {
      const res = await api.get('/auth/configuracion/')
      setConfig(res.data)
    } catch {
      mostrarMensaje('Error al cargar configuración.', 'error')
    } finally {
      setCargando(false)
    }
  }

  const guardar = async () => {
    setGuardando(true)
    try {
      await api.put('/auth/configuracion/', config)
      mostrarMensaje('Configuración guardada correctamente.')
    } catch (e) {
      mostrarMensaje(e.response?.data?.error || 'Error al guardar.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  const mostrarMensaje = (texto, tipo = 'ok') => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje(null), 4000)
  }

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Cargando configuración...</p>
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Configuración del Sistema</h2>
        <p className="text-gray-400 text-sm">Reglas de asistencia e información institucional</p>
      </div>

      {mensaje && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
        }`}>{mensaje.texto}</div>
      )}

      {/* Información institucional */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 text-xs">🏛</span>
          Información Institucional
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la institución</label>
            <input type="text" value={config.nombre_institucion}
              onChange={e => setConfig({...config, nombre_institucion: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sede</label>
            <input type="text" value={config.sede}
              onChange={e => setConfig({...config, sede: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
        </div>
      </div>

      {/* Hora de almuerzo */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center text-orange-700 text-xs">🍽</span>
          Hora de Almuerzo
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Inicio</label>
            <input type="time" value={config.hora_almuerzo_inicio}
              onChange={e => setConfig({...config, hora_almuerzo_inicio: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
            <input type="time" value={config.hora_almuerzo_fin}
              onChange={e => setConfig({...config, hora_almuerzo_fin: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tolerancia (minutos)</label>
            <input type="number" min="0" max="30" value={config.tolerancia_almuerzo_min}
              onChange={e => setConfig({...config, tolerancia_almuerzo_min: parseInt(e.target.value)})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          El sistema registrará salida y entrada de almuerzo en este rango horario.
          La tolerancia permite llegar {config.tolerancia_almuerzo_min} minutos tarde del almuerzo sin marcar retraso.
        </p>
      </div>

      {/* Reglas de jornada */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 text-xs">⏱</span>
          Reglas de Jornada
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Horas de jornada completa
            </label>
            <input type="number" min="1" max="12" step="0.5" value={config.horas_jornada_completa}
              onChange={e => setConfig({...config, horas_jornada_completa: parseFloat(e.target.value)})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            <p className="text-xs text-gray-400 mt-1">
              Si trabaja más de {config.horas_jornada_completa}h se registran horas extras.
            </p>
          </div>
          <div className="space-y-3 pt-1">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={config.notificar_retrasos}
                onChange={e => setConfig({...config, notificar_retrasos: e.target.checked})}
                className="w-4 h-4 accent-blue-900"/>
              <div>
                <p className="text-sm font-medium text-gray-700">Registrar retrasos</p>
                <p className="text-xs text-gray-400">Marcar cuando el empleado llega tarde</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={config.notificar_ausencias}
                onChange={e => setConfig({...config, notificar_ausencias: e.target.checked})}
                className="w-4 h-4 accent-blue-900"/>
              <div>
                <p className="text-sm font-medium text-gray-700">Registrar ausencias automáticas</p>
                <p className="text-xs text-gray-400">Crear ausencia si no hay marcaje de entrada</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Resumen visual de reglas */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h3 className="font-bold text-blue-800 mb-3">Resumen de reglas actuales</h3>
        <ul className="space-y-2 text-sm text-blue-700">
          <li>✅ Jornada completa: <strong>{config.horas_jornada_completa} horas</strong></li>
          <li>🍽 Almuerzo: <strong>{config.hora_almuerzo_inicio} — {config.hora_almuerzo_fin}</strong> con {config.tolerancia_almuerzo_min} min de tolerancia</li>
          <li>{config.notificar_retrasos ? '⚠️' : '❌'} Registro de retrasos: <strong>{config.notificar_retrasos ? 'Activado' : 'Desactivado'}</strong></li>
          <li>{config.notificar_ausencias ? '📋' : '❌'} Ausencias automáticas: <strong>{config.notificar_ausencias ? 'Activado' : 'Desactivado'}</strong></li>
        </ul>
      </div>

      <div className="flex justify-end">
        <button onClick={guardar} disabled={guardando}
          className="bg-blue-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-800 transition disabled:opacity-50">
          {guardando ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  )
}