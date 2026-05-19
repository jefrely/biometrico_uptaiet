import { useEffect, useState } from "react";
import {useParams, useNavigate} from "react-router-dom"
import api from "../services/api"

const DEDOS =[
    {num: 1, nombre: "Pulgar derecho",  mano: "derecha", pos: 0},
    {num: 2, nombre: "Indice derecho",  mano: "derecha", pos: 1},
    {num: 3, nombre: "Medio derecho",  mano: "derecha", pos: 2},
    {num: 4, nombre: "Anular derecho",  mano: "derecha", pos: 3},
    {num: 5, nombre: "Meñique derecho",  mano: "derecha", pos: 4},
    {num: 6, nombre: "Pulgar izquierdo",  mano: "izquierda", pos: 0},
    {num: 7, nombre: "Indice izquierdo",  mano: "izquierda", pos: 1},
    {num: 8, nombre: "Medio izquierdo",  mano: "izquierda", pos: 2},
    {num: 9, nombre: "Anular izquierdo",  mano: "izquierda", pos: 3},
    {num: 10, nombre: "Meñique izquierdo",  mano: "izquierda", pos: 4},
]

export default function RegistroHuellas() {
  const { empleadoId }= useParams()
  const navigate= useNavigate()

  const [empleado, setEmpleado]= useState(null)
  const [dedos, setDedos]= useState([])
  const [dedoActivo, setDedoActivo]= useState(null)
  const [estado, setEstado]= useState('idle') // idle | capturando | exito | error
  const [mensaje, setMensaje]= useState('')
  const [cargando, setCargando]= useState(true)


useEffect (() =>{
    cargarDatos()
}, [empleadoId])

const cargarDatos = async () => {
    try {
      setCargando(true)
      const [empRes, huellasRes] = await Promise.all([
        api.get(`/personal/empleados/${empleadoId}/`),
        api.get(`/asistencia/huellas/${empleadoId}/`)
      ])
      setEmpleado(empRes.data)
      setDedos(huellasRes.data.dedos)
    } catch {
      setMensaje("Error al cargar los datos del empleado.")
    } finally {
      setCargando(false)
    }
  }

  const registrarHuella = async (numeroDedo) => {
  setDedoActivo(numeroDedo)
  setEstado('capturando')
  setMensaje('Iniciando escáner...')

  try {
    const token    = localStorage.getItem('access_token')
    const response = await fetch('/api/asistencia/registrar-huella/', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        empleado_id: parseInt(empleadoId),
        numero_dedo: numeroDedo
      })
    })

    const reader  = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const texto = decoder.decode(value)
      const lineas = texto.split('\n')

      for (const linea of lineas) {
        if (!linea.startsWith('data:')) continue
        try {
          const data = JSON.parse(linea.replace('data: ', ''))

          if (data.tipo === 'instruccion') {
            setMensaje(data.msg)
            setEstado('capturando')
          } else if (data.tipo === 'captura_ok') {
            setMensaje(data.msg)
            setEstado('capturando')
          } else if (data.tipo === 'exito') {
            setMensaje(data.msg)
            setEstado('exito')
            await cargarDatos()
          } else if (data.tipo === 'error') {
            setMensaje(data.msg)
            setEstado('error')
          }
        } catch {}
      }
    }
  } catch {
    setEstado('error')
    setMensaje('Error de conexión con el servidor.')
  } finally {
    setTimeout(() => {
      setEstado('idle')
      setDedoActivo(null)
      setMensaje('')
    }, 4000)
  }
}

  const eliminarHuella = async (numeroDedo) => {
    if (!confirm("Eliminar esta huella?")) return
    try {
      await api.delete(`/asistencia/huellas/${empleadoId}/`, {
        data: { numero_dedo: numeroDedo }
      })
      await cargarDatos()
    } catch {
      alert('Error al eliminar la huella.')
    }
  }

  const dedo_info = (num) => dedos.find(d => d.numero === num) || {}

  if (cargando) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p className="text-gray-500">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Registro de Huellas Digitales</h1>
          {empleado && (
            <p className="text-blue-200 text-sm">
              {empleado.nombre_completo} — {empleado.cedula} — {empleado.tipo}
            </p>
          )}
        </div>
        <button onClick={() => navigate('/personal')}
          className="text-blue-200 hover:text-white text-sm">
          ← Volver a Personal
        </button>
      </div>

      {/* Mensaje de estado */}
      {mensaje && (
        <div className={`mx-6 mt-4 p-4 rounded-lg text-white font-medium ${
          estado === "exito"     ? "bg-green-600":
          estado === "error"     ? "bg-red-600":
          estado === "capturando"? "bg-yellow-600": "bg-blue-600"
        }`}>
          {estado === "capturando" && (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 align-middle"/>
          )}
          {mensaje}
        </div>
      )}

      <div className="max-w-5xl mx-auto p-6">
        {/* Resumen */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-900">
              {dedos.filter(d => d.registrado).length}
            </p>
            <p className="text-xs text-gray-500">Huellas registradas</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-400">
              {dedos.filter(d => !d.registrado).length}
            </p>
            <p className="text-xs text-gray-500">Pendientes</p>
          </div>
          <div className="flex-1 ml-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${(dedos.filter(d => d.registrado).length / 10) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {dedos.filter(d => d.registrado).length} de 10 dedos registrados
            </p>
          </div>
        </div>

        {/* Manos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {['derecha', 'izquierda'].map(mano => (
            <div key={mano} className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-700 mb-4 text-center capitalize">
                Mano {mano}
              </h2>
              <div className="space-y-3">
                {DEDOS.filter(d => d.mano === mano).map(dedo => {
                  const info= dedo_info(dedo.num)
                  const registrado= info.registrado
                  const activo= dedoActivo === dedo.num

                  return (
                    <div key={dedo.num}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition ${
                        activo      ? 'border-yellow-400 bg-yellow-50' :
                        registrado  ? 'border-green-300 bg-green-50'  :
                                      'border-gray-200 bg-gray-50'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          registrado ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {dedo.num}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{dedo.nombre}</p>
                          {registrado && (
                            <p className="text-xs text-green-600">
                              Calidad {info.calidad}/100 — {info.fecha}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {registrado && (
                          <button
                            onClick={() => eliminarHuella(dedo.num)}
                            disabled={estado === 'capturando'}
                            className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        )}
                        <button
                          onClick={() => registrarHuella(dedo.num)}
                          disabled={estado === 'capturando'}
                          className={`px-3 py-1 text-xs rounded font-semibold text-white disabled:opacity-50 transition ${
                            registrado
                              ? 'bg-blue-500 hover:bg-blue-600'
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {activo ? 'Capturando...' : registrado ? 'Actualizar' : 'Registrar'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Instrucciones */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Instrucciones</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>1. Haga clic en <strong>Registrar</strong> en el dedo que desea capturar</li>
            <li>2. Coloque el dedo en el escaner ZK9500 cuando el sistema lo indique</li>
            <li>3. El sistema capturara el dedo <strong>3 veces</strong> para mayor precision</li>
            <li>4. Retire y vuelva a colocar el dedo entre cada captura</li>
            <li>5. Se recomienda registrar minimo el pulgar e indice de cada mano</li>
          </ul>
        </div>
      </div>
    </div>
  )
}