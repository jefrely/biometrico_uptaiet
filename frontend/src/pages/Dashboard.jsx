import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Navbar from '../components/Navbar'

export default function Dashboard() {
  const { usuario } = useAuth()
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)

  const cargarDashboard = async () => {
    try {
      const res = await api.get('/asistencia/dashboard/')
      setDatos(res.data)
    } catch (e) {
      console.error('Error cargando dashboard', e)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDashboard()
    // Actualizar cada 30 segundos
    const intervalo = setInterval(cargarDashboard, 30000)
    return () => clearInterval(intervalo)
  }, [])

  if (cargando) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p className="text-gray-500 text-lg">Cargando dashboard...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Barra de navegación */}
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">

        <h2 className="text-2xl font-bold text-gray-800 mb-6">Panel de Control</h2>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Tarjeta
            titulo="Total Personal"
            valor={datos?.total_personal ?? 0}
            color="bg-blue-900"
            icono="👥"
          />
          <Tarjeta
            titulo="Asistencias Hoy"
            valor={datos?.asistencias_hoy ?? 0}
            color="bg-green-700"
            icono="✅"
          />
          <Tarjeta
            titulo="Retrasos Hoy"
            valor={datos?.retrasos_hoy ?? 0}
            color="bg-yellow-600"
            icono="⏰"
          />
          <Tarjeta
            titulo="Inasistencias"
            valor={datos?.inasistencias_hoy ?? 0}
            color="bg-red-700"
            icono="❌"
          />
        </div>

        {/* Últimos registros */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Últimos Registros de Hoy</h3>
            <button
              onClick={cargarDashboard}
              className="text-blue-600 hover:text-blue-800 text-sm transition"
            >
              Actualizar
            </button>
          </div>

          {datos?.ultimos_registros?.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No hay registros hoy todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Empleado</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Cédula</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Tipo</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Hora</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {datos?.ultimos_registros?.map((reg) => (
                    <tr key={reg.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{reg.empleado_nombre}</td>
                      <td className="py-3 px-4 text-gray-500">{reg.empleado_cedula}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          reg.tipo === 'entrada'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {reg.tipo_display}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{reg.hora}</td>
                      <td className="py-3 px-4">
                        {reg.es_retardo ? (
                          <span className="text-yellow-600 text-xs">⚠️ Retraso {reg.minutos_retardo} min</span>
                        ) : (
                          <span className="text-green-600 text-xs">✅ A tiempo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function Tarjeta({ titulo, valor, color, icono }) {
  return (
    <div className={`${color} text-white rounded-2xl shadow p-6`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icono}</span>
        <span className="text-4xl font-bold">{valor}</span>
      </div>
      <p className="text-white/80 text-sm mt-2">{titulo}</p>
    </div>
  )
}