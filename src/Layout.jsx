import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

function Layout({ children, session, perfil }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 1. ESTADO PARA CONTROLAR EL MENÚ MÓVIL
  const [menuAbierto, setMenuAbierto] = useState(false);

  const cerrarSesionLimpiamente = async () => {
    await supabase.auth.signOut();
    navigate('/');
    window.location.reload(); 
  };

  // Función auxiliar para cerrar el menú en móviles al hacer clic en un enlace
  const cerrarMenu = () => {
    setMenuAbierto(false);
  };

  const isActive = (ruta) => {
    return location.pathname === ruta || (ruta === '/articulos' && location.pathname === '/');
  };

  const enlaceClases = (ruta) => `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${
    isActive(ruta) ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
  }`;

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      
      {/* 2. OVERLAY (Fondo oscuro) SOLO PARA MÓVILES */}
      {/* Si el menú está abierto, mostramos un fondo semitransparente que, al tocarlo, cierra el menú */}
      {menuAbierto && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity" 
          onClick={cerrarMenu}
        ></div>
      )}

      {/* 3. SIDEBAR (Navegación) */}
      {/* Arquitectura CSS:
        - fixed inset-y-0 left-0: La ancla a la izquierda.
        - z-50: Asegura que esté por encima de todo.
        - transform transition-transform: Habilita la animación fluida por GPU.
        - md:relative md:translate-x-0: En PC, deja de flotar y se queda estática.
      */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex-shrink-0 ${
        menuAbierto ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        {/* LOGO */}
        <div className="h-16 md:h-20 flex items-center justify-center border-b border-slate-800 bg-slate-950">
          <div className="text-xl font-bold tracking-wider text-blue-400">
            LOS PASTORCITOS
          </div>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          <div>
            <h3 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Catálogos</h3>
            <div className="space-y-1">
              <Link to="/articulos" onClick={cerrarMenu} className={enlaceClases('/articulos')}><span>📦</span> Artículos</Link>
              <Link to="/ubicaciones" onClick={cerrarMenu} className={enlaceClases('/ubicaciones')}><span>🏢</span> Ubicaciones</Link>
              <Link to="/proveedores" onClick={cerrarMenu} className={enlaceClases('/proveedores')}><span>🤝</span> Proveedores</Link>
            </div>
          </div>

          <div>
            <h3 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Inventario</h3>
            <div className="space-y-1">
              <Link to="/recepciones" onClick={cerrarMenu} className={enlaceClases('/recepciones')}><span>📥</span> Recepción</Link>
              <Link to="/despachos" onClick={cerrarMenu} className={enlaceClases('/despachos')}><span>📤</span> Despachos</Link>
            </div>
          </div>

          <div>
            <h3 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Principal</h3>
            <div className="space-y-1">
              <Link to="/inventario" onClick={cerrarMenu} className={enlaceClases('/inventario')}><span>📊</span> Dashboard</Link>
              <Link to="/kardex" onClick={cerrarMenu} className={enlaceClases('/kardex')}><span>📓</span> Kardex</Link>
              <Link to="/consumos" onClick={cerrarMenu} className={enlaceClases('/consumos')}><span className="font-medium">📉 Consumos</span></Link>
            </div>
          </div>

          {perfil?.rol === 'ADMINISTRADOR' && (
            <div>
              <h3 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sistema</h3>
              <div className="space-y-1">
                <Link to="/usuarios" onClick={cerrarMenu} className={enlaceClases('/usuarios')}><span>👥</span> Usuarios</Link>
                <Link to="/auditoria" onClick={cerrarMenu} className={enlaceClases('/auditoria')}><span>📋</span> Auditoría</Link>
              </div>
            </div>
          )}

        </nav>

        {/* FOOTER DE USUARIO */}
        <div className="mt-auto p-4 border-t border-slate-800 bg-slate-950 space-y-4">
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
              <p className="text-blue-400 text-xs font-semibold">{perfil?.rol || 'Cargando...'}</p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <Link 
              to="/perfil" 
              onClick={cerrarMenu}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span>⚙️</span> Mi Perfil y Seguridad
            </Link>

            <button 
              onClick={cerrarSesionLimpiamente}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors"
            >
              <span>🚪</span> Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* 4. CONTENEDOR DERECHO (Header Móvil + Contenido Principal) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER MÓVIL (Solo visible en pantallas < 768px) */}
        <header className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md z-30">
          <div className="text-lg font-bold tracking-wider text-blue-400">LOS PASTORCITOS</div>
          
          {/* Botón de Hamburguesa */}
          <button 
            onClick={() => setMenuAbierto(true)} 
            className="p-2 -mr-2 text-slate-300 hover:text-white focus:outline-none"
            aria-label="Abrir menú"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 overflow-y-auto">
          {/* Reducimos un poco el padding en móviles (p-4) para aprovechar la pantalla */}
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}

export default Layout;
