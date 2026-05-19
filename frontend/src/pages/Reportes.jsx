import { useState } from 'react'
import api from '../services/api'
import Navbar from '../components/Navbar'

export default function Reportes() {
  const [descargando, setDescargando] = useState(null)

  const descargar = async (url, nombre, tipo) => {
    setDescargando(nombre)
    try {
      const res = await api.get(url, { responseType: 'blob' })
      const blob = new Blob([res.data], {
        type: tipo === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const link = document.createElement('a')
      link.href  = URL.createObjectURL(blob)
      link.download = nombre
      link.click()
      URL.revokeObjectURL(link.href)
    } catch {
      alert('Error al generar el reporte. Intente de nuevo.')
    } finally {
      setDescargando(null)
    }
  }

  const reportes = [
    {
      titulo:      'Reporte Diario',
      descripcion: 'Asistencia del dia de hoy',
      icono:       '📅',
      color:       'blue',
      acciones: [
        { label: 'PDF',   url: '/reportes/pdf/diario/',   nombre: 'asistencia_diaria.pdf',  tipo: 'pdf'   },
        { label: 'Excel', url: '/reportes/excel/diario/', nombre: 'asistencia_diaria.xlsx', tipo: 'excel' },
      ]
    },
    {
      titulo:      'Reporte Semanal',
      descripcion: 'Asistencia de la semana actual (lunes a hoy)',
      icono:       '📆',
      color:       'green',
      acciones: [
        { label: 'PDF',   url: '/reportes/pdf/semanal/',   nombre: 'asistencia_semanal.pdf',  tipo: 'pdf'   },
        { label: 'Excel', url: '/reportes/excel/semanal/', nombre: 'asistencia_semanal.xlsx', tipo: 'excel' },
      ]
    },
    {
      titulo:      'Reporte Mensual',
      descripcion: 'Asistencia del mes actual completo',
      icono:       '🗓️',
      color:       'purple',
      acciones: [
        { label: 'PDF',   url: '/reportes/pdf/mensual/',   nombre: 'asistencia_mensual.pdf',  tipo: 'pdf'   },
        { label: 'Excel', url: '/reportes/excel/mensual/', nombre: 'asistencia_mensual.xlsx', tipo: 'excel' },
      ]
    },
  ]

  const colores = {
    blue:   { card: 'border-blue-200 bg-blue-50',   icono: 'bg-blue-100',   btn: 'bg-blue-700 hover:bg-blue-800'   },
    green:  { card: 'border-green-200 bg-green-50', icono: 'bg-green-100',  btn: 'bg-green-700 hover:bg-green-800' },
    purple: { card: 'border-purple-200 bg-purple-50',icono:'bg-purple-100', btn: 'bg-purple-700 hover:bg-purple-800'},
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra superior */}
      <Navbar />

      <div className="max-w-4xl mx-auto p-6">
        <p className="text-gray-600 mb-6">
          Selecciona el tipo de reporte y el formato de descarga.
          Los reportes incluyen: nombre del empleado, cedula, departamento,
          hora de entrada, hora de salida y estado (a tiempo / retraso).
        </p>

        <div className="grid gap-6">
          {reportes.map((r) => {
            const c = colores[r.color]
            return (
              <div key={r.titulo} className={`border-2 rounded-xl p-6 ${c.card}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${c.icono}`}>
                    {r.icono}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-800">{r.titulo}</h2>
                    <p className="text-gray-500 text-sm mb-4">{r.descripcion}</p>
                    <div className="flex gap-3">
                      {r.acciones.map((a) => (
                        <button
                          key={a.label}
                          onClick={() => descargar(a.url, a.nombre, a.tipo)}
                          disabled={descargando === a.nombre}
                          className={`px-5 py-2 rounded-lg text-white font-semibold text-sm transition ${c.btn} disabled:opacity-50`}
                        >
                          {descargando === a.nombre
                            ? 'Generando...'
                            : `Descargar ${a.label}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Info adicional */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-2">Contenido de los reportes</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>✅ Nombre completo del empleado</li>
            <li>✅ Cedula de identidad</li>
            <li>✅ Departamento</li>
            <li>✅ Tipo (docente, obrero, administrativo)</li>
            <li>✅ Hora de entrada y salida</li>
            <li>✅ Estado (a tiempo o retraso con minutos)</li>
            <li>✅ Totales y resumen al final</li>
          </ul>
        </div>
      </div>
    </div>
  )
}