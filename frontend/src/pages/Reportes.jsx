import { useState } from 'react'
import api from '../services/api'

export default function Reportes() {
  const hoy= new Date()
  const hoyStr= hoy.toISOString().split('T')[0]

  const [descargando,setDescargando] = useState(null)

  // Selectores por tipo
  const [fechaDia,setFechaDia] = useState(hoyStr)
  const [fechaSem,setFechaSem] = useState(hoyStr)
  const [mesAnio,setMesAnio] = useState({
    mes:  hoy.getMonth() + 1,
    anio: hoy.getFullYear()
  })

  const MESES = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ]

  const anios = Array.from({ length: 5 }, (_, i) => hoy.getFullYear() - i)

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
      link.href = URL.createObjectURL(blob)
      link.download = nombre
      link.click()
      URL.revokeObjectURL(link.href)
    } catch {
      alert('Error al generar el reporte.')
    } finally {
      setDescargando(null)
    }
  }

  const btnClass = (nombre, color) =>
    `px-4 py-2 rounded-lg text-white text-sm font-semibold transition disabled:opacity-50 ${color} hover:opacity-90`

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Reportes de Asistencia</h2>
        <p className="text-gray-400 text-sm">Selecciona el período y descarga en PDF o Excel</p>
      </div>

      {/* ── Reporte Diario ── */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">📅</div>
          <div>
            <h3 className="font-bold text-gray-800">Reporte Diario</h3>
            <p className="text-gray-400 text-xs">Asistencia de un día específico</p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Seleccionar día</label>
            <input type="date" value={fechaDia} max={hoyStr}
              onChange={e => setFechaDia(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              disabled={descargando === 'diario.pdf'}
              onClick={() => descargar(`/reportes/pdf/diario/?fecha=${fechaDia}`, `diario_${fechaDia}.pdf`, 'pdf')}
              className={btnClass('diario.pdf', 'bg-red-600')}>
              {descargando === 'diario.pdf' ? 'Generando...' : 'PDF'}
            </button>
            <button
              disabled={descargando === 'diario.xlsx'}
              onClick={() => descargar(`/reportes/excel/diario/?fecha=${fechaDia}`, `diario_${fechaDia}.xlsx`, 'excel')}
              className={btnClass('diario.xlsx', 'bg-emerald-600')}>
              {descargando === 'diario.xlsx' ? 'Generando...' : 'Excel'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Reporte Semanal ── */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl">📆</div>
          <div>
            <h3 className="font-bold text-gray-800">Reporte Semanal</h3>
            <p className="text-gray-400 text-xs">Selecciona cualquier día de la semana que quieres descargar</p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cualquier día de esa semana</label>
            <input type="date" value={fechaSem} max={hoyStr}
              onChange={e => setFechaSem(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              disabled={descargando === 'semanal.pdf'}
              onClick={() => descargar(`/reportes/pdf/semanal/?fecha=${fechaSem}`, `semanal_${fechaSem}.pdf`, 'pdf')}
              className={btnClass('semanal.pdf', 'bg-red-600')}>
              {descargando === 'semanal.pdf' ? 'Generando...' : 'PDF'}
            </button>
            <button
              disabled={descargando === 'semanal.xlsx'}
              onClick={() => descargar(`/reportes/excel/semanal/?fecha=${fechaSem}`, `semanal_${fechaSem}.xlsx`, 'excel')}
              className={btnClass('semanal.xlsx', 'bg-emerald-600')}>
              {descargando === 'semanal.xlsx' ? 'Generando...' : 'Excel'}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          El reporte incluye desde el lunes hasta el domingo de la semana seleccionada.
        </p>
      </div>

      {/* ── Reporte Mensual ── */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl">🗓️</div>
          <div>
            <h3 className="font-bold text-gray-800">Reporte Mensual</h3>
            <p className="text-gray-400 text-xs">Asistencia completa de un mes</p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Mes</label>
            <select value={mesAnio.mes}
              onChange={e => setMesAnio({...mesAnio, mes: parseInt(e.target.value)})}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {MESES.map((m, i) => (
                <option key={i+1} value={i+1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Año</label>
            <select value={mesAnio.anio}
              onChange={e => setMesAnio({...mesAnio, anio: parseInt(e.target.value)})}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {anios.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              disabled={descargando === 'mensual.pdf'}
              onClick={() => descargar(
                `/reportes/pdf/mensual/?mes=${mesAnio.mes}&anio=${mesAnio.anio}`,
                `mensual_${mesAnio.mes}_${mesAnio.anio}.pdf`, 'pdf'
              )}
              className={btnClass('mensual.pdf', 'bg-red-600')}>
              {descargando === 'mensual.pdf' ? 'Generando...' : 'PDF'}
            </button>
            <button
              disabled={descargando === 'mensual.xlsx'}
              onClick={() => descargar(
                `/reportes/excel/mensual/?mes=${mesAnio.mes}&anio=${mesAnio.anio}`,
                `mensual_${mesAnio.mes}_${mesAnio.anio}.xlsx`, 'excel'
              )}
              className={btnClass('mensual.xlsx', 'bg-emerald-600')}>
              {descargando === 'mensual.xlsx' ? 'Generando...' : 'Excel'}
            </button>
          </div>
        </div>
      </div>

      {/* Contenido de los reportes */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h3 className="font-semibold text-blue-800 mb-2">Contenido de los reportes</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>✅ Nombre completo del empleado</li>
          <li>✅ Cédula de identidad</li>
          <li>✅ Departamento y tipo</li>
          <li>✅ Hora de entrada y salida (hora local Venezuela)</li>
          <li>✅ Estado: A tiempo o Retraso con minutos</li>
          <li>✅ Totales al final del reporte</li>
        </ul>
      </div>
    </div>
  )
}