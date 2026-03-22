import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './supabaseClient'

import Layout from './Layout'
import Login from './pages/Login'
import Articulos from './pages/Articulos'
import Ubicaciones from './pages/Ubicaciones'
import Proveedores from './pages/Proveedores'
import Recepciones from './pages/Recepciones'
import Despachos from './pages/Despachos'
import Usuarios from './pages/Usuarios'
import Auditoria from './pages/Auditoria'
import Inventario from './pages/Inventario'
import Consumos from './pages/Consumos'
import Kardex from './pages/Kardex'
import Perfil from './pages/Perfil'

function App() {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null) 
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let montado = true;

    async function inicializarSistema() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error;

        if (session && montado) {
          const { data } = await supabase.from('perfiles').select('*').eq('id', session.user.id).single()
          if (data) {
            setSession(session);
            setPerfil(data);
          } else {
            await supabase.auth.signOut();
          }
        }
      } catch (error) {
        console.error("Fallo de inicialización de sesión:", error)
      } finally {
        if (montado) setCargando(false)
      }
    }

    inicializarSistema()

    // Dejamos que el motor nativo de Supabase trabaje solo, sin temporizadores manuales.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, nuevaSesion) => {
      // Si el token muere, caduca, o la red lo bota, actuamos de inmediato
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESH_FAILED') {
        localStorage.clear(); // Limpiamos rastros
        window.location.href = '/'; // Recargamos para matar cualquier estado de "Cargando..."
      } 
      else if (event === 'SIGNED_IN' && nuevaSesion && montado) {
        setSession(nuevaSesion)
        const { data } = await supabase.from('perfiles').select('*').eq('id', nuevaSesion.user.id).single()
        if (data && montado) setPerfil(data)
      }
    })

    return () => {
      montado = false;
      subscription.unsubscribe();
    }
  }, [])

  if (cargando) return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500 font-bold">Autenticando sistema...</div>
  if (!session) return <Login />

  return (
    <BrowserRouter>
      <Layout session={session} perfil={perfil}>
        <Routes>
          <Route path="/" element={<Articulos session={session} />} />
          
          <Route path="/articulos" element={<Articulos session={session} />} />
          <Route path="/ubicaciones" element={<Ubicaciones />} />
          <Route path="/proveedores" element={<Proveedores />} />
          
          <Route path="/recepciones" element={<Recepciones session={session} />} />
          <Route path="/despachos" element={<Despachos session={session} />} />

          <Route path="/inventario" element={<Inventario perfil={perfil} />} />
          <Route path="/kardex" element={<Kardex perfil={perfil} />} />
          <Route path="/consumos" element={<Consumos perfil={perfil} />} />
          <Route path="/perfil" element={<Perfil session={session} perfil={perfil} />} />

          <Route path="/usuarios" element={<Usuarios perfil={perfil} />} />
          <Route path="/auditoria" element={<Auditoria perfil={perfil} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App