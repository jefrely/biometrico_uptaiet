import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login           from './pages/Login'
import Marcaje         from './pages/Marcaje'
import Dashboard       from './pages/Dashboard'
import Personal        from './pages/Personal'
import Reportes        from './pages/Reportes'
import RegistroHuellas from './pages/RegistroHuellas'
import Horarios from './pages/Horarios'

function RutaProtegida({ children }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return (
    <div className="min-h-screen bg-blue-900 flex items-center justify-center">
      <p className="text-white">Cargando...</p>
    </div>
  )
  return usuario ? children : <Navigate to="/login" />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"   element={<Login />} />
          <Route path="/marcaje" element={<Marcaje />} />
          <Route path="/dashboard" element={
            <RutaProtegida><Dashboard /></RutaProtegida>
          }/>
          <Route path="/personal" element={
            <RutaProtegida><Personal /></RutaProtegida>
          }/>
          <Route path="/reportes" element={
            <RutaProtegida><Reportes /></RutaProtegida>
          }/>
          <Route path="/huellas/:empleadoId" element={
            <RutaProtegida><RegistroHuellas /></RutaProtegida>
          }/>
          <Route path="/horarios" element={
            <RutaProtegida><Horarios /></RutaProtegida>
          }/>
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App