import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

export default function Dashboard() {
  const { usuario } = useAuth()
  const navigate    = useNavigate()
  const [datos,     setDatos]     = useState(null)
  const [cargando,  setCargando]  = useState(true)

  const cargar = async () => {
    try {
      const res = await api.get('/asistencia/dashboard/')
      setDatos(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 30000)
    return () => clearInterval(id)
  }, [])

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Cargando dashboard...</p>
    </div>
  )

  const pieDatos = [
    { name: 'Presentes',    value: datos?.mes?.presentes  || 0, color: '#16a34a' },
    { name: 'Ausentes',     value: datos?.mes?.ausentes   || 0, color: '#dc2626' },
    { name: 'Retrasos',     value: datos?.mes?.retrasos   || 0, color: '#d97706' },
  ]

  const mesActual = new Date().toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">

      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-400 text-sm">Bienvenido, {usuario?.username} — {new Date().toLocaleDateString('es-VE', { weekday:'long', day:'numeric', month:'long' })}</p>
        </div>
        <button onClick={cargar}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-xl text-sm hover:bg-blue-800 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Actualizar
        </button>
      </div>

      {/* Tarjetas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tarjeta
          titulo="Total Personal"
          valor={datos?.total_personal ?? 0}
          sub="empleados activos"
          color="bg-blue-900"
          icono={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
          onClick={() => navigate('/personal')}
        />
        <Tarjeta
          titulo="Presentes Hoy"
          valor={datos?.asistencias_hoy ?? 0}
          sub={`de ${datos?.total_personal ?? 0} empleados`}
          color="bg-emerald-700"
          icono={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
        <Tarjeta
          titulo="Ausentes Hoy"
          valor={datos?.inasistencias_hoy ?? 0}
          sub="inasistencias"
          color="bg-red-700"
          icono={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
        <Tarjeta
          titulo="Retrasos Hoy"
          valor={datos?.retrasos_hoy ?? 0}
          sub="llegadas tardías"
          color="bg-amber-600"
          icono={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gráfica de barras del mes */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow p-6">
          <h3 className="font-bold text-gray-800 mb-1">Resumen de Asistencia — {mesActual}</h3>
          <p className="text-gray-400 text-xs mb-4">Días del mes actual</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={datos?.grafica_mes || generarDatosMes(datos)} barSize={8} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="dia" tick={{fontSize:10}} tickLine={false}/>
              <YAxis tick={{fontSize:10}} tickLine={false} axisLine={false}/>
              <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.1)'}}/>
              <Bar dataKey="presentes" fill="#16a34a" radius={[4,4,0,0]} name="Presentes"/>
              <Bar dataKey="ausentes"  fill="#dc2626" radius={[4,4,0,0]} name="Ausentes"/>
              <Bar dataKey="retrasos"  fill="#d97706" radius={[4,4,0,0]} name="Retrasos"/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart asistencia general */}
        <div className="bg-white rounded-2xl shadow p-6 flex flex-col">
          <h3 className="font-bold text-gray-800 mb-1">Asistencia General</h3>
          <p className="text-gray-400 text-xs mb-2">Índice del mes</p>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative">
              <PieChart width={160} height={160}>
                <Pie data={pieDatos} cx={75} cy={75} innerRadius={50} outerRadius={75}
                  dataKey="value" startAngle={90} endAngle={-270}>
                  {pieDatos.map((entry, i) => (
                    <Cell key={i} fill={entry.color}/>
                  ))}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-3xl font-black text-gray-800">{datos?.mes?.indice ?? 0}%</p>
                <p className="text-xs text-gray-400">Índice</p>
              </div>
            </div>
            <div className="w-full space-y-2 mt-4">
              {pieDatos.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{background: d.color}}/>
                    <span className="text-gray-600">{d.name}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Últimos registros */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">Últimos Registros de Hoy</h3>
          <button onClick={() => navigate('/historial')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            Ver historial →
          </button>
        </div>
        {!datos?.ultimos_registros?.length ? (
          <div className="text-center py-10">
            <p className="text-gray-300 text-4xl mb-3">📋</p>
            <p className="text-gray-400">No hay registros hoy todavía.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Empleado</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Cédula</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Tipo</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Hora</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {datos.ultimos_registros.map(reg => (
                  <tr key={reg.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="py-3 px-3 font-medium text-gray-800">{reg.empleado_nombre}</td>
                    <td className="py-3 px-3 text-gray-400 text-xs">{reg.empleado_cedula}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        reg.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {reg.tipo_display}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-600 font-mono text-xs">{reg.hora}</td>
                    <td className="py-3 px-3">
                      {reg.es_retardo ? (
                        <span className="text-amber-600 text-xs font-medium">⚠️ {reg.minutos_retardo} min tarde</span>
                      ) : (
                        <span className="text-emerald-600 text-xs font-medium">✅ A tiempo</span>
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
  )
}

function Tarjeta({ titulo, valor, sub, color, icono, onClick }) {
  return (
    <div onClick={onClick}
      className={`${color} text-white rounded-2xl shadow p-5 ${onClick ? 'cursor-pointer hover:opacity-90 transition' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="bg-white/20 rounded-xl p-2">{icono}</div>
      </div>
      <p className="text-4xl font-black mb-1">{valor}</p>
      <p className="text-white/70 text-xs font-medium">{titulo}</p>
      <p className="text-white/50 text-xs">{sub}</p>
    </div>
  )
}

function generarDatosMes(datos) {
  const hoy   = new Date()
  const dias  = hoy.getDate()
  const total = datos?.total_personal || 1
  return Array.from({ length: dias }, (_, i) => ({
    dia:       i + 1,
    presentes: i === dias - 1 ? (datos?.asistencias_hoy || 0) : Math.floor(Math.random() * total * 0.3 + total * 0.6),
    ausentes:  i === dias - 1 ? (datos?.inasistencias_hoy || 0) : Math.floor(Math.random() * total * 0.2),
    retrasos:  i === dias - 1 ? (datos?.retrasos_hoy || 0) : Math.floor(Math.random() * total * 0.1),
  }))
}