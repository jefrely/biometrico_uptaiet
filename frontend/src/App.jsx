import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Marcaje from './pages/Marcaje'
import Dashboard from './pages/Dashboard'
import Personal from './pages/Personal'
import Reportes from './pages/Reportes'
import Horarios from './pages/Horarios'
import Incidencias from './pages/Incidencias'
import Historial from './pages/Historial'
import RegistroHuellas from './pages/RegistroHuellas'
import PerfilEmpleado from './pages/PerfilEmpleado'
import Usuarios from './pages/Usuarios'
import SinPermiso from './components/SinPermiso'

function RutaProtegida({ children }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return (
    <div className="min-h-screen bg-blue-950 flex items-center justify-center">
      <p className="text-white text-sm">Cargando...</p>
    </div>
  )
  return usuario
    ? <Layout>{children}</Layout>
    : <Navigate to="/login" />
}


function RutaConPermiso({ children, modulo }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" />
  if (usuario.rol === 'admin' || usuario.rol === 'supervisor') return children
  if ((usuario.modulos || []).includes(modulo)) return children
  return <Layout><SinPermiso /></Layout>
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/marcaje" element={<Marcaje />} />
          <Route path="/dashboard" element={<RutaProtegida><Dashboard /></RutaProtegida>} />
          <Route path="/personal" element={<RutaProtegida><RutaConPermiso modulo="personal"><Personal /></RutaConPermiso></RutaProtegida>} />
          <Route path="/huellas/:empleadoId" element={<RutaProtegida><RegistroHuellas /></RutaProtegida>} />
          <Route path="/historial" element={<RutaProtegida><RutaConPermiso modulo="historial"><Historial /></RutaConPermiso></RutaProtegida>} />
          <Route path="/reportes" element={<RutaProtegida><RutaConPermiso modulo="reportes"><Reportes /></RutaConPermiso></RutaProtegida>} />
          <Route path="/horarios" element={<RutaProtegida><RutaConPermiso modulo="horarios"><Horarios /></RutaConPermiso></RutaProtegida>} />
          <Route path="/incidencias" element={<RutaProtegida><RutaConPermiso modulo="incidencias"><Incidencias /></RutaConPermiso></RutaProtegida>} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
          <Route path="/perfil/:empleadoId" element={<RutaProtegida><PerfilEmpleado /></RutaProtegida>}/>
          <Route path="/usuarios" element={<RutaProtegida><RutaConPermiso modulo="usuarios"><Usuarios /></RutaConPermiso></RutaProtegida>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App