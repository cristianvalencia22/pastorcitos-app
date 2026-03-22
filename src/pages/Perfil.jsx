import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Perfil({ session, perfil }) {
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [procesando, setProcesando] = useState(false)

  const cambiarContrasena = async (e) => {
    e.preventDefault()
    
    // 1. Validaciones básicas de seguridad
    if (nuevaPassword.length < 6) {
      return setMensaje('Error: La contraseña debe tener al menos 6 caracteres.')
    }
    if (nuevaPassword !== confirmarPassword) {
      return setMensaje('Error: Las contraseñas no coinciden.')
    }

    setProcesando(true)
    setMensaje('Actualizando credenciales de seguridad...')

    try {
      // 2. Llamada a la API de Supabase para actualizar la contraseña del usuario logueado
      const { error } = await supabase.auth.updateUser({
        password: nuevaPassword
      })

      if (error) throw error

      setMensaje('¡Éxito! Tu contraseña ha sido actualizada de forma segura.')
      setNuevaPassword('')
      setConfirmarPassword('')
    } catch (error) {
      setMensaje('Error al cambiar la contraseña: ' + error.message)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto pb-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Mi Perfil y Seguridad</h1>
        <p className="text-slate-500 mt-1">Gestiona tus credenciales de acceso al sistema.</p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold shadow-inner">
              {perfil?.email ? perfil.email.charAt(0).toUpperCase() : '👤'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{perfil?.email}</h2>
              <span className={`inline-block mt-1 px-3 py-1 text-xs font-bold rounded-full border ${
                perfil?.rol === 'ADMINISTRADOR' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
              }`}>
                Rol: {perfil?.rol || 'No asignado'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Cambiar Contraseña</h3>
          
          {mensaje && (
            <div className={`p-4 mb-6 rounded-lg border text-sm font-semibold ${
              mensaje.includes('Éxito') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
              mensaje.includes('Error') ? 'bg-red-50 text-red-700 border-red-200' : 
              'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {mensaje}
            </div>
          )}

          <form onSubmit={cambiarContrasena} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Nueva Contraseña</label>
              <input 
                type="password" 
                required 
                value={nuevaPassword} 
                onChange={e => setNuevaPassword(e.target.value)} 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Confirmar Nueva Contraseña</label>
              <input 
                type="password" 
                required 
                value={confirmarPassword} 
                onChange={e => setConfirmarPassword(e.target.value)} 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Repite la contraseña"
              />
            </div>
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={procesando} 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors shadow-md disabled:bg-slate-400"
              >
                {procesando ? 'Guardando...' : 'Actualizar Credenciales'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}