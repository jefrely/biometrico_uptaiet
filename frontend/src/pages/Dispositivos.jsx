import { useState, useEffect } from 'react'
import api from '../services/api'

export default function Dispositivos() {
  const [dispositivos, setDispositivos] = useState([])
  const [escaner, setEscaner] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState(null)
  const [modalAbrir, setModalAbrir] = useState(false)
  const [verificando, setVerificando] = useState(false)

  const formVacio = { 
    nombre: '',
    modelo: 'ZK9500', 
    numero_serie: '', 
    ubicacion: '' }

  const [form, setForm] = useState(formVacio)

  useEffect(() => {
    cargar()
    verificarEscaner()
  }, [])

  const cargar = async () => {
    try {
      const res = await api.get('/biometrico/dispositivos/')
      setDispositivos(res.data)
    } catch {
      mostrarMensaje('Error al cargar dispositivos.', 'error')
    } finally {
      setCargando(false)
    }
  }

  const verificarEscaner = async () => {
    setVerificando(true)
    try {
      const res = await api.get('/biometrico/escaner/estado/')
      setEscaner(res.data)
    } catch {
      setEscaner({ conectado: false, msg: 'No se pudo verificar el estado.' })
    } finally {
      setVerificando(false)
    }
  }

  const mostrarMensaje = (texto, tipo = 'ok') => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje(null), 4000)
  }

  const guardar = async () => {
    if (!form.nombre || !form.numero_serie) {
      mostrarMensaje('El nombre y número de serie son requeridos.', 'error')
      return
    }
    try {
      await api.post('/biometrico/dispositivos/', form)
      mostrarMensaje('Dispositivo registrado correctamente.')
      setModalAbrir(false)
      setForm(formVacio)
      cargar()
    } catch (e) {
      mostrarMensaje(e.response?.data?.error || 'Error al guardar.', 'error')
    }
  }

  const toggleActivo = async (i) => {
    try {
      await api.put(`/biometrico/dispositivos/${i.id}/`, { activo: !i.activo })
      mostrarMensaje(`Dispositivo ${i.activo ? 'desactivado' : 'activado'}.`)
      cargar()
    } catch {
      mostrarMensaje('Error al actualizar.', 'error')
    }
  }

  const eliminar = async (i) => {
    if (!confirm(`¿Eliminar ${i.nombre}?`)) return
    try {
      await api.delete(`/biometrico/dispositivos/${i.id}/`)
      mostrarMensaje('Dispositivo eliminado.')
      cargar()
    } catch {
      mostrarMensaje('Error al eliminar.', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dispositivos Biométricos</h2>
          <p className="text-gray-400 text-sm">Gestión de escáneres ZK9500</p>
        </div>
        <button onClick={() => setModalAbrir(true)}
          className="bg-blue-900 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-800">
          + Agregar Dispositivo
        </button>
      </div>

      {mensaje && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
        }`}>{mensaje.texto}</div>
      )}

      {/* Estado del escáner en tiempo real */}
      <div className={`rounded-2xl p-5 border-2 ${
        escaner?.conectado ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              escaner?.conectado ? 'bg-emerald-500' : 'bg-red-400'
            }`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <div>
              <p className={`font-bold text-lg ${escaner?.conectado ? 'text-emerald-800' : 'text-red-800'}`}>
                Escáner ZK9500 — {escaner?.conectado ? '🟢 Conectado' : '🔴 Desconectado'}
              </p>
              <p className={`text-sm ${escaner?.conectado ? 'text-emerald-600' : 'text-red-500'}`}>
                {verificando ? 'Verificando...' : escaner?.msg}
              </p>
            </div>
          </div>
          <button onClick={verificarEscaner} disabled={verificando}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50">
            <svg className={`w-4 h-4 ${verificando ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Verificar
          </button>
        </div>
        {escaner?.conectado && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-emerald-700">{escaner.cantidad}</p>
              <p className="text-xs text-gray-500">Dispositivo(s)</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center">
              <p className="text-sm font-bold text-gray-700">ZK9500</p>
              <p className="text-xs text-gray-500">Modelo</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center">
              <p className="text-sm font-bold text-gray-700">USB</p>
              <p className="text-xs text-gray-500">Conexión</p>
            </div>
          </div>
        )}
      </div>

      {/* Lista de dispositivos registrados */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-700">Dispositivos Registrados</h3>
        </div>
        {cargando ? (
          <p className="text-center py-10 text-gray-400">Cargando...</p>
        ) : dispositivos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-300 text-4xl mb-3">🖥</p>
            <p className="text-gray-400 mb-4">No hay dispositivos registrados</p>
            <button onClick={() => setModalAbrir(true)}
              className="bg-blue-900 text-white px-4 py-2 rounded-xl text-sm">
              Registrar primer dispositivo
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Dispositivo</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Modelo</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">N° Serie</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Ubicación</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Estado</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Última sinc.</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {dispositivos.map(d => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800">{d.nombre}</td>
                  <td className="py-3 px-4 text-gray-500">{d.modelo}</td>
                  <td className="py-3 px-4 text-gray-500 font-mono text-xs">{d.numero_serie}</td>
                  <td className="py-3 px-4 text-gray-500">{d.ubicacion || '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      d.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {d.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400 text-xs">{d.ultima_sincronizacion || '—'}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button onClick={() => toggleActivo(d)}
                        className={`text-xs font-medium ${d.activo ? 'text-amber-600 hover:text-amber-800' : 'text-emerald-600 hover:text-emerald-800'}`}>
                        {d.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button onClick={() => eliminar(d)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal agregar */}
      {modalAbrir && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Registrar Dispositivo</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value})}
                  placeholder="Ej: Entrada Principal"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                <input type="text" value={form.modelo}
                  onChange={e => setForm({...form, modelo: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Serie *</label>
                <input type="text" value={form.numero_serie}
                  onChange={e => setForm({...form, numero_serie: e.target.value})}
                  placeholder="Ej: ZK9500A1234"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                <input type="text" value={form.ubicacion}
                  onChange={e => setForm({...form, ubicacion: e.target.value})}
                  placeholder="Ej: Recepción, Planta baja"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={guardar}
                className="flex-1 bg-blue-900 text-white py-2 rounded-xl text-sm font-semibold hover:bg-blue-800">
                Guardar
              </button>
              <button onClick={() => setModalAbrir(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-semibold">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}