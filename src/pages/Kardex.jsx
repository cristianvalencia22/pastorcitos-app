import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import Paginacion from '../components/Paginacion' // 1. IMPORTAMOS PAGINACIÓN

export default function Kardex({ perfil }) {
  const esAdmin = perfil?.rol === 'ADMINISTRADOR';

  const [articulos, setArticulos] = useState([])
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null)
  const [historial, setHistorial] = useState([])
  
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('Busca un artículo para generar su Libro Mayor.')

  const [busqueda, setBusqueda] = useState('')
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const buscadorRef = useRef(null)

  // 2. ESTADOS DE PAGINACIÓN
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 20;

  useEffect(() => {
    async function cargarMaestroArticulos() {
      const { data } = await supabase.from('articulos').select('id, nombre, categoria, unidad_medida').order('nombre')
      if (data) setArticulos(data)
    }
    cargarMaestroArticulos()

    const handleClickFuera = (event) => {
      if (buscadorRef.current && !buscadorRef.current.contains(event.target)) {
        setMostrarSugerencias(false)
      }
    }
    document.addEventListener("mousedown", handleClickFuera)
    return () => document.removeEventListener("mousedown", handleClickFuera)
  }, [])

  const opcionesFiltradas = articulos.filter(item => 
    item.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    item.categoria.toLowerCase().includes(busqueda.toLowerCase())
  )

  async function generarKardex(articulo) {
    setArticuloSeleccionado(articulo)
    setBusqueda(`${articulo.nombre} (${articulo.categoria})`)
    setMostrarSugerencias(false)
    setCargando(true)
    setPaginaActual(1); // RESET DE PÁGINA AL CAMBIAR DE ARTÍCULO
    setMensaje('Calculando saldos históricos...')

    try {
      const { data, error } = await supabase
        .from('transacciones')
        .select(`
          id,
          fecha_transaccion,
          tipo_movimiento,
          cantidad,
          costo_total_movimiento,
          justificacion,
          perfiles ( email ),
          ubicacion_origen:ubicaciones!transacciones_id_ubicacion_origen_fkey ( nombre ),
          ubicacion_destino:ubicaciones!transacciones_id_ubicacion_destino_fkey ( nombre )
        `)
        .eq('id_articulo', articulo.id)
        .order('fecha_transaccion', { ascending: true })

      if (error) throw error

      let saldoAcumulado = 0;
      let saldoFinancieroAcumulado = 0;

      const historialCalculado = data.map(tx => {
        let esEntrada = tx.tipo_movimiento === 'RECEPCION';
        let esSalida = tx.tipo_movimiento === 'CONSUMO' || tx.tipo_movimiento === 'DESPACHO';
        let esNeutro = tx.tipo_movimiento === 'TRASLADO';

        if (esEntrada) {
          saldoAcumulado += tx.cantidad;
          saldoFinancieroAcumulado += Number(tx.costo_total_movimiento);
        } else if (esSalida) {
          saldoAcumulado -= tx.cantidad;
          saldoFinancieroAcumulado -= Number(tx.costo_total_movimiento);
        }

        return {
          ...tx,
          saldo_cantidad: saldoAcumulado,
          saldo_financiero: saldoFinancieroAcumulado,
          esEntrada,
          esSalida,
          esNeutro
        }
      });

      setHistorial(historialCalculado.reverse())
      setMensaje(`Kardex generado. ${data.length} movimientos encontrados.`)
    } catch (error) {
      setMensaje('Error al calcular el Kardex: ' + error.message)
    } finally {
      setCargando(false)
    }
  }

  // 3. MATEMÁTICA DE PAGINACIÓN (Basada en 'historial')
  const totalPaginas = Math.ceil(historial.length / registrosPorPagina);
  const indiceUltimo = paginaActual * registrosPorPagina;
  const indicePrimero = indiceUltimo - registrosPorPagina;
  const historialPaginado = historial.slice(indicePrimero, indiceUltimo);

  const exportarCSV = () => {
    if (historial.length === 0) return alert('No hay datos para exportar.');

    const cabeceras = ['Fecha', 'Operacion', 'Origen/Destino', 'Cant. Movida', 'Saldo Unidades', 'Justificacion', 'Usuario'];
    if (esAdmin) {
      cabeceras.splice(4, 0, 'Costo Movimiento (PEN)');
      cabeceras.splice(6, 0, 'Saldo Acumulado (PEN)');
    }
    
    // El Excel exporta TODO el historial, no solo la página visible
    const filas = historial.map(tx => tx).reverse().map(tx => {
      let origenDestino = '';
      if (tx.esEntrada) origenDestino = `Hacia: ${tx.ubicacion_destino?.nombre}`;
      if (tx.esSalida) origenDestino = `Desde: ${tx.ubicacion_origen?.nombre}`;
      if (tx.esNeutro) origenDestino = `De ${tx.ubicacion_origen?.nombre} a ${tx.ubicacion_destino?.nombre}`;

      const fila = [
        `"${formatoFecha(tx.fecha_transaccion)}"`,
        tx.tipo_movimiento,
        `"${origenDestino}"`,
        (tx.esSalida ? '-' : '+') + tx.cantidad,
        tx.saldo_cantidad,
        `"${tx.justificacion || ''}"`,
        `"${tx.perfiles?.email}"`
      ];

      if (esAdmin) {
        fila.splice(4, 0, (tx.esSalida ? '-' : '+') + tx.costo_total_movimiento);
        fila.splice(6, 0, tx.saldo_financiero);
      }
      return fila;
    });

    const tituloExcel = `"${articuloSeleccionado.nombre} (${articuloSeleccionado.unidad_medida})"\n\n`;
    const contenidoCSV = '\uFEFF' + tituloExcel + [cabeceras.join(','), ...filas.map(f => f.join(','))].join('\n');
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Kardex_${articuloSeleccionado.nombre.replace(/ /g, '_')}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const formatoMoneda = (valor) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(valor)
  const formatoFecha = (cadenaFecha) => new Date(cadenaFecha).toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit' })

  return (
    <div className="max-w-7xl mx-auto pb-8">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Kardex de Inventario</h1>
          <p className="text-slate-500 mt-1">Libro Mayor. Trazabilidad de entradas, salidas y saldos por artículo.</p>
        </div>
        {historial.length > 0 && (
          <button onClick={exportarCSV} className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-sm">
            <span>📥</span> Exportar Libro Mayor
          </button>
        )}
      </header>

      {/* BUSCADOR INTELIGENTE */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6" ref={buscadorRef}>
        <label className="block text-sm font-bold text-slate-700 mb-2">Selecciona el Artículo a auditar</label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">🔍</span>
          <input 
            type="text" 
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setMostrarSugerencias(true)
            }}
            onFocus={() => setMostrarSugerencias(true)}
            className="w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-slate-50 text-slate-800 font-medium transition-colors"
            placeholder="Escribe el nombre del producto (Ej. Lápiz, Marcador, Resma)..."
          />
          {mostrarSugerencias && (
            <ul className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl max-h-72 overflow-y-auto">
              {opcionesFiltradas.length === 0 ? (
                <li className="p-4 text-sm text-slate-500 text-center">No existe ese artículo en el catálogo.</li>
              ) : (
                opcionesFiltradas.map((item) => (
                  <li 
                    key={item.id} 
                    onClick={() => generarKardex(item)}
                    className="p-3 border-b border-slate-100 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{item.nombre}</p>
                      <p className="text-xs text-slate-500">{item.categoria}</p>
                    </div>
                    <span className="text-xs font-semibold bg-slate-100 px-2 py-1 rounded text-slate-600">
                      {item.unidad_medida}
                    </span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        <p className={`mt-3 text-sm font-medium ${mensaje.includes('Error') ? 'text-red-600' : 'text-blue-600'}`}>
          {cargando ? 'Analizando historial...' : mensaje}
        </p>
      </div>

      {/* TABLA DEL LIBRO MAYOR */}
      {articuloSeleccionado && historial.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="bg-slate-900 px-6 py-4 flex flex-col md:flex-row justify-between items-center text-white rounded-t-xl">
            <div>
              <h3 className="text-xl font-bold tracking-tight">{articuloSeleccionado.nombre}</h3>
              <p className="text-sm text-slate-400">Medida en: {articuloSeleccionado.unidad_medida}</p>
            </div>
            <div className="text-right mt-2 md:mt-0">
              <p className="text-xs font-bold text-slate-400 uppercase">Saldo Actual Disponible</p>
              <p className="text-2xl font-black text-emerald-400">{historial[0].saldo_cantidad} {articuloSeleccionado.unidad_medida}</p>
            </div>
          </div>
          
          <div className="overflow-x-auto min-h-[250px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-600 font-bold">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Operación</th>
                  <th className="p-4 text-center">Movimiento</th>
                  <th className="p-4 text-center">Saldo Unidades</th>
                  {esAdmin && <th className="p-4 text-right">Saldo Capital (PEN)</th>}
                  <th className="p-4">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historialPaginado.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm text-slate-600">{formatoFecha(tx.fecha_transaccion)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full border ${
                        tx.esEntrada ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                        tx.esSalida ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                        'bg-blue-100 text-blue-700 border-blue-200'
                      }`}>
                        {tx.tipo_movimiento}
                      </span>
                      <p className="text-xs text-slate-400 mt-1 truncate max-w-[150px]" title={tx.justificacion}>
                        {tx.esNeutro ? `Hacia: ${tx.ubicacion_destino?.nombre}` : tx.justificacion}
                      </p>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-lg font-black ${
                        tx.esEntrada ? 'text-emerald-600' : tx.esSalida ? 'text-orange-600' : 'text-blue-600'
                      }`}>
                        {tx.esSalida ? '-' : tx.esNeutro ? '↔' : '+'}{tx.cantidad}
                      </span>
                      {esAdmin && !tx.esNeutro && (
                        <span className="block text-xs text-slate-400 font-mono">
                          {tx.esSalida ? '-' : '+'}{formatoMoneda(tx.costo_total_movimiento)}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-lg font-bold text-slate-800">{tx.saldo_cantidad}</span>
                    </td>
                    {esAdmin && (
                      <td className="p-4 text-right font-mono font-bold text-slate-700">
                        {formatoMoneda(tx.saldo_financiero)}
                      </td>
                    )}
                    <td className="p-4 text-xs text-slate-500 font-medium">{tx.perfiles?.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* 4. RENDERIZAMOS LA PAGINACIÓN */}
          <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambioPagina={setPaginaActual} />
        </div>
      )}
    </div>
  )
}