import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const DIAS = [
  { value: 'lunes',label: 'Lunes'},
  { value: 'martes',label: 'Martes'},
  { value: 'miercoles', label: 'Miércoles'},
  { value: 'jueves',label: 'Jueves'},
  { value: 'viernes',label: 'Viernes'},
  { value: 'sabado',label: 'Sábado'},
  { value: 'domingo',label: 'Domingo'},
]

const ORDEN_DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']

export default function Horarios() {
  const navigate = useNavigate()

  const [empleados, setEmpleados] = useState([])
  const [empleadoSel,setEmpleadoSel] = useState(null)
  const [horarios,setHorarios]= useState([])
  const [todosHorarios,setTodosHorarios] = useState({})
  const [cargando,setCargando]= useState(false)
  const [modalAbierto,setModalAbierto]= useState(false)
  const [mensaje,setMensaje]= useState(null)
  const [busqueda,setBusqueda]= useState('')

  const formVacio = {
    dia: 'lunes', hora_entrada: '07:00', hora_salida: '15:00', tolerancia_min: 10
  }
  const [form, setForm] = useState(formVacio)

  const cargarTodosHorarios = async (listaEmpleados) => {
    const mapa = {}
    await Promise.all(
      listaEmpleados.map(async (emp) => {
        try {
          const res = await api.get(`/personal/horarios/${emp.id}/`)
          mapa[emp.id] = res.data.horarios
        } catch {
          mapa[emp.id] = []
        }
      })
    )
    setTodosHorarios(mapa)
  }

  useEffect(() => {
    api.get('/personal/empleados/').then(res => {
      setEmpleados(res.data)
      cargarTodosHorarios(res.data)
    })
  }, [])

  const cargarHorarios = async (emp) => {
    setEmpleadoSel(emp)
    setCargando(true)
    try {
      const res = await api.get(`/personal/horarios/${emp.id}/`)
      setHorarios(res.data.horarios)
    } catch {
      mostrarMensaje('Error al cargar horarios', 'error')
    } finally {
      setCargando(false)
    }
  }

  const mostrarMensaje = (texto, tipo = 'ok') => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje(null), 4000)
  }

  const guardarHorario = async () => {
    try {
      await api.post(`/personal/horarios/${empleadoSel.id}/`, form)
      mostrarMensaje('Horario guardado correctamente')
      setModalAbierto(false)
      cargarHorarios(empleadoSel)
      cargarTodosHorarios(empleados)
    } catch (e) {
      const err = e.response?.data
      if (err) {
        const msg = Object.entries(err).map(([k, v]) => `${k}: ${v}`).join(' | ')
        mostrarMensaje(msg, 'error')
      } else {
        mostrarMensaje('Error al guardar horario', 'error')
      }
    }
  }

  const eliminarHorario = async (horarioId) => {
    if (!confirm('¿Eliminar este horario?')) return
    try {
      await api.delete(`/personal/horarios/${empleadoSel.id}/`, {
        data: { horario_id: horarioId }
      })
      mostrarMensaje('Horario eliminado')
      cargarHorarios(empleadoSel)
      cargarTodosHorarios(empleados)
    } catch {
      mostrarMensaje('Error al eliminar', 'error')
    }
  }

  const horariosOrdenados = [...horarios].sort(
    (a, b) => ORDEN_DIAS.indexOf(a.dia) - ORDEN_DIAS.indexOf(b.dia)
  )

  const diasSinHorario = DIAS.filter(
    d => !horarios.find(h => h.dia === d.value)
  )

  const empleadosFiltrados = empleados.filter(e =>
    e.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.cedula?.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-100">

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Gestión de Horarios</h2>

        {mensaje && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {mensaje.texto}
          </div>
        )}

        {/* Panel principal — selección y detalle */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Panel izquierdo — lista de empleados */}
          <div className="bg-white rounded-2xl shadow p-4">
            <h3 className="font-bold text-gray-700 mb-3">Seleccionar empleado</h3>
            <input
              type="text"
              placeholder="Buscar..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {empleadosFiltrados.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => cargarHorarios(emp)}
                  className={`w-full text-left px-3 py-3 rounded-lg text-sm transition ${
                    empleadoSel?.id === emp.id
                      ? 'bg-blue-900 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <p className="font-medium">{emp.nombre_completo}</p>
                  <p className={`text-xs ${empleadoSel?.id === emp.id ? 'text-blue-200' : 'text-gray-400'}`}>
                    {emp.cedula} — {emp.tipo}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Panel derecho — horarios del empleado seleccionado */}
          <div className="lg:col-span-2">
            {!empleadoSel ? (
              <div className="bg-white rounded-2xl shadow p-12 text-center">
                <p className="text-gray-400 text-lg">Seleccione un empleado para ver sus horarios</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{empleadoSel.nombre_completo}</h3>
                    <p className="text-gray-500 text-sm">{empleadoSel.cedula} — {empleadoSel.tipo}</p>
                  </div>
                  {diasSinHorario.length > 0 && (
                    <button
                      onClick={() => {
                        setForm({ ...formVacio, dia: diasSinHorario[0].value })
                        setModalAbierto(true)
                      }}
                      className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition"
                    >
                      + Agregar día
                    </button>
                  )}
                </div>

                {cargando ? (
                  <p className="text-gray-400 text-center py-8">Cargando...</p>
                ) : horariosOrdenados.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400 mb-4">Este empleado no tiene horarios asignados</p>
                    <button
                      onClick={() => { setForm(formVacio); setModalAbierto(true) }}
                      className="bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800"
                    >
                      + Asignar primer horario
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {horariosOrdenados.map(h => {
                      const diaLabel = DIAS.find(d => d.value === h.dia)?.label || h.dia
                      return (
                        <div key={h.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex items-center gap-4">
                            <div className="w-24 text-center bg-blue-900 text-white rounded-lg py-1 text-sm font-semibold">
                              {diaLabel}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">
                                {h.hora_entrada} — {h.hora_salida}
                              </p>
                              <p className="text-xs text-gray-500">
                                Tolerancia: {h.tolerancia_min} minutos
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setForm({
                                  dia:            h.dia,
                                  hora_entrada:   h.hora_entrada,
                                  hora_salida:    h.hora_salida,
                                  tolerancia_min: h.tolerancia_min
                                })
                                setModalAbierto(true)
                              }}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium px-3 py-1 bg-blue-50 rounded-lg"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => eliminarHorario(h.id)}
                              className="text-red-500 hover:text-red-700 text-xs font-medium px-3 py-1 bg-red-50 rounded-lg"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    {diasSinHorario.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-400 mb-2">
                          Días sin horario: {diasSinHorario.map(d => d.label).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabla resumen de todos los empleados */}
        <div className="mt-8 bg-white rounded-2xl shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Resumen de Horarios — Todo el Personal
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="text-left py-3 px-4 rounded-tl-lg">Empleado</th>
                  <th className="text-left py-3 px-4">Cédula</th>
                  <th className="text-left py-3 px-4">Tipo</th>
                  {DIAS.map(d => (
                    <th key={d.value} className="text-center py-3 px-2">{d.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {empleados.map((emp, i) => {
                  const horariosEmp = todosHorarios[emp.id] || []
                  return (
                    <tr key={emp.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-3 px-4 font-medium text-gray-800">{emp.nombre_completo}</td>
                      <td className="py-3 px-4 text-gray-500">{emp.cedula}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          emp.tipo === 'docente'        ? 'bg-blue-100 text-blue-700' :
                          emp.tipo === 'obrero'         ? 'bg-yellow-100 text-yellow-700' :
                          emp.tipo === 'administrativo' ? 'bg-purple-100 text-purple-700' :
                                                          'bg-slate-100 text-slate-700'
                        }`}>
                          {emp.tipo_display || emp.tipo}
                        </span>
                      </td>
                      {DIAS.map(d => {
                        const h = horariosEmp.find(h => h.dia === d.value)
                        return (
                          <td key={d.value} className="py-3 px-2 text-center">
                            {h ? (
                              <div className="text-xs">
                                <p className="font-medium text-green-700">{h.hora_entrada}</p>
                                <p className="text-gray-400">{h.hora_salida}</p>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              Horario — {empleadoSel?.nombre_completo}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Día</label>
                <select
                  value={form.dia}
                  onChange={e => setForm({ ...form, dia: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DIAS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora entrada</label>
                  <input
                    type="time"
                    value={form.hora_entrada}
                    onChange={e => setForm({ ...form, hora_entrada: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora salida</label>
                  <input
                    type="time"
                    value={form.hora_salida}
                    onChange={e => setForm({ ...form, hora_salida: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tolerancia (minutos de gracia para el retraso)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={form.tolerancia_min}
                  onChange={e => setForm({ ...form, tolerancia_min: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Si entra a las 7:00 y la tolerancia es 10 min, no se marca retraso hasta las 7:10
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={guardarHorario}
                className="flex-1 bg-blue-900 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition"
              >
                Guardar horario
              </button>
              <button
                onClick={() => setModalAbierto(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}