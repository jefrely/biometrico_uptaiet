import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'

const DEDOS_MANO = {
  derecha:   [1,2,3,4,5],
  izquierda: [6,7,8,9,10],
}
const NOMBRE_DEDO = {
  1:'Pulgar',2:'Índice',3:'Medio',4:'Anular',5:'Meñique',
  6:'Pulgar',7:'Índice',8:'Medio',9:'Anular',10:'Meñique',
}

export default function PerfilEmpleado() {
  const { empleadoId } = useParams()
  const navigate = useNavigate()
  const [perfil,setPerfil] = useState(null)
  const [cargando,setCargando] = useState(true)
  const [error,setError] = useState(null)

  useEffect(() => {
    api.get(`/personal/perfil/${empleadoId}/`)
      .then(res =>setPerfil(res.data))
      .catch(() =>setError('No se pudo cargar el perfil.'))
      .finally(() =>setCargando(false))
  }, [empleadoId])

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Cargando perfil...</p>
    </div>
  )

  if (error) return (
    <div className="text-center py-20">
      <p className="text-red-500">{error}</p>
      <button onClick={() => navigate('/personal')} className="mt-4 text-blue-600">← Volver</button>
    </div>
  )

  const huellasPorDedo = {}
  perfil.huellas.forEach(h => { huellasPorDedo[h.numero_dedo] = h })

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/personal')}
          className="p-2 hover:bg-gray-100 rounded-xl transition">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Perfil del Empleado</h2>
          <p className="text-gray-400 text-sm">Información completa y estadísticas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Columna izquierda — info personal */}
        <div className="space-y-4">

          {/* Foto y datos básicos */}
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden bg-blue-100 flex items-center justify-center">
              {perfil.foto ? (
                <img src={perfil.foto} alt={perfil.nombre_completo} className="w-full h-full object-cover"/>
              ) : (
                <span className="text-blue-900 font-black text-3xl">
                  {perfil.nombres.charAt(0)}{perfil.apellidos.charAt(0)}
                </span>
              )}
            </div>
            <h3 className="font-black text-gray-800 text-xl">{perfil.nombre_completo}</h3>
            <p className="text-gray-400 text-sm mb-3">{perfil.cedula}</p>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              perfil.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {perfil.activo ? 'Activo' : 'Inactivo'}
            </span>
            <div className="mt-4 flex gap-2 justify-center">
              <button onClick={() => navigate(`/huellas/${perfil.id}`)}
                className="px-3 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-800">
                Gestionar Huellas
              </button>
              <button onClick={() => navigate(`/horarios`)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200">
                Ver Horario
              </button>
            </div>
          </div>

          {/* Datos de contacto */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h4 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">Información</h4>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Cargo',valor: perfil.cargo },
                { label: 'Departamento',valor: perfil.departamento },
                { label: 'Tipo',valor: perfil.tipo_display || perfil.tipo, capitalize: true },
                { label: 'Email',valor: perfil.email },
                { label: 'Teléfono',valor: perfil.telefono || '—' },
                { label: 'Fecha ingreso',valor: perfil.fecha_ingreso },
              ].map(item => (
                <div key={item.label} className="flex justify-between gap-2">
                  <span className="text-gray-400 flex-shrink-0">{item.label}</span>
                  <span className={`text-gray-700 font-medium text-right ${item.capitalize ? 'capitalize' : ''}`}>
                    {item.valor}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Horario */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h4 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">Horario Asignado</h4>
            {perfil.horarios.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Sin horario asignado</p>
            ) : (
              <div className="space-y-2">
                {perfil.horarios.map(h => (
                  <div key={h.dia} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 w-24">{h.dia_label}</span>
                    <span className="font-medium text-gray-700">
                      {h.hora_entrada} — {h.hora_salida}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha */}
        <div className="lg:col-span-2 space-y-4">

          {/* Estadísticas del mes */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h4 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">
              Estadísticas del Mes
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center bg-blue-50 rounded-xl p-4">
                <p className="text-3xl font-black text-blue-900">{perfil.estadisticas.indice}%</p>
                <p className="text-xs text-blue-600 mt-1">Índice general</p>
              </div>
              <div className="text-center bg-emerald-50 rounded-xl p-4">
                <p className="text-3xl font-black text-emerald-700">{perfil.estadisticas.presentes}</p>
                <p className="text-xs text-emerald-600 mt-1">Días presentes</p>
              </div>
              <div className="text-center bg-red-50 rounded-xl p-4">
                <p className="text-3xl font-black text-red-700">{perfil.estadisticas.ausentes}</p>
                <p className="text-xs text-red-600 mt-1">Días ausentes</p>
              </div>
              <div className="text-center bg-amber-50 rounded-xl p-4">
                <p className="text-3xl font-black text-amber-700">{perfil.estadisticas.retrasos}</p>
                <p className="text-xs text-amber-600 mt-1">Retrasos</p>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-blue-900 h-3 rounded-full transition-all"
                style={{width: `${Math.min(perfil.estadisticas.indice, 100)}%`}}/>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {perfil.estadisticas.dias} días procesados en el mes actual
            </p>
          </div>

          {/* Huellas registradas */}
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Huellas Digitales</h4>
              <span className="text-xs text-gray-400">
                {perfil.huellas.length} de 10 dedos registrados
              </span>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {['derecha','izquierda'].map(mano => (
                <div key={mano}>
                  <p className="text-xs font-semibold text-gray-500 mb-3 text-center capitalize">
                    Mano {mano}
                  </p>
                  <div className="space-y-2">
                    {DEDOS_MANO[mano].map(num => {
                      const h = huellasPorDedo[num]
                      return (
                        <div key={num} className={`flex items-center gap-3 p-2 rounded-lg ${
                          h ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-100'
                        }`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            h ? 'bg-emerald-500 text-white' : 'bg-gray-300 text-gray-500'
                          }`}>
                            {num}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700">{NOMBRE_DEDO[num]}</p>
                            {h ? (
                              <p className="text-xs text-emerald-600">Cal. {h.calidad}/100 · {h.fecha}</p>
                            ) : (
                              <p className="text-xs text-gray-400">Sin registrar</p>
                            )}
                          </div>
                          {h && <span className="text-emerald-500 text-xs">✓</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Últimos registros */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h4 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">
              Últimos Registros
            </h4>
            {perfil.ultimos_registros.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Sin registros aún</p>
            ) : (
              <div className="space-y-2">
                {perfil.ultimos_registros.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        r.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {r.tipo}
                      </span>
                      <span className="text-gray-500 text-xs">{r.fecha}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-700 text-xs">{r.hora}</span>
                      {r.es_retardo && <span className="text-amber-500 text-xs">⚠️</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}