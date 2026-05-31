import { useState, useEffect } from 'react'
import api from '../services/api'

const TODOS_MODULOS = [
  {key: 'marcaje', label: 'Marcaje(kiosco)'},
  {key: 'dashboard', label: 'Dashboard'},
  {key: 'personal', label: 'Gestión de Personal'},
  {key: 'biometrico', label: 'Registro Biométrico'},
  {key: 'historial', label: 'Asistencia/Historial'},
  {key: 'reportes', label: 'Reportes'},
  {key: 'horarios', label: 'Horarios'},
  {key: 'incidencias', label: 'Incidencias'},
  {key: 'dispositivos', label: 'Dispositivos'},
  {key: 'configuracion','label': 'Configuración'},
]

const ROLES = [
  {value:'admin', label: 'Administrador'},
  {value:'supervisor', label: 'Supervisor'},
  {value:'operador', label: 'Operador'},
]

const COLOR_ROL = {
  admin:'bg-purple-100 text-purple-700',
  supervisor:'bg-blue-100 text-blue-700',
  operador:'bg-gray-100 text-gray-600',
}

export default function Usuarios() {
  const [usuarios,setUsuarios] = useState([])
  const [cargando,setCargando] = useState(true)
  const [mensaje,setMensaje] = useState(null)
  const [modalUsuario,setModalUsuario] = useState(false)
  const [modalPermisos,setModalPermisos] = useState(null)
  const [usuarioEdit,setUsuarioEdit] = useState(null)
  const [modulosSel,setModulosSel] = useState([])

  const formVacio = {
    username: '',
    password: '', 
    email: '',
    first_name: '', 
    last_name: '', 
    rol: 'operador'
  }
  const [form, setForm] = useState(formVacio)

  useEffect(() => { cargar() }, [])

  const cargar=async () => {
    try {
      const res = await api.get('/auth/usuarios/')
      setUsuarios(res.data)
    } catch {
      mostrarMensaje('Error al cargar usuarios.', 'error')
    } finally {
      setCargando(false)
    }
  }

  const mostrarMensaje = (texto, tipo = 'ok') => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje(null), 4000)
  }

  const abrirCrear = () => {
    setUsuarioEdit(null)
    setForm(formVacio)
    setModalUsuario(true)
  }

  const abrirEditar = (u) => {
    setUsuarioEdit(u)
    setForm({
      username: u.username,
      password: '',
      email:u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      rol: u.rol,
    })
    setModalUsuario(true)
  }

  const guardar = async () => {
    if (!form.username) {
      mostrarMensaje('El nombre de usuario es requerido.', 'error')
      return
    }
    if (!usuarioEdit && !form.password) {
      mostrarMensaje('La contraseña es requerida para nuevos usuarios.', 'error')
      return
    }
    try {
      if (usuarioEdit) {
        const datos = { ...form }
        if (!datos.password) delete datos.password
        await api.put(`/auth/usuarios/${usuarioEdit.id}/`, datos)
        mostrarMensaje('Usuario actualizado correctamente.')
      } else {
        await api.post('/auth/usuarios/', form)
        mostrarMensaje('Usuario creado correctamente.')
      }
      setModalUsuario(false)
      cargar()
    } catch (e){
      mostrarMensaje(e.response?.data?.error || 'Error al guardar.', 'error')
    }
  }

  const toggleActivo = async (u) => {
    const accion = u.is_active ? 'desactivar' : 'activar'
    if (!confirm(`¿Deseas ${accion} al usuario ${u.username}?`)) return
    try {
      await api.put(`/auth/usuarios/${u.id}/`, { activo: !u.is_active })
      mostrarMensaje(`Usuario ${accion === 'activar' ? 'activado' : 'desactivado'}.`)
      cargar()
    } catch (e) {
      mostrarMensaje(e.response?.data?.error || 'Error.', 'error')
    }
  }

  const abrirPermisos = (u) => {
    setModalPermisos(u)
    setModulosSel(u.modulos || [])
  }

  const guardarPermisos = async () => {
    try {
      await api.post(`/auth/usuarios/${modalPermisos.id}/permisos/`, {
        modulos: modulosSel
      })
      mostrarMensaje('Permisos actualizados correctamente.')
      setModalPermisos(null)
      cargar()
    } catch {
      mostrarMensaje('Error al actualizar permisos.', 'error')
    }
  }

  const toggleModulo = (key) => {
    setModulosSel(prev =>
      prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
    )
  }

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Cargando usuarios...</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Usuarios y Roles</h2>
          <p className="text-gray-400 text-sm">Gestión de accesos al sistema</p>
        </div>
        <button onClick={abrirCrear}
          className="bg-blue-900 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
          + Nuevo Usuario
        </button>
      </div>

      {mensaje && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Usuario</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Nombre</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Rol</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Módulos</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Estado</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{u.username}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600">
                  {u.first_name || u.last_name
                    ? `${u.first_name} ${u.last_name}`.trim()
                    : <span className="text-gray-300">—</span>
                  }
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${COLOR_ROL[u.rol] || 'bg-gray-100 text-gray-600'}`}>
                    {ROLES.find(r => r.value === u.rol)?.label || u.rol}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {u.rol === 'admin' ? (
                    <span className="text-xs text-purple-600 font-medium">Acceso total</span>
                  ) : u.modulos?.length > 0 ? (
                    <span className="text-xs text-blue-600">
                      {u.modulos.length} módulo{u.modulos.length !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Sin módulos</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {u.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => abrirEditar(u)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                      Editar
                    </button>
                    {u.rol !== 'admin' && (
                      <button onClick={() => abrirPermisos(u)}
                        className="text-purple-600 hover:text-purple-800 text-xs font-medium">
                        Permisos
                      </button>
                    )}
                    <button onClick={() => toggleActivo(u)}
                      className={`text-xs font-medium ${
                        u.is_active ? 'text-red-500 hover:text-red-700' : 'text-emerald-600 hover:text-emerald-800'
                      }`}>
                      {u.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar usuario */}
      {modalUsuario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              {usuarioEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
                  <input type="text" value={form.first_name}
                    onChange={e => setForm({...form, first_name: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                  <input type="text" value={form.last_name}
                    onChange={e => setForm({...form, last_name: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario *</label>
                <input type="text" value={form.username}
                  onChange={e => setForm({...form, username: e.target.value})}
                  disabled={!!usuarioEdit}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {usuarioEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
                </label>
                <input type="password" value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                <select value={form.rol}
                  onChange={e => setForm({...form, rol: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={guardar}
                className="flex-1 bg-blue-900 text-white py-2 rounded-xl text-sm font-semibold hover:bg-blue-800">
                {usuarioEdit ? 'Guardar cambios' : 'Crear usuario'}
              </button>
              <button onClick={() => setModalUsuario(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-semibold hover:bg-gray-200">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal permisos de módulos */}
      {modalPermisos && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Permisos de Módulos</h3>
            <p className="text-gray-500 text-sm mb-6">
              Usuario: <span className="font-semibold">{modalPermisos.username}</span> —
              <span className="capitalize ml-1">{modalPermisos.rol}</span>
            </p>
            <div className="space-y-2 mb-6">
              {TODOS_MODULOS.map(m => (
                <label key={m.key}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${
                    modulosSel.includes(m.key)
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-50 border border-gray-100 hover:bg-gray-100'
                  }`}>
                  <input type="checkbox"
                    checked={modulosSel.includes(m.key)}
                    onChange={() => toggleModulo(m.key)}
                    className="w-4 h-4 accent-blue-900"/>
                  <span className={`text-sm font-medium ${
                    modulosSel.includes(m.key) ? 'text-blue-900' : 'text-gray-700'
                  }`}>
                    {m.label}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={guardarPermisos}
                className="flex-1 bg-blue-900 text-white py-2 rounded-xl text-sm font-semibold hover:bg-blue-800">
                Guardar permisos
              </button>
              <button onClick={() => setModalPermisos(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-semibold hover:bg-gray-200">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}