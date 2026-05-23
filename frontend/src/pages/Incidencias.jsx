import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import api from '../services/api'

const TIPOS_PERMISO = [
  { value: 'PERMISO',label: 'Permiso'},
  { value: 'REPOSO',label: 'Reposo Médico'},
  { value: 'VACACIONES',label: 'Vacaciones'},
  { value: 'COMISION',label: 'Comisión'},
  { value: 'MATERNIDAD',label: 'Maternidad/Paternidad'},
  { value: 'DUELO',label: 'Duelo'},
  { value: 'CAPACITACION',label: 'Capacitación'},
]

const COLORES_ESTADO = {
  PENDIENTE:'bg-yellow-100 text-yellow-700',
  APROBADO:'bg-green-100 text-green-700',
  RECHAZADO:'bg-red-100 text-red-700',
}

const COLORES_TIPO = {
  PERMISO:'bg-blue-100 text-blue-700',
  REPOSO:'bg-orange-100 text-orange-700',
  VACACIONES:'bg-teal-100 text-teal-700',
  COMISION:'bg-purple-100 text-purple-700',
  MATERNIDAD:'bg-pink-100 text-pink-700',
  DUELO:'bg-gray-100 text-gray-600',
  CAPACITACION:'bg-indigo-100 text-indigo-700',
}

export default function Incidencias() {
  const [tab,setTab] = useState('permisos')
  const [permisos,setPermisos] = useState([])
  const [feriados,setFeriados] = useState([])
  const [empleados,setEmpleados] = useState([])
  const [cargando,setCargando]= useState(true)
  const [mensaje,setMensaje] = useState(null)
  const [modalPermiso,setModalPermiso]= useState(false)
  const [modalFeriado,setModalFeriado]= useState(false)
  const [modalAprobar,setModalAprobar]= useState(null)
  const [filtroEstado,setFiltroEstado]= useState('')

  const formPermisoVacio = {
    empleado_id:'', tipo: 'PERMISO',
    fecha_inicio:'', fecha_fin: '', motivo: ''
  }
  const formFeriadoVacio = {
    nombre: '', fecha: '',obligatorio: true, descripcion: ''
  }
  const [formPermiso,setFormPermiso] = useState(formPermisoVacio)
  const [formFeriado,setFormFeriado] = useState(formFeriadoVacio)
  const [obsAprobar,setObsAprobar] = useState('')

  useEffect(() => {
    cargarTodo()
  }, [])

  const cargarTodo = async () => {
    setCargando(true)
    try {
      const [pRes, fRes, eRes] = await Promise.all([
        api.get('/asistencia/permisos/'),
        api.get('/asistencia/feriados/'),
        api.get('/personal/empleados/'),
      ])
      setPermisos(pRes.data)
      setFeriados(fRes.data)
      setEmpleados(eRes.data)
    } catch {
      mostrarMensaje('Error al cargar datos', 'error')
    } finally {
      setCargando(false)
    }
  }

  const mostrarMensaje = (texto, tipo = 'ok') => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje(null), 4000)
  }

  const guardarPermiso = async () => {
    if (!formPermiso.empleado_id || !formPermiso.fecha_inicio || !formPermiso.fecha_fin || !formPermiso.motivo) {
      mostrarMensaje('Complete todos los campos requeridos.', 'error')
      return
    }
    if (formPermiso.fecha_fin < formPermiso.fecha_inicio) {
      mostrarMensaje('La fecha fin no puede ser anterior a la fecha inicio.', 'error')
      return
    }
    try {
      await api.post('/asistencia/permisos/', formPermiso)
      mostrarMensaje('Permiso creado correctamente.')
      setModalPermiso(false)
      setFormPermiso(formPermisoVacio)
      cargarTodo()
    } catch (e) {
      mostrarMensaje(e.response?.data?.error || 'Error al crear permiso.', 'error')
    }
  }

  const cambiarEstado = async (estado) => {
    try {
      await api.put(`/asistencia/permisos/${modalAprobar.id}/`, {
        estado, observacion: obsAprobar
      })
      mostrarMensaje(`Permiso ${estado.toLowerCase()} correctamente.`)
      setModalAprobar(null)
      setObsAprobar('')
      cargarTodo()
    } catch (e) {
      mostrarMensaje(e.response?.data?.error || 'Error al actualizar.', 'error')
    }
  }

  const eliminarPermiso = async (id) => {
    if (!confirm('¿Eliminar este permiso?')) return
    try {
      await api.delete(`/asistencia/permisos/${id}/`)
      mostrarMensaje('Permiso eliminado.')
      cargarTodo()
    } catch {
      mostrarMensaje('Error al eliminar.', 'error')
    }
  }

  const guardarFeriado = async () => {
    if (!formFeriado.nombre || !formFeriado.fecha) {
      mostrarMensaje('Nombre y fecha son requeridos.', 'error')
      return
    }
    try {
      await api.post('/asistencia/feriados/', formFeriado)
      mostrarMensaje('Feriado registrado correctamente.')
      setModalFeriado(false)
      setFormFeriado(formFeriadoVacio)
      cargarTodo()
    } catch (e) {
      mostrarMensaje(e.response?.data?.error || 'Error al crear feriado.', 'error')
    }
  }

  const eliminarFeriado = async (id) => {
    if (!confirm('¿Eliminar este feriado?')) return
    try {
      await api.delete('/asistencia/feriados/', { data: { feriado_id: id } })
      mostrarMensaje('Feriado eliminado.')
      cargarTodo()
    } catch {
      mostrarMensaje('Error al eliminar.', 'error')
    }
  }

  const permisosFiltrados = permisos.filter(p =>
    filtroEstado ? p.estado === filtroEstado : true
  )

  if (cargando) return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Incidencias y Permisos</h2>

        {mensaje && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {mensaje.texto}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {[
            { key: 'permisos', label: `Permisos y Reposos (${permisos.length})` },
            { key: 'feriados', label: `Días Feriados (${feriados.length})` },
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

        {/* ── TAB PERMISOS ── */}
        {tab === 'permisos' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-3">
                {['', 'PENDIENTE', 'APROBADO', 'RECHAZADO'].map(e => (
                  <button key={e} onClick={() => setFiltroEstado(e)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                      filtroEstado === e
                        ? 'bg-blue-900 text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                    }`}>
                    {e || 'Todos'}
                  </button>
                ))}
              </div>
              <button onClick={() => setModalPermiso(true)}
                className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800">
                + Nuevo Permiso
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Empleado</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Tipo</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Período</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Motivo</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Estado</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {permisosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-10 text-gray-400">
                        No hay permisos registrados
                      </td>
                    </tr>
                  ) : permisosFiltrados.map(p => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-800">{p.empleado}</p>
                        <p className="text-xs text-gray-400">{p.cedula}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${COLORES_TIPO[p.tipo] || 'bg-gray-100 text-gray-600'}`}>
                          {p.tipo_display}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs">
                        <p>{p.fecha_inicio}</p>
                        <p>al {p.fecha_fin}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs max-w-xs truncate">
                        {p.motivo}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${COLORES_ESTADO[p.estado]}`}>
                          {p.estado}
                        </span>
                        {p.aprobado_por && (
                          <p className="text-xs text-gray-400 mt-1">por {p.aprobado_por}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {p.estado === 'PENDIENTE' && (
                            <button onClick={() => { setModalAprobar(p); setObsAprobar('') }}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                              Revisar
                            </button>
                          )}
                          <button onClick={() => eliminarPermiso(p.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB FERIADOS ── */}
        {tab === 'feriados' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setModalFeriado(true)}
                className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800">
                + Agregar Feriado
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Nombre</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Fecha</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Tipo</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Descripción</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {feriados.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-10 text-gray-400">
                        No hay feriados registrados
                      </td>
                    </tr>
                  ) : feriados.map(f => (
                    <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{f.nombre}</td>
                      <td className="py-3 px-4 text-gray-600">{f.fecha}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          f.obligatorio ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {f.obligatorio ? 'Nacional' : 'Institucional'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{f.descripcion || '—'}</td>
                      <td className="py-3 px-4">
                        <button onClick={() => eliminarFeriado(f.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium">
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal nuevo permiso */}
      {modalPermiso && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Nuevo Permiso / Incidencia</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empleado *</label>
                <select value={formPermiso.empleado_id}
                  onChange={e => setFormPermiso({...formPermiso, empleado_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccione...</option>
                  {empleados.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre_completo} — {e.cedula}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <select value={formPermiso.tipo}
                  onChange={e => setFormPermiso({...formPermiso, tipo: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {TIPOS_PERMISO.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio *</label>
                  <input type="date" value={formPermiso.fecha_inicio}
                    onChange={e => setFormPermiso({...formPermiso, fecha_inicio: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin *</label>
                  <input type="date" value={formPermiso.fecha_fin}
                    onChange={e => setFormPermiso({...formPermiso, fecha_fin: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
                <textarea value={formPermiso.motivo}
                  onChange={e => setFormPermiso({...formPermiso, motivo: e.target.value})}
                  rows={3}
                  placeholder="Describa el motivo del permiso..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={guardarPermiso}
                className="flex-1 bg-blue-900 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-800">
                Guardar permiso
              </button>
              <button onClick={() => setModalPermiso(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal aprobar/rechazar */}
      {modalAprobar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Revisar Permiso</h3>
            <p className="text-gray-500 text-sm mb-4">
              {modalAprobar.empleado} — {modalAprobar.tipo_display}
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <p><span className="font-medium">Período:</span> {modalAprobar.fecha_inicio} al {modalAprobar.fecha_fin}</p>
              <p><span className="font-medium">Motivo:</span> {modalAprobar.motivo}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observación (opcional)</label>
              <textarea value={obsAprobar} onChange={e => setObsAprobar(e.target.value)}
                rows={2} placeholder="Agregar observación..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="flex gap-3">
              <button onClick={() => cambiarEstado('APROBADO')}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700">
                Aprobar
              </button>
              <button onClick={() => cambiarEstado('RECHAZADO')}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-700">
                Rechazar
              </button>
              <button onClick={() => setModalAprobar(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo feriado */}
      {modalFeriado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Registrar Día Feriado</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" value={formFeriado.nombre}
                  onChange={e => setFormFeriado({...formFeriado, nombre: e.target.value})}
                  placeholder="Ej: Día de la Independencia"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                <input type="date" value={formFeriado.fecha}
                  onChange={e => setFormFeriado({...formFeriado, fecha: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="obligatorio" checked={formFeriado.obligatorio}
                  onChange={e => setFormFeriado({...formFeriado, obligatorio: e.target.checked})}
                  className="w-4 h-4"/>
                <label htmlFor="obligatorio" className="text-sm text-gray-700">
                  Feriado Nacional (obligatorio — no se trabaja)
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input type="text" value={formFeriado.descripcion}
                  onChange={e => setFormFeriado({...formFeriado, descripcion: e.target.value})}
                  placeholder="Opcional"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={guardarFeriado}
                className="flex-1 bg-blue-900 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-800">
                Guardar feriado
              </button>
              <button onClick={() => setModalFeriado(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}