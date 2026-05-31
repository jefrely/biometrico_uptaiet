import { useState, useEffect } from 'react'
import api from '../services/api'

export default function Historial() {
  const [empleados,setEmpleados] = useState([])
  const [empleadoSel,setEmpleadoSel] = useState(null)
  const [registros,setRegistros] = useState([])
  const [cargando,setCargando] = useState(false)
  const [busqueda,setBusqueda] = useState('')
  const [fechaInicio,setFechaInicio] = useState('')
  const [fechaFin,setFechaFin] = useState('')
  const [mensaje,setMensaje] = useState(null)

  useEffect(() => {
    api.get('/personal/empleados/').then(res => setEmpleados(res.data))
    // Fechas por defecto: mes actual
    const hoy = new Date()
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    setFechaInicio(inicio.toISOString().split('T')[0])
    setFechaFin(hoy.toISOString().split('T')[0])
  }, [])

  const cargarHistorial = async (emp) => {
    setEmpleadoSel(emp)
    setCargando(true)
    setRegistros([])
    try {
      const params = new URLSearchParams()
      if (fechaInicio) params.append('fecha_inicio', fechaInicio)
      if (fechaFin)params.append('fecha_fin', fechaFin)
      const res = await api.get(`/asistencia/historial/${emp.id}/?${params}`)
      setRegistros(res.data.registros)
    } catch {
      setMensaje({ texto: 'Error al cargar historial', tipo: 'error' })
      setTimeout(() => setMensaje(null), 3000)
    } finally {
      setCargando(false)
    }
  }

  const aplicarFiltro = () => {
    if (empleadoSel) cargarHistorial(empleadoSel)
  }

  const empleadosFiltrados = empleados.filter(e =>
    e.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase())||
    e.cedula?.toLowerCase().includes(busqueda.toLowerCase())
  )

  // Agrupar registros por fecha para mostrar entrada/salida juntas
  const registrosAgrupados=() => {
    const grupos={}
    registros.forEach(r => {
      const fecha = r.fecha
      if (!grupos[fecha]) grupos[fecha]={ entrada: null, salida: null}
      if (r.tipo === 'entrada') grupos[fecha].entrada = r
      else grupos[fecha].salida = r
    })
    return Object.entries(grupos).sort((a, b) => b[0].localeCompare(a[0]))
  }

  const calcularHoras = (entrada, salida) => {
    if (!entrada || !salida) return '—'
    const [h1, m1] =entrada.hora.replace(' AM','').replace(' PM','').split(':').map(Number)
    const [h2, m2] =salida.hora.replace(' AM','').replace(' PM','').split(':').map(Number)
    const entrada12 =entrada.hora.includes('PM') && h1 !== 12 ? h1 + 12 : h1
    const salida12  =salida.hora.includes('PM')  && h2 !== 12 ? h2 + 12 : h2
    const diff = (salida12 * 60 + m2) - (entrada12 * 60 + m1)
    if (diff <= 0) return '—'
    const h = Math.floor(diff / 60)
    const m = diff % 60
    return `${h}h ${m}m`
  }

  const totalDias = registrosAgrupados().length
  const diasConEntrada = registrosAgrupados().filter(([, g]) => g.entrada).length
  const diasConRetraso = registrosAgrupados().filter(([, g]) => g.entrada?.es_retardo).length
  const diasSinSalida = registrosAgrupados().filter(([, g]) => g.entrada && !g.salida).length

  return (
    <div className="min-h-screen bg-gray-100">
     

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Historial de Asistencia</h2>

        {mensaje && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {mensaje.texto}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Panel izquierdo — lista de empleados */}
          <div className="bg-white rounded-2xl shadow p-4">
            <h3 className="font-bold text-gray-700 mb-3">Empleado</h3>
            <input
              type="text"
              placeholder="Buscar..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {empleadosFiltrados.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => cargarHistorial(emp)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    empleadoSel?.id === emp.id
                      ? 'bg-blue-900 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <p className="font-medium text-xs">{emp.nombre_completo}</p>
                  <p className={`text-xs ${empleadoSel?.id === emp.id ? 'text-blue-200' : 'text-gray-400'}`}>
                    {emp.cedula}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Panel derecho — historial */}
          <div className="lg:col-span-3">

            {/* Filtros de fecha */}
            <div className="bg-white rounded-2xl shadow p-4 mb-4 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 font-medium">Desde:</label>
                <input type="date" value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 font-medium">Hasta:</label>
                <input type="date" value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <button
                onClick={aplicarFiltro}
                disabled={!empleadoSel}
                className="bg-blue-900 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-40 transition"
              >
                Aplicar filtro
              </button>
              {empleadoSel && (
                <span className="text-sm text-gray-500 ml-auto">
                  {empleadoSel.nombre_completo} — {empleadoSel.cedula}
                </span>
              )}
            </div>

            {!empleadoSel ? (
              <div className="bg-white rounded-2xl shadow p-16 text-center">
                <p className="text-gray-400 text-lg">Seleccione un empleado para ver su historial</p>
              </div>
            ) : cargando ? (
              <div className="bg-white rounded-2xl shadow p-16 text-center">
                <p className="text-gray-400">Cargando historial...</p>
              </div>
            ) : (
              <>
                {/* Resumen estadístico */}
                {registros.length > 0 && (
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    {[
                      { label: 'Días registrados',valor: diasConEntrada, color: 'bg-blue-900' },
                      { label: 'Retrasos', valor: diasConRetraso,color:'bg-yellow-600'},
                      { label: 'Sin salida', valor: diasSinSalida,color:'bg-orange-500'},
                      { label: 'Total días',valor: totalDias,color:'bg-gray-600'},
                    ].map(s => (
                      <div key={s.label} className={`${s.color} text-white rounded-xl p-4`}>
                        <p className="text-2xl font-bold">{s.valor}</p>
                        <p className="text-xs opacity-80 mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tabla de registros */}
                <div className="bg-white rounded-2xl shadow overflow-hidden">
                  {registros.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-gray-400">No hay registros en el período seleccionado</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left py-3 px-4 text-gray-500 font-medium">Fecha</th>
                          <th className="text-left py-3 px-4 text-gray-500 font-medium">Entrada</th>
                          <th className="text-left py-3 px-4 text-gray-500 font-medium">Salida</th>
                          <th className="text-left py-3 px-4 text-gray-500 font-medium">Horas</th>
                          <th className="text-left py-3 px-4 text-gray-500 font-medium">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrosAgrupados().map(([fecha, grupo], i) => (
                          <tr key={fecha} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="py-3 px-4 font-medium text-gray-700">{fecha}</td>
                            <td className="py-3 px-4">
                              {grupo.entrada ? (
                                <span className="text-gray-800">{grupo.entrada.hora}</span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {grupo.salida ? (
                                <span className="text-gray-800">{grupo.salida.hora}</span>
                              ) : (
                                <span className="text-orange-400 text-xs">Sin salida</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {calcularHoras(grupo.entrada, grupo.salida)}
                            </td>
                            <td className="py-3 px-4">
                              {grupo.entrada?.es_retardo ? (
                                <span className="text-yellow-600 text-xs font-medium">
                                  ⚠️ Retraso {grupo.entrada.minutos_retardo} min
                                </span>
                              ) : grupo.entrada ? (
                                <span className="text-green-600 text-xs font-medium">✅ A tiempo</span>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}