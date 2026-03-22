import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Paginacion from '../components/Paginacion' // 1. IMPORTAMOS PAGINACIÓN

export default function Auditoria({ perfil }) {
  // Solo los administradores pueden ver quién hizo qué
  const esAdmin = perfil?.rol === 'ADMINISTRADOR';

  const [logs, setLogs] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState('Consultando registros del sistema...')

  // 2. ESTADOS DE PAGINACIÓN
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 20;

  useEffect(() => {
    async function cargarLogs() {
      if (!esAdmin) {
        setMensaje('Acceso Restringido. Esta área es exclusiva para Administradores.');
        setCargando(false);
        return;
      }

      try {
        console.log("🔍 1. Iniciando petición a Supabase (Tabla auditoria_logs)...");
        
        const { data, error } = await supabase
          .from('auditoria_logs')
          .select('*') // <-- QUITAMOS el join de 'perfiles' temporalmente
          .order('fecha', { ascending: false })

        console.log("✅ 2. Respuesta del servidor recibida:", { data, error });

        if (error) throw error
        setLogs(data)
        setMensaje(`Sistema en línea. Monitoreando cambios estructurales.`)
      } catch (error) {
        console.error("❌ 3. Error capturado:", error);
        setMensaje('Error de conexión: ' + error.message)
      } finally {
        console.log("🏁 4. Finalizando ciclo de carga.");
        setCargando(false)
      }
    }
    cargarLogs()
  }, [esAdmin])

  // 3. MATEMÁTICA DE LA PAGINACIÓN
  const totalPaginas = Math.ceil(logs.length / registrosPorPagina);
  const indiceUltimo = paginaActual * registrosPorPagina;
  const indicePrimero = indiceUltimo - registrosPorPagina;
  const logsPaginados = logs.slice(indicePrimero, indiceUltimo);

  const formatoFecha = (cadena) => new Date(cadena).toLocaleString('es-PE', { 
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit', second:'2-digit' 
  });

  if (!esAdmin) {
    return (
      <div className="max-w-4xl mx-auto mt-12 text-center bg-red-50 p-12 rounded-2xl border border-red-200">
        <span className="text-5xl block mb-4">⛔</span>
        <h2 className="text-2xl font-bold text-red-800">Acceso Denegado</h2>
        <p className="text-red-600 mt-2">No tienes los privilegios necesarios para ver el registro de auditoría.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto pb-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Log de Auditoría</h1>
        <p className="text-slate-500 mt-1 italic text-sm">Registro inmutable de acciones de usuarios en el sistema.</p>
      </header>

      <div className={`px-4 py-3 rounded-lg mb-8 shadow-sm border ${
        mensaje.includes('Error') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-800 border-slate-900 text-slate-300'
      }`}>
        <span className="font-bold text-white">Estado:</span> {mensaje}
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 flex flex-col">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 w-48">Fecha y Hora</th>
                <th className="p-4">Usuario</th>
                <th className="p-4">Acción</th>
                <th className="p-4">Módulo Afectado</th>
                <th className="p-4">Detalle Técnico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Descargando logs...</td></tr>
              ) : logsPaginados.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">No hay registros de auditoría aún.</td></tr>
              ) : (
                logsPaginados.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-xs font-mono text-slate-500">{formatoFecha(log.fecha)}</td>
                    <td className="p-4 text-sm font-semibold text-slate-700">{log.perfiles?.email || 'Desconocido'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-bold rounded border ${
                        log.accion === 'CREAR' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        log.accion === 'EDITAR' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        log.accion === 'DESACTIVAR' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {log.accion}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600 uppercase font-medium">{log.tabla_afectada}</td>
                    <td className="p-4">
                      <details className="text-xs text-slate-500 cursor-pointer">
                        <summary className="font-bold text-blue-600 hover:text-blue-800">Ver JSON</summary>
                        <div className="mt-2 p-2 bg-slate-900 text-emerald-400 rounded overflow-auto max-w-xs md:max-w-md max-h-32 custom-scrollbar">
                          {log.valores_nuevos ? JSON.stringify(log.valores_nuevos, null, 2) : 'Sin detalles'}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* 4. RENDERIZAMOS LA PAGINACIÓN */}
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambioPagina={setPaginaActual} />
      </div>
    </div>
  )
}