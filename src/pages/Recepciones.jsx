import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../supabaseClient'

export default function Recepciones({ session }) {
  const [articulos, setArticulos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [mensaje, setMensaje] = useState('Cargando catálogos maestros...')

  // Datos de Cabecera de la Recepción
  const [idProveedor, setIdProveedor] = useState('')
  const [idBodega, setIdBodega] = useState('')
  const [fechaFactura, setFechaFactura] = useState(new Date().toISOString().split('T')[0])

  // Datos del Item Actual (Buscador Inteligente)
  const [busquedaArticulo, setBusquedaArticulo] = useState('')
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null)
  const [cantidad, setCantidad] = useState('')
  const [costoTotal, setCostoTotal] = useState('')
  const buscadorRef = useRef(null)

  // Carrito de Recepción (Para ingresar varios productos de una misma factura)
  const [carrito, setCarrito] = useState([])

  useEffect(() => {
    async function cargarCatalogos() {
      try {
        const [resArt, resProv, resUbi] = await Promise.all([
          supabase.from('articulos').select('id, nombre, categoria, unidad_medida').eq('activo', true),
          supabase.from('proveedores').select('id, razon_social').order('razon_social'),
          supabase.from('ubicaciones').select('id, nombre').eq('tipo', 'Bodega') // Recepciones entran a Bodega
        ])
        if (resArt.error) throw resArt.error
        if (resProv.error) throw resProv.error
        if (resUbi.error) throw resUbi.error

        setArticulos(resArt.data)
        setProveedores(resProv.data)
        setUbicaciones(resUbi.data)
        setMensaje('Catálogos listos. Selecciona el proveedor e ingresa los artículos.')
      } catch (error) {
        setMensaje('Error de conexión: ' + error.message)
      } finally {
        setCargando(false)
      }
    }
    cargarCatalogos()

    const handleClickFuera = (event) => {
      if (buscadorRef.current && !buscadorRef.current.contains(event.target)) setMostrarSugerencias(false)
    }
    document.addEventListener("mousedown", handleClickFuera)
    return () => document.removeEventListener("mousedown", handleClickFuera)
  }, [])

  // Filtro del buscador en tiempo real
  const articulosFiltrados = useMemo(() => {
    return articulos.filter(item => 
      item.nombre.toLowerCase().includes(busquedaArticulo.toLowerCase()) || 
      item.categoria.toLowerCase().includes(busquedaArticulo.toLowerCase())
    )
  }, [articulos, busquedaArticulo])

  const seleccionarArticulo = (item) => {
    setArticuloSeleccionado(item)
    setBusquedaArticulo(`${item.nombre} (${item.unidad_medida})`)
    setMostrarSugerencias(false)
  }

  const agregarAlCarrito = (e) => {
    e.preventDefault()
    if (!articuloSeleccionado) return alert('Por favor selecciona un artículo del buscador.')
    
    const nuevoItem = {
      articulo: articuloSeleccionado,
      cantidad: parseInt(cantidad),
      costo_total: parseFloat(costoTotal),
      costo_unitario: parseFloat(costoTotal) / parseInt(cantidad)
    }

    setCarrito([...carrito, nuevoItem])
    
    // Limpiar formulario de item
    setArticuloSeleccionado(null)
    setBusquedaArticulo('')
    setCantidad('')
    setCostoTotal('')
  }

  const eliminarDelCarrito = (index) => {
    const nuevoCarrito = [...carrito]
    nuevoCarrito.splice(index, 1)
    setCarrito(nuevoCarrito)
  }

  const procesarRecepcion = async () => {
    if (!session?.user) return alert('Sesión inválida.')
    if (!idProveedor || !idBodega || !fechaFactura) return alert('Faltan datos de cabecera (Proveedor, Bodega o Fecha).')
    if (carrito.length === 0) return alert('El carrito está vacío.')

    setProcesando(true)
    setMensaje('Guardando recepción e impactando Kardex...')

    try {
      // Preparamos el array de inserción masiva para la tabla de transacciones
      const transacciones = carrito.map(item => ({
        id_articulo: item.articulo.id,
        id_usuario: session.user.id,
        tipo_movimiento: 'RECEPCION',
        cantidad: item.cantidad,
        costo_total_movimiento: item.costo_total,
        id_ubicacion_destino: idBodega,
        fecha_transaccion: new Date(fechaFactura).toISOString()
      }))

      const { error } = await supabase.from('transacciones').insert(transacciones)
      if (error) throw error

      setMensaje('¡Recepción registrada con éxito! Inventario actualizado.')
      setCarrito([])
      setIdProveedor('')
      setFechaFactura(new Date().toISOString().split('T')[0])
    } catch (error) {
      setMensaje('Error al procesar la recepción: ' + error.message)
    } finally {
      setProcesando(false)
    }
  }

  const formatoMoneda = (valor) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(valor)
  const totalFactura = carrito.reduce((acc, item) => acc + item.costo_total, 0)

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Recepción de Mercancía</h1>
        <p className="text-slate-500 mt-1">Ingreso de compras al inventario (Capitalización en Bodegas).</p>
      </header>

      <div className={`px-4 py-3 rounded-lg mb-8 shadow-sm border ${
        mensaje.includes('Error') ? 'bg-red-50 border-red-200 text-red-700' : 
        mensaje.includes('éxito') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
        'bg-blue-50 border-blue-200 text-blue-800'
      }`}>
        <span className="font-bold">Estado:</span> {mensaje}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: FORMULARIOS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. Cabecera (Proveedor y Destino) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">1. Datos del Proveedor y Destino</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-600 mb-1">Fecha Factura / Remito</label>
                <input type="date" value={fechaFactura} onChange={e => setFechaFactura(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">Proveedor (Origen)</label>
                <select value={idProveedor} onChange={e => setIdProveedor(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">-- Seleccionar Proveedor --</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-600 mb-1">Bodega de Destino (Ingreso)</label>
                <select value={idBodega} onChange={e => setIdBodega(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">-- ¿A qué bodega entra la mercancía? --</option>
                  {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Buscador Inteligente y Agregar (Typeahead) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200" ref={buscadorRef}>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">2. Agregar Artículos</h3>
            <form onSubmit={agregarAlCarrito} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <div className="md:col-span-4 relative">
                <label className="block text-xs font-bold text-slate-600 mb-1">Buscar Artículo en Maestro *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">🔍</span>
                  <input 
                    type="text" 
                    value={busquedaArticulo}
                    onChange={(e) => {
                      setBusquedaArticulo(e.target.value)
                      setMostrarSugerencias(true)
                      setArticuloSeleccionado(null)
                    }}
                    onFocus={() => setMostrarSugerencias(true)}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Escribe el nombre del artículo..."
                    required
                  />
                </div>
                {mostrarSugerencias && (
                  <ul className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                    {articulosFiltrados.length === 0 ? (
                      <li className="p-3 text-sm text-slate-500 text-center">No se encontró. Debes crearlo primero en el Maestro.</li>
                    ) : (
                      articulosFiltrados.map((item) => (
                        <li key={item.id} onClick={() => seleccionarArticulo(item)} className="p-3 border-b border-slate-100 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors">
                          <span className="font-bold text-slate-800">{item.nombre}</span>
                          <span className="text-xs text-slate-500">{item.categoria} ({item.unidad_medida})</span>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-600 mb-1">Cantidad Entrante *</label>
                <input type="number" required min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej. 50" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">Costo TOTAL (PEN) *</label>
                <input type="number" step="0.01" required min="0.01" value={costoTotal} onChange={e => setCostoTotal(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-emerald-700 bg-emerald-50" placeholder="Costo total facturado" />
              </div>
              <div className="md:col-span-1 flex items-end">
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-lg transition-colors shadow-sm">
                  + Agregar
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA: CARRITO DE COMPRAS */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-slate-700 bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2"><span>🛒</span> Lista de Ingreso</h3>
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">{carrito.length} ítems</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-[250px] max-h-[400px]">
              {carrito.length === 0 ? (
                <div className="text-center text-slate-500 pt-8 text-sm">Aún no has agregado artículos a esta recepción.</div>
              ) : (
                carrito.map((item, idx) => (
                  <div key={idx} className="bg-slate-800 p-3 rounded-lg border border-slate-700 relative group">
                    <button onClick={() => eliminarDelCarrito(idx)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 bg-slate-900 hover:bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center transition-colors">✖</button>
                    <p className="font-bold text-slate-200 pr-6">{item.articulo.nombre}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-bold text-blue-400">+{item.cantidad} <span className="text-xs font-normal text-slate-400">{item.articulo.unidad_medida}</span></span>
                      <div className="text-right">
                        <span className="block text-sm font-mono text-emerald-400">{formatoMoneda(item.costo_total)}</span>
                        <span className="text-xs text-slate-500">({formatoMoneda(item.costo_unitario)} c/u)</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-400 font-medium">Total Factura:</span>
                <span className="text-xl font-black text-emerald-400 font-mono">{formatoMoneda(totalFactura)}</span>
              </div>
              <button 
                onClick={procesarRecepcion} 
                disabled={procesando || carrito.length === 0} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg disabled:bg-slate-700 disabled:text-slate-500"
              >
                {procesando ? 'Capitalizando en servidor...' : 'Procesar e Ingresar a Bodega'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}