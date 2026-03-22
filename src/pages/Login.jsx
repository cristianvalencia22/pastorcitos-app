import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMensaje, setErrorMensaje] = useState(null)

  async function manejarLogin(e) {
    e.preventDefault()
    setLoading(true)
    setErrorMensaje(null)

    try {
      // Petición de autenticación a Supabase
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (error) throw error
      // Si el login es exitoso, Supabase guarda el Token automáticamente.
      // No necesitamos redirigir manualmente aquí, App.jsx lo detectará.

    } catch (error) {
      setErrorMensaje(error.message === 'Invalid login credentials' 
        ? 'Correo o contraseña incorrectos.' 
        : error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* Cabecera del Login */}
        <div className="bg-slate-900 px-6 py-8 text-center">
          <h1 className="text-2xl font-bold text-blue-400 tracking-wider mb-1">LOS PASTORCITOS</h1>
          <p className="text-slate-400 text-sm">Sistema de Gestión de Inventarios</p>
        </div>

        {/* Formulario */}
        <div className="p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">Iniciar Sesión</h2>
          
          {errorMensaje && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm text-center">
              {errorMensaje}
            </div>
          )}

          <form onSubmit={manejarLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="usuario@pastorcitos.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors mt-2"
            >
              {loading ? 'Verificando credenciales...' : 'Ingresar al Sistema'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}