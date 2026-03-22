import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import Paginacion from '../components/Paginacion' 

export default function Consumos({ perfil }) {
  const esAdmin = perfil?.rol === 'ADMINISTRADOR';

  const [consumos, setConsumos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorMensaje, setErrorMensaje] = useState(null)
  
  // Estados para los Filtros Interactivos
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [filtroUbicacion, setFiltroUbicacion] = useState('') 
  // NUEVOS FILTROS DE FECHA
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 20;

  useEffect(() => {
    async function cargarConsumos() {
      try {
        const { data, error } = await supabase
          .from('transacciones')
          .select(`
            id,
            fecha_transaccion,
            cantidad,
            costo_total_movimiento,
            justificacion,
            articulos ( nombre, unidad_medida, categoria ),
            perfiles ( email ),
            ubicacion_origen:ubicaciones!transacciones_id_ubicacion_origen_fkey ( nombre )
          `)
          .eq('tipo_movimiento', 'CONSUMO')
          .order('fecha_transaccion', { ascending: false })

        if (error) throw error
        setConsumos(data)
      } catch (error) {
        setErrorMensaje('Error al cargar el reporte: ' + error.message)
      } finally {
        setCargando(false)
      }
    }
    cargarConsumos()
  }, [])

  // Reset de paginación al filtrar
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroCategoria, filtroUsuario, filtroUbicacion, fechaInicio, fechaFin]);

  const categoriasUnicas = useMemo(() => [...new Set(consumos.map(c => c.articulos?.categoria).filter(Boolean))], [consumos]);
  const usuariosUnicos = useMemo(() => [...new Set(consumos.map(c => c.perfiles?.email).filter(Boolean))], [consumos]);
  const ubicacionesUnicas = useMemo(() => [...new Set(consumos.map(c => c.ubicacion_origen?.nombre).filter(Boolean))], [consumos]);

  const consumosFiltrados = useMemo(() => {
    return consumos.filter((item) => {
      if (filtroCategoria && item.articulos?.categoria !== filtroCategoria) return false;
      if (filtroUsuario && item.perfiles?.email !== filtroUsuario) return false;
      if (filtroUbicacion && item.ubicacion_origen?.nombre !== filtroUbicacion) return false;
      
      // Lógica de Filtro por Fechas
      if (fechaInicio) {
        const fInicio = new Date(fechaInicio + 'T00:00:00');
        const fTx = new Date(item.fecha_transaccion);
        if (fTx < fInicio) return false;
      }
      if (fechaFin) {
        const fFin = new Date(fechaFin + 'T23:59:59');
        const fTx = new Date(item.fecha_transaccion);
        if (fTx > fFin) return false;
      }
      return true; 
    });
  }, [consumos, filtroCategoria, filtroUsuario, filtroUbicacion, fechaInicio, fechaFin]);

  const totalPaginas = Math.ceil(consumosFiltrados.length / registrosPorPagina);
  const indiceUltimo = paginaActual * registrosPorPagina;
  const indicePrimero = indiceUltimo - registrosPorPagina;
  const consumosPaginados = consumosFiltrados.slice(indicePrimero, indiceUltimo);

  const gastoTotal = consumosFiltrados.reduce((acc, item) => acc + Number(item.costo_total_movimiento), 0);

  const exportarCSV = () => {
    if (consumosFiltrados.length === 0) return alert('No hay datos para exportar.');

    const cabeceras = ['Fecha', 'Articulo', 'Categoria', 'Ubicacion Origen', 'Cantidad', 'Justificacion', 'Autorizado Por'];
    if (esAdmin) cabeceras.splice(6, 0, 'Costo Total (PEN)');
    
    const filas = consumosFiltrados.map(item => {
      const fila = [
        `"${formatoFecha(item.fecha_transaccion)}"`, 
        `"${item.articulos?.nombre || 'Desconocido'}"`,
        `"${item.articulos?.categoria || ''}"`,
        `"${item.ubicacion_origen?.nombre || 'Desconocida'}"`, 
        item.cantidad,
        `"${item.justificacion || 'Sin especificar'}"`,
        `"${item.perfiles?.email || 'Sistema'}"`
      ];
      if (esAdmin) fila.splice(6, 0, item.costo_total_movimiento);
      return fila;
    });

    const contenidoCSV = '\uFEFF' + [cabeceras.join(','), ...filas.map(f => f.join(','))].join('\n');
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reporte_Consumos_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const limpiarFiltros = () => {
    setFiltroCategoria(''); setFiltroUsuario(''); setFiltroUbicacion(''); setFechaInicio(''); setFechaFin('');
  }

  const formatoMoneda = (valor) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(valor)
  const formatoFecha = (cadenaFecha) => {
    if (!cadenaFecha) return 'Fecha desconocida';
    return new Date(cadenaFecha).toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit' })
  }

  return (
    <div className="max-w-7xl mx-auto pb-8">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Reporte de Consumos</h1>
          <p className="text-slate-500 mt-1">Auditoría de materiales gastados y salidas definitivas del inventario.</p>
        </div>
        
        <div className="flex gap-2">
          {(filtroCategoria || filtroUsuario || filtroUbicacion || fechaInicio || fechaFin) && (
            <button onClick={limpiarFiltros} className="text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors">
              Limpiar Filtros ✖
            </button>
          )}
          <button onClick={exportarCSV} className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-sm">
            <span>📥</span> Descargar Excel (CSV)
          </button>
        </div>
      </header>

      {errorMensaje && <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">{errorMensaje}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center border-l-4 border-l-orange-500">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Gasto Filtrado</span>
          <span className="text-3xl font-black text-slate-800">
            {cargando ? '...' : (esAdmin ? formatoMoneda(gastoTotal) : 'S/ ***')}
          </span>
          {!esAdmin && <span className="text-xs text-slate-400 mt-1 font-medium">Acceso restringido</span>}
        </div>
      </div>

      <div className="bg-slate-900 p-4 rounded-xl shadow-md mb-6 flex flex-col gap-4">
        <div className="text-white font-bold flex items-center gap-2"><span>🔍</span> Filtros Avanzados:</div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-1">
            <label className="block text-xs text-slate-400 mb-1 uppercase font-bold tracking-wider">Desde Fecha</label>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 [color-scheme:dark]" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs text-slate-400 mb-1 uppercase font-bold tracking-wider">Hasta Fecha</label>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 [color-scheme:dark]" />
          </div>
          
          <div className="md:col-span-1">
            <label className="block text-xs text-slate-400 mb-1 uppercase font-bold tracking-wider">Categoría</label>
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500">
              <option value="">Todas</option>
              {categoriasUnicas.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs text-slate-400 mb-1 uppercase font-bold tracking-wider">Ubicación</label>
            <select value={filtroUbicacion} onChange={e => setFiltroUbicacion(e.target.value)} className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500">
              <option value="">Todas</option>
              {ubicacionesUnicas.map(ubi => <option key={ubi} value={ubi}>{ubi}</option>)}
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs text-slate-400 mb-1 uppercase font-bold tracking-wider">Usuario</label>
            <select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500">
              <option value="">Todos</option>
              {usuariosUnicos.map(usr => <option key={usr} value={usr}>{usr}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-800">Resultados ({consumosFiltrados.length})</h3>
        </div>
        
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4 w-48">Fecha de Salida</th>
                <th className="p-4">Artículo Consumido</th>
                <th className="p-4">Origen</th>
                <th className="p-4 text-center">Cantidad</th>
                <th className="p-4 w-64">Justificación</th>
                {esAdmin && <th className="p-4 text-right">Costo Financiero</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {consumosPaginados.length === 0 && !cargando ? (
                <tr><td colSpan={esAdmin ? "6" : "5"} className="p-8 text-center text-slate-500">No hay consumos que coincidan con los filtros.</td></tr>
              ) : (
                consumosPaginados.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm text-slate-600 font-medium">{formatoFecha(item.fecha_transaccion)}</td>
                    <td className="p-4"><p className="font-bold text-slate-800">{item.articulos?.nombre || 'Artículo Desconocido'}</p><p className="text-xs text-slate-500">{item.articulos?.categoria}</p></td>
                    <td className="p-4"><span className="text-sm font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">{item.ubicacion_origen?.nombre || 'Desconocida'}</span></td>
                    <td className="p-4 text-center"><span className="text-lg font-black text-orange-600">-{item.cantidad}</span><span className="text-xs text-slate-500 ml-1">{item.articulos?.unidad_medida}</span></td>
                    <td className="p-4 text-sm text-slate-500 italic">"{item.justificacion || 'Sin especificar'}"</td>
                    {esAdmin && <td className="p-4 text-right font-mono font-medium text-slate-700">{formatoMoneda(item.costo_total_movimiento)}</td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambioPagina={setPaginaActual} />
      </div>
    </div>
  )
}