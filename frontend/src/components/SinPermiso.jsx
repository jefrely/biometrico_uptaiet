import { useNavigate } from 'react-router-dom'

export default function SinPermiso() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">Acceso Restringido</h3>
      <p className="text-gray-500 mb-6">No tienes permiso para acceder a este módulo.</p>
      <button onClick={() => navigate('/dashboard')}
        className="bg-blue-900 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
        Volver al Dashboard
      </button>
    </div>
  )
}