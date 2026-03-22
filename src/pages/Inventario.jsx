import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'

export default function Inventario({ perfil }) {
  // REGLA DE SEGURIDAD (RF-01)
  const esAdmin = perfil?.rol === 'ADMINISTRADOR';

  const [inventario, setInventario] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorMensaje, setErrorMensaje] = useState(null)

  // Estados para los Filtros Interactivos
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroUbicacion, setFiltroUbicacion] = useState('')
  const [filtroRiesgo, setFiltroRiesgo] = useState('TODOS')

  const [kpis, setKpis] = useState({ valorTotal: 0, articulosEnRiesgo: 0, totalUbicaciones: 0 })
  
  // ESTADOS PARA LOS TOP 5 (RF-10)
  const [topBajoStock, setTopBajoStock] = useState([])
  const [topConsumoMes, setTopConsumoMes] = useState([])

  useEffect(() => {
    async function cargarDashboard() {
      try {
        // 1. Cargar el inventario actual
        const { data: invData, error: invError } = await supabase
          .from('vista_inventario_actual')
          .select('*')
          .order('ubicacion_tipo', { ascending: true })
          .order('articulo_nombre', { ascending: true })

        if (invError) throw invError
        setInventario(invData)

        // KPIs Globales
        const valorFinanciero = invData.reduce((acc, item) => acc + Number(item.valor_financiero_total), 0)
        const enRiesgo = invData.filter(item => item.stock_total <= item.stock_minimo).length
        const ubicacionesUnicas = new Set(invData.map(item => item.id_ubicacion)).size
        setKpis({ valorTotal: valorFinanciero, articulosEnRiesgo: enRiesgo, totalUbicaciones: ubicacionesUnicas })

        // ==========================================
        // CÁLCULO DE TOP 5 (RF-10)
        // ==========================================
        
        // A. Top 5 Bajo Stock (Los que tienen mayor déficit respecto a su mínimo)
        const criticos = [...invData]
          .filter(item => item.stock_total <= item.stock_minimo)
          .sort((a, b) => (a.stock_total - a.stock_minimo) - (b.stock_total - b.stock_minimo))
          .slice(0, 5);
        setTopBajoStock(criticos);

        // B. Top 5 Consumo del Mes
        const fechaActual = new Date();
        const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1).toISOString();

        const { data: txData, error: txError } = await supabase
          .from('transacciones')
          .select('id_articulo, cantidad, articulos(nombre, unidad_medida)')
          .eq('tipo_movimiento', 'CONSUMO')
          .gte('fecha_transaccion', primerDiaMes);

        if (txError) throw txError;

        const consumosAgrupados = {};
        txData.forEach(tx => {
          if (!consumosAgrupados[tx.id_articulo]) {
            consumosAgrupados[tx.id_articulo] = {
              nombre: tx.articulos?.nombre,
              unidad: tx.articulos?.unidad_medida,
              total: 0
            };
          }
          consumosAgrupados[tx.id_articulo].total += tx.cantidad;
        });

        const topConsumos = Object.values(consumosAgrupados)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
        setTopConsumoMes(topConsumos);

      } catch (error) {
        setErrorMensaje('Error al cargar el panel: ' + error.message)
      } finally {
        setCargando(false)
      }
    }
    cargarDashboard()
  }, [])

  const categoriasUnicas = useMemo(() => [...new Set(inventario.map(item => item.categoria))], [inventario]);
  const ubicacionesUnicas = useMemo(() => [...new Set(inventario.map(item => item.ubicacion_nombre))], [inventario]);

  const inventarioFiltrado = useMemo(() => {
    return inventario.filter((item) => {
      if (filtroCategoria && item.categoria !== filtroCategoria) return false;
      if (filtroUbicacion && item.ubicacion_nombre !== filtroUbicacion) return false;
      const enRiesgo = item.stock_total <= item.stock_minimo;
      if (filtroRiesgo === 'EN_RIESGO' && !enRiesgo) return false;
      if (filtroRiesgo === 'OK' && enRiesgo) return false;
      return true; 
    });
  }, [inventario, filtroCategoria, filtroUbicacion, filtroRiesgo]);

  const valorFiltrado = inventarioFiltrado.reduce((acc, item) => acc + Number(item.valor_financiero_total), 0);

  const exportarCSV = () => {
    if (inventarioFiltrado.length === 0) return alert('No hay datos para exportar.');
    const cabeceras = ['Articulo', 'Categoria', 'Ubicacion', 'Tipo Ubicacion', 'Cantidad Disponible', 'Unidad de Medida'];
    if (esAdmin) cabeceras.push('Valor Total (PEN)');
    
    const filas = inventarioFiltrado.map(item => {
      const fila = [
        `"${item.articulo_nombre}"`,
        `"${item.categoria}"`,
        `"${item.ubicacion_nombre}"`,
        `"${item.ubicacion_tipo}"`,
        item.stock_total,
        `"${item.unidad_medida}"`
      ];
      if (esAdmin) fila.push(item.valor_financiero_total);
      return fila;
    });

    const contenidoCSV = '\uFEFF' + [cabeceras.join(','), ...filas.map(f => f.join(','))].join('\n');
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Inventario_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const formatoMoneda = (valor) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(valor);

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard de Inventario</h1>
          <p className="text-slate-500 mt-1">Visión global del stock {esAdmin ? 'y valoración financiera ' : ''}en tiempo real.</p>
        </div>
        
        <div className="flex gap-2">
          {(filtroCategoria || filtroUbicacion || filtroRiesgo !== 'TODOS') && (
            <button onClick={() => { setFiltroCategoria(''); setFiltroUbicacion(''); setFiltroRiesgo('TODOS'); }} className="text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors">
              Limpiar Filtros ✖
            </button>
          )}
          <button onClick={exportarCSV} className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-sm">
            <span>📥</span> Descargar Excel (CSV)
          </button>
        </div>
      </header>

      {errorMensaje && <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">{errorMensaje}</div>}

      {/* Tarjetas de Indicadores (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center border-b-4 border-b-emerald-500">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Global Capitalizado</span>
          <span className="text-3xl font-black text-slate-800">
            {cargando ? '...' : (esAdmin ? formatoMoneda(kpis.valorTotal) : 'S/ ***')}
          </span>
          {!esAdmin && <span className="text-xs text-slate-400 mt-1 font-medium">Acceso restringido</span>}
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center border-b-4 border-b-red-500">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Alertas Críticas de Stock</span>
          <div className="flex items-center gap-3">
            <span className={`text-3xl font-black ${kpis.articulosEnRiesgo > 0 ? 'text-red-600' : 'text-slate-800'}`}>
              {cargando ? '...' : kpis.articulosEnRiesgo}
            </span>
            {kpis.articulosEnRiesgo > 0 && <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full animate-pulse">Reabastecer</span>}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center border-b-4 border-b-blue-500">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Subtotal Vista Actual</span>
          <span className="text-3xl font-black text-slate-800">
            {cargando ? '...' : (esAdmin ? formatoMoneda(valorFiltrado) : 'S/ ***')}
          </span>
          {!esAdmin && <span className="text-xs text-slate-400 mt-1 font-medium">Acceso restringido</span>}
        </div>
      </div>

      {/* PANELES DE TOP 5 GERENCIAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* Panel 1: Top 5 Bajo Stock */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-red-50 flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider">Top 5 Alertas de Stock</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {topBajoStock.length === 0 ? (
              <li className="p-6 text-center text-sm text-slate-500">Todo el inventario está por encima del stock mínimo.</li>
            ) : (
              topBajoStock.map((item, idx) => (
                <li key={idx} className="p-4 flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <p className="font-bold text-slate-800">{item.articulo_nombre}</p>
                    <p className="text-xs text-slate-500">{item.ubicacion_nombre}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-lg font-black text-red-600">{item.stock_total}</span>
                    <span className="text-xs text-slate-400 font-medium">Mín: {item.stock_minimo}</span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Panel 2: Top 5 Mayor Rotación */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-blue-50 flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider">Top 5 Mayor Consumo del Mes</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {topConsumoMes.length === 0 ? (
              <li className="p-6 text-center text-sm text-slate-500">No se han registrado consumos en lo que va del mes.</li>
            ) : (
              topConsumoMes.map((item, idx) => (
                <li key={idx} className="p-4 flex justify-between items-center hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <span className="text-slate-300 font-black text-xl">#{idx + 1}</span>
                    <p className="font-bold text-slate-800">{item.nombre}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-lg font-black text-blue-600">-{item.total}</span>
                    <span className="text-xs text-slate-400 font-medium">{item.unidad}</span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* Barra de Filtros Interactiva */}
      <div className="bg-slate-900 p-4 rounded-xl shadow-md mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="text-white font-bold flex items-center gap-2 mr-2"><span>🔍</span> Filtrar:</div>
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="flex-1 w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas las Categorías</option>
          {categoriasUnicas.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select value={filtroUbicacion} onChange={e => setFiltroUbicacion(e.target.value)} className="flex-1 w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas las Ubicaciones</option>
          {ubicacionesUnicas.map(ubi => <option key={ubi} value={ubi}>{ubi}</option>)}
        </select>
        <select value={filtroRiesgo} onChange={e => setFiltroRiesgo(e.target.value)} className="flex-1 w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
          <option value="TODOS">Todos los Niveles de Riesgo</option>
          <option value="EN_RIESGO">⚠️ Solo bajo Stock Mínimo</option>
          <option value="OK">✅ Stock Saludable</option>
        </select>
      </div>

      {/* Tabla Principal de Existencias */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-800">Resultados ({inventarioFiltrado.length} registros)</h3>
          {cargando && <span className="text-sm text-blue-600 animate-pulse font-medium">Calculando...</span>}
        </div>
        
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4">Artículo</th>
                <th className="p-4">Ubicación</th>
                <th className="p-4 text-center">Cantidad Disponible</th>
                {esAdmin && <th className="p-4 text-right">Valorización Ponderada</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventarioFiltrado.length === 0 && !cargando ? (
                <tr>
                  <td colSpan={esAdmin ? "4" : "3"} className="p-8 text-center text-slate-500">
                    <span className="block text-3xl mb-2">🕵️</span>
                    No se encontraron artículos con los filtros actuales.
                  </td>
                </tr>
              ) : (
                inventarioFiltrado.map((item, idx) => {
                  const enRiesgo = item.stock_total <= item.stock_minimo;
                  return (
                    <tr key={idx} className={`hover:bg-slate-50 transition-colors ${enRiesgo ? 'bg-red-50/30' : ''}`}>
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{item.articulo_nombre}</p>
                        <p className="text-xs text-slate-500">{item.categoria}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                          item.ubicacion_tipo === 'Bodega' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-orange-100 text-orange-700 border-orange-200'
                        }`}>
                          {item.ubicacion_tipo}
                        </span>
                        <span className="ml-2 text-sm text-slate-600">{item.ubicacion_nombre}</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-lg font-black ${enRiesgo ? 'text-red-600' : 'text-slate-700'}`}>
                            {item.stock_total}
                          </span>
                          <span className="text-xs text-slate-400">{item.unidad_medida}</span>
                        </div>
                      </td>
                      {esAdmin && (
                        <td className="p-4 text-right font-mono font-medium text-emerald-700">
                          {formatoMoneda(item.valor_financiero_total)}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}