import { useState } from "react";
import api from "../services/api";

export default function Marcaje() {
  const [tipo, setTipo] = useState("entrada")
  const [estado, setEstado] = useState("esperando")
  const [resultado, setResultado] = useState(null)

  const iniciarMarcaje = async () => {
    setEstado("procesando")
    setResultado(null)
    try {
      const res = await api.post("/asistencia/marcar/", { tipo })
      setResultado(res.data)
      setEstado(res.data.ok ? "exito" : "error")
    } catch {
      setEstado("error")
      setResultado({ msg: "Error de conexión con el servidor." })
    }
    setTimeout(() => {
      setEstado("esperando")
      setResultado(null)
    }, 5000)
  }

  const colores = {
    esperando:  "bg-blue-900",
    procesando: "bg-yellow-600",
    exito:      "bg-green-700",
    error:      "bg-red-700",
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${colores[estado]} transition-colors duration-500`}>
      <h1 className="text-white text-3xl font-bold mb-1">UPTAIET</h1>
      <p className="text-blue-200 mb-8 text-sm">Sistema de Asistencia Biométrico — Sede Rubio</p>

      <div className="flex gap-4 mb-10">
        {["entrada", "salida"].map(t => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`px-8 py-3 rounded-lg font-semibold capitalize transition ${
              tipo === t ? "bg-white text-blue-900" : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div
        onClick={iniciarMarcaje}
        className="cursor-pointer w-52 h-52 rounded-full bg-white/10 border-4 border-white/40 flex flex-col items-center justify-center hover:bg-white/20 transition mb-8"
      >
        <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 64 64">
          <path d="M32 4C20 4 10 14 10 26c0 8 4 15 10 20v10h4v-8h16v8h4V46c6-5 10-12 10-20C54 14 44 4 32 4zm0 4c9.9 0 18 8.1 18 18S41.9 44 32 44 14 35.9 14 26 22.1 8 32 8zm0 4c-7.7 0-14 6.3-14 14s6.3 14 14 14 14-6.3 14-14S39.7 12 32 12zm0 4c5.5 0 10 4.5 10 10s-4.5 10-10 10-10-4.5-10-10 4.5-10 10-10z"/>
        </svg>
        <p className="text-white/70 text-xs mt-2">
          {estado === "procesando" ? "Leyendo..." : "Toque para marcar"}
        </p>
      </div>

      {estado === "esperando" && (
        <p className="text-white text-lg animate-pulse">Coloque su dedo en el escáner</p>
      )}
      {estado === "procesando" && (
        <p className="text-yellow-100 text-lg">Verificando huella...</p>
      )}
      {resultado && estado === "exito" && (
        <div className="text-center">
          <p className="text-white text-2xl font-bold"> {resultado.empleado}</p>
          <p className="text-green-200">{resultado.tipo} — {resultado.hora}</p>
          <p className="text-green-300 text-sm">{resultado.departamento}</p>
          {resultado.es_retardo && (
            <p className="text-yellow-300 text-sm mt-1"> Retraso de {resultado.minutos_retardo} minutos</p>
          )}
        </div>
      )}
      {resultado && estado === "error" && (
        <div className="text-center">
          <p className="text-white text-xl"> {resultado.msg}</p>
          <p className="text-red-200 text-sm">Intente nuevamente</p>
        </div>
      )}
    </div>
  )
}