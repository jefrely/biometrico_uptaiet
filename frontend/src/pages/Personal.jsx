import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function Personal() {
  const { usuario } = useAuth()
  const [empleados, setEmpleados] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [empleadoEditando, setEmpleadoEditando] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const navigate = useNavigate()
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  const formVacio = {
    cedula: '', nombres: '', apellidos: '', tipo: 'docente',
    departamento: '', cargo: '', email: '', telefono: '', fecha_ingreso: ''
  }
  const [form, setForm] = useState(formVacio)

  const cargar = async () => {
    try {
      const [empRes, depRes] = await Promise.all([
        api.get(`/personal/empleados/?incluir_inactivos=${mostrarInactivos}`),
        api.get('/personal/departamentos/')
      ])
      setEmpleados(empRes.data)
      setDepartamentos(depRes.data)
    } catch (e) {
      mostrarMensaje('Error al cargar datos', 'error')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [mostrarInactivos])

  const mostrarMensaje = (texto, tipo = 'ok') => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje(null), 4000)
  }

  const abrirCrear = () => {
    setEmpleadoEditando(null)
    setForm(formVacio)
    setModalAbierto(true)
  }

  const abrirEditar = (emp) => {
    setEmpleadoEditando(emp)
    setForm({
      cedula: emp.cedula,
      nombres:emp.nombres,
      apellidos:emp.apellidos,
      tipo: emp.tipo,
      departamento: emp.departamento,
      cargo: emp.cargo,
      email: emp.email,
      telefono: emp.telefono || '',
      fecha_ingreso: emp.fecha_ingreso
    })
    setModalAbierto(true)
  }

  const guardar= async () => {
    try {
      if (empleadoEditando) {
        await api.put(`/personal/empleados/${empleadoEditando.id}/`, form)
        mostrarMensaje('Empleado actualizado correctamente')
      } else {
        await api.post('/personal/empleados/', form)
        mostrarMensaje('Empleado creado correctamente')
      }
      setModalAbierto(false)
      cargar()
    } catch (e) {
      const errores = e.response?.data
      if (errores) {
        const msg = Object.entries(errores).map(([k, v]) => `${k}: ${v}`).join(' | ')
        mostrarMensaje(msg, 'error')
      } else {
        mostrarMensaje('Error al guardar', 'error')
      }
    }
  }

  const desactivar = async (emp) => {
    if (!window.confirm(`¿Desactivar a ${emp.nombre_completo}?`)) return
    try {
      await api.delete(`/personal/empleados/${emp.id}/`)
      mostrarMensaje('Empleado desactivado')
      cargar()
    } catch {
      mostrarMensaje('Error al desactivar', 'error')
    }
  }

  const reactivar = async (emp) => {
    if (!window.confirm(`¿Reactivar a ${emp.nombre_completo}?`)) return
    try {
      await api.put(`/personal/empleados/${emp.id}/`, { activo: true })
      mostrarMensaje('Empleado reactivado correctamente')
      cargar()
    } catch {
      mostrarMensaje('Error al reactivar', 'error')
    }
  }

  const registrarHuella = (emp) => {
  navigate(`/huellas/${emp.id}`)
}

  const empleadosFiltrados = empleados.filter(e => {
    const coincideBusqueda =
      e.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.cedula?.toLowerCase().includes(busqueda.toLowerCase())
    const coincideTipo = filtroTipo ? e.tipo === filtroTipo : true
    return coincideBusqueda && coincideTipo
  })

  if (cargando) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p className="text-gray-500">Cargando personal...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Mensaje */}
        {mensaje && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' :
            mensaje.tipo === 'info'  ? 'bg-blue-100 text-blue-700' :
                                       'bg-green-100 text-green-700'
          }`}>
            {mensaje.texto}
          </div>
        )}

        {/* Encabezado */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Gestión de Personal</h2>
          {(usuario?.rol === 'admin' || (usuario?.modulos || []).includes('personal')) && (
            <button
              onClick={abrirCrear}
              className="bg-blue-900 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition"
            >
              + Nuevo Empleado
            </button>
          )}
        </div>

        {/* Filtros */}
        <button
          onClick={() => setMostrarInactivos(!mostrarInactivos)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            mostrarInactivos
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-gray-100 text-gray-600 border border-gray-300'
          }`}
        >
          {mostrarInactivos ? 'Ocultar inactivos' : 'Ver inactivos'}
        </button>

        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Buscar por nombre o cédula..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los tipos</option>
            <option value="docente">Docente</option>
            <option value="obrero">Obrero</option>
            <option value="administrativo">Administrativo</option>
          </select>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Empleado</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Cédula</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Tipo</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Cargo</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Huella</th>
                {usuario?.rol === 'admin' && (
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {empleadosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-gray-400">
                    No se encontraron empleados
                  </td>
                </tr>
              ) : empleadosFiltrados.map(emp => (
                <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800">{emp.nombre_completo}</td>
                  <td className="py-3 px-4 text-gray-500">{emp.cedula}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      emp.tipo === 'docente'        ? 'bg-blue-100 text-blue-700' :
                      emp.tipo === 'obrero'         ? 'bg-yellow-100 text-yellow-700' :
                                                      'bg-purple-100 text-purple-700'
                    }`}>
                      {emp.tipo}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{emp.cargo}</td>
                  <td className="py-3 px-4">
                    {emp.tiene_huella ? (
                      <span className="text-green-600 text-xs font-medium">✅ Registrada</span>
                    ) : (
                      <span className="text-red-500 text-xs font-medium">❌ Sin huella</span>
                    )}
                  </td>
                  {(usuario?.rol === 'admin' || (usuario?.modulos || []).includes('personal')) && (
                    <td className="py-3 px-4">

                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => navigate(`/perfil/${emp.id}`)}
                          className="text-purple-600 hover:text-purple-800 text-xs font-medium">
                          Ver perfil
                        </button>
                        {emp.activo ? (
                          <>
                           <button onClick={() => abrirEditar(emp)}
                             className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                             Editar
                           </button>
                           <button onClick={() => registrarHuella(emp)}
                             className="text-green-600 hover:text-green-800 text-xs font-medium">
                             Huella
                           </button>
                           <button onClick={() => desactivar(emp)}
                             className="text-red-500 hover:text-red-700 text-xs font-medium">
                             Desactivar
                           </button>
                         </>
                        ) : (
                          <button onClick={() => reactivar(emp)}
                            className="text-emerald-600 hover:text-emerald-800 text-xs font-medium font-bold">
                            Reactivar
                          </button>
                        )}
                     </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              {empleadoEditando ? 'Editar Empleado' : 'Nuevo Empleado'}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cédula</label>
                <input
                  type="text" value={form.cedula}
                  onChange={e => setForm({...form, cedula: e.target.value})}
                  placeholder="V-12345678"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm({...form, tipo: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="docente">Docente</option>
                  <option value="obrero">Obrero</option>
                  <option value="administrativo">Administrativo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombres</label>
                <input
                  type="text" value={form.nombres}
                  onChange={e => setForm({...form, nombres: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Apellidos</label>
                <input
                  type="text" value={form.apellidos}
                  onChange={e => setForm({...form, apellidos: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Departamento</label>
                <select
                  value={form.departamento}
                  onChange={e => setForm({...form, departamento: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccione...</option>
                  {departamentos.map(d => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cargo</label>
                <input
                  type="text" value={form.cargo}
                  onChange={e => setForm({...form, cargo: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email" value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                <input
                  type="text" value={form.telefono}
                  onChange={e => setForm({...form, telefono: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de Ingreso</label>
                <input
                  type="date" value={form.fecha_ingreso}
                  onChange={e => setForm({...form, fecha_ingreso: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={guardar}
                className="flex-1 bg-blue-900 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition"
              >
                {empleadoEditando ? 'Guardar cambios' : 'Crear empleado'}
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