import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

function Layout({ children, session, perfil }) {
  const location = useLocation();
  const navigate = useNavigate(); // <-- Instanciamos el navegador

  // <-- DECLARAMOS LA FUNCIÓN QUE FALTABA -->
  const cerrarSesionLimpiamente = async () => {
    await supabase.auth.signOut();
    navigate('/');
    window.location.reload(); 
  };

  const isActive = (ruta) => {
    return location.pathname === ruta || (ruta === '/articulos' && location.pathname === '/');
  };

  const enlaceClases = (ruta) => `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${
    isActive(ruta) ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
  }`;

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl flex-shrink-0">
        
        {/* LOGO */}
        <div className="h-20 flex items-center justify-center border-b border-slate-800 bg-slate-950">
          <div className="text-xl font-bold tracking-wider text-blue-400">
            LOS PASTORCITOS
          </div>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* Sección: Maestros */}
          <div>
            <h3 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Catálogos</h3>
            <div className="space-y-1">
              <Link to="/articulos" className={enlaceClases('/articulos')}><span>📦</span> Artículos</Link>
              <Link to="/ubicaciones" className={enlaceClases('/ubicaciones')}><span>🏢</span> Ubicaciones</Link>
              <Link to="/proveedores" className={enlaceClases('/proveedores')}><span>🤝</span> Proveedores</Link>
            </div>
          </div>

          {/* Sección: Operaciones */}
          <div>
            <h3 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Inventario</h3>
            <div className="space-y-1">
              <Link to="/recepciones" className={enlaceClases('/recepciones')}><span>📥</span> Recepción (Compras)</Link>
              <Link to="/despachos" className={enlaceClases('/despachos')}><span>📤</span> Despachos / Consumo</Link>
            </div>
          </div>

          {/* Sección: Dashboard */}
          <div>
            <h3 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Principal</h3>
            <div className="space-y-1">
              <Link to="/inventario" className={enlaceClases('/inventario')}><span>📊</span> Dashboard de Inventario</Link>
              <Link to="/kardex" className={enlaceClases('/kardex')}><span>📓</span> Kardex (Libro Mayor)</Link>
              <Link to="/consumos" className={enlaceClases('/consumos')}><span className="font-medium">📉 Gasto y Consumos</span> </Link>
            </div>
          </div>

          {/* Sección: Administración (SOLO VISIBLE PARA ADMINISTRADORES) */}
          {perfil?.rol === 'ADMINISTRADOR' && (
            <div>
              <h3 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sistema</h3>
              <div className="space-y-1">
                <Link to="/usuarios" className={enlaceClases('/usuarios')}><span>👥</span> Gestión de Usuarios</Link>
                <Link to="/auditoria" className={enlaceClases('/auditoria')}><span>📋</span> Log de Auditoría</Link>
              </div>
            </div>
          )}

        </nav>

        {/* FOOTER USUARIO Y CONTROLES DE SESIÓN CONSOLIDADOS */}
        <div className="mt-auto p-4 border-t border-slate-800 bg-slate-950 space-y-4">
          
          {/* INFO DEL USUARIO */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              perfil?.rol === 'ADMINISTRADOR' ? 'bg-blue-900 text-blue-300' : 'bg-slate-700 text-slate-300'
            }`}>
              {perfil?.rol === 'ADMINISTRADOR' ? 'A' : 'U'}
            </div>
            <div className="text-sm overflow-hidden flex-1">
              <p className="font-medium text-slate-200 truncate" title={session?.user?.email}>
                {session?.user?.email}
              </p>
              <p className="text-blue-400 text-xs font-semibold">{perfil?.rol || 'Cargando rol...'}</p>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN (Perfil y Cerrar Sesión) */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <Link 
              to="/perfil" 
              className="w-full flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span>⚙️</span> Mi Perfil y Seguridad
            </Link>

            <button 
              onClick={cerrarSesionLimpiamente}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors"
            >
              <span>🚪</span> Cerrar Sesión Segura
            </button>
          </div>

        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

    </div>
  );
}

export default Layout;