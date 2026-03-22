import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [mensaje, setMensaje] = useState('Cargando personal del jardín...')
  const [editandoId, setEditandoId] = useState(null)

  useEffect(() => {
    async function cargarUsuarios() {
      try {
        // Traemos los perfiles públicos vinculados a los usuarios de Auth
        const { data, error } = await supabase
          .from('perfiles')
          .select('*')
          .order('rol', { ascending: true })

        if (error) throw error
        setUsuarios(data)
        setMensaje(`Gestión de personal: ${data.length} usuarios encontrados.`)
      } catch (error) {
        setMensaje('Error al cargar perfiles: ' + error.message)
      }
    }
    cargarUsuarios()
  }, [])

  async function cambiarRol(id, nuevoRol) {
    setMensaje('Actualizando privilegios...')
    try {
      const { error } = await supabase
        .from('perfiles')
        .update({ rol: nuevoRol })
        .eq('id', id)

      if (error) throw error

      setUsuarios(usuarios.map(u => u.id === id ? { ...u, rol: nuevoRol } : u))
      setMensaje('Rol actualizado correctamente.')
      setEditandoId(null)
    } catch (error) {
      setMensaje('Error al cambiar rol: ' + error.message)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Gestión de Usuarios</h1>
        <p className="text-slate-500 mt-2">Administra los roles y accesos del personal de Pastorcitos.</p>
      </header>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-8 shadow-sm">
        <strong>Estado:</strong> {mensaje}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
              <th className="p-4">Usuario / Email</th>
              <th className="p-4 text-center">Rol Actual</th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="font-medium text-slate-800">{user.email}</div>
                  <div className="text-xs text-slate-400">ID: {user.id.split('-')[0]}...</div>
                </td>
                <td className="p-4 text-center">
                  {editandoId === user.id ? (
                    <select 
                      value={user.rol} 
                      onChange={(e) => cambiarRol(user.id, e.target.value)}
                      className="text-sm border border-slate-300 rounded px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                      <option value="AUXILIAR">AUXILIAR</option>
                    </select>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      user.rol === 'ADMINISTRADOR' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {user.rol}
                    </span>
                  )}
                </td>
                <td className="p-4 text-center">
                  <button 
                    onClick={() => setEditandoId(editandoId === user.id ? null : user.id)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-semibold underline underline-offset-4"
                  >
                    {editandoId === user.id ? 'Cancelar' : 'Cambiar Rol'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-xl">
        <h4 className="text-amber-800 font-bold flex items-center gap-2 mb-2">
          <span>⚠️</span> Nota para el Administrador
        </h4>
        <p className="text-amber-700 text-sm leading-relaxed">
          Para agregar un nuevo usuario, primero debes crearlo en el panel de <strong>Autenticación de Supabase</strong>. 
          Una vez creado, el sistema le asignará el rol de "AUXILIAR" por defecto y aparecerá en esta lista para que puedas elevar sus privilegios si es necesario.
        </p>
      </div>
    </div>
  )
}