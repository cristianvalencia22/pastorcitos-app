import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

export default function Despachos({ session }) {
  const [inventarioDisponible, setInventarioDisponible] = useState([])
  const [ubicacionesDestino, setUbicacionesDestino] = useState([])
  const [mensaje, setMensaje] = useState('Consultando disponibilidad en tiempo real...')
  const [procesando, setProcesando] = useState(false)

  // Variables del formulario
  const [seleccionOrigen, setSeleccionOrigen] = useState('') 
  const [idDestino, setIdDestino] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [tipoMovimiento, setTipoMovimiento] = useState('TRASLADO')
  const [justificacion, setJustificacion] = useState('') 

  // ESTADOS DEL NUEVO BUSCADOR INTELIGENTE (TYPEAHEAD)
  const [busquedaOrigen, setBusquedaOrigen] = useState('')
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const buscadorRef = useRef(null)

  useEffect(() => {
    cargarDatos()
    
    // Función para cerrar el buscador si el usuario hace clic afuera
    const handleClickFuera = (event) => {
      if (buscadorRef.current && !buscadorRef.current.contains(event.target)) {
        setMostrarSugerencias(false)
      }
    }
    document.addEventListener("mousedown", handleClickFuera)
    return () => document.removeEventListener("mousedown", handleClickFuera)
  }, [])

  async function cargarDatos() {
    try {
      const { data: invData, error: errInv } = await supabase.from('vista_inventario_actual').select('*').order('articulo_nombre')
      const { data: ubiData, error: errUbi } = await supabase.from('ubicaciones').select('id, nombre, tipo').order('tipo')

      if (errInv) throw errInv
      if (errUbi) throw errUbi

      setInventarioDisponible(invData)
      setUbicacionesDestino(ubiData)
      setMensaje('Motor FIFO listo. Selecciona el origen y destino del movimiento.')
    } catch (error) {
      setMensaje('Error de lectura: ' + error.message)
    }
  }

  // Lógica de filtrado en tiempo real para el buscador
  const opcionesFiltradas = inventarioDisponible.filter(item => 
    item.articulo_nombre.toLowerCase().includes(busquedaOrigen.toLowerCase()) || 
    item.ubicacion_nombre.toLowerCase().includes(busquedaOrigen.toLowerCase())
  )

  const seleccionarArticulo = (item) => {
    setSeleccionOrigen(`${item.id_articulo}|${item.id_ubicacion}`)
    setBusquedaOrigen(`${item.articulo_nombre} (En: ${item.ubicacion_nombre}) - Disp: ${item.stock_total}`)
    setMostrarSugerencias(false)
  }

  async function ejecutarDespacho(e) {
    e.preventDefault()
    if (!session?.user) return setMensaje('Error: Sesión de usuario no válida.')

    const [idArticulo, idOrigen] = seleccionOrigen.split('|')
    const qty = parseInt(cantidad)

    if (!idArticulo || !idOrigen) return setMensaje('Debes seleccionar un artículo del buscador.')
    if (tipoMovimiento === 'TRASLADO' && !idDestino) return setMensaje('Debes seleccionar una ubicación de destino.')
    if (tipoMovimiento === 'CONSUMO' && !justificacion.trim()) return setMensaje('Debes escribir una justificación para dar de baja el material.')
    if (idOrigen === idDestino) return setMensaje('La ubicación de origen y destino no pueden ser la misma.')

    const stockActual = inventarioDisponible.find(i => i.id_articulo === idArticulo && i.id_ubicacion === idOrigen)?.stock_total || 0
    if (qty > stockActual) return setMensaje(`Error: Solo hay ${stockActual} unidades disponibles en el origen seleccionado.`)

    setProcesando(true)
    setMensaje('Ejecutando algoritmo FIFO y bloqueando lotes...')

    try {
      const { data: valorFinanciero, error } = await supabase.rpc('procesar_movimiento_fifo', {
        p_articulo_id: idArticulo,
        p_origen_id: idOrigen,
        p_destino_id: tipoMovimiento === 'CONSUMO' ? null : idDestino,
        p_cantidad: qty,
        p_usuario_id: session.user.id,
        p_tipo_movimiento: tipoMovimiento
      })

      if (error) throw error

      if (tipoMovimiento === 'CONSUMO') {
        const { data: txData } = await supabase
          .from('transacciones')
          .select('id')
          .eq('id_usuario', session.user.id)
          .eq('id_articulo', idArticulo)
          .eq('tipo_movimiento', 'CONSUMO')
          .order('fecha_transaccion', { ascending: false })
          .limit(1)
          .single();
          
        if (txData) {
          await supabase.from('transacciones').update({ justificacion }).eq('id', txData.id);
        }
      }

      setMensaje(`¡Transacción Exitosa! Se despacharon ${qty} unidades.`)
      
      setSeleccionOrigen('')
      setBusquedaOrigen('')
      setIdDestino('')
      setCantidad('')
      setJustificacion('')
      cargarDatos()

    } catch (error) {
      setMensaje('Transacción rechazada por el motor BD: ' + error.message)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Despachos y Consumo</h1>
        <p className="text-slate-500 mt-1">Traslada mercancía entre ubicaciones o regístrala como consumo final mediante costeo FIFO.</p>
      </header>

      <div className={`px-4 py-3 rounded-lg mb-8 shadow-sm border ${
        mensaje.includes('Exitosa') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
        mensaje.includes('Error') || mensaje.includes('rechazada') ? 'bg-red-50 border-red-200 text-red-800' : 
        'bg-blue-50 border-blue-200 text-blue-800'
      }`}>
        <span className="font-bold">Estado:</span> {mensaje}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <form onSubmit={ejecutarDespacho} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="md:col-span-2 flex gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input type="radio" value="TRASLADO" checked={tipoMovimiento === 'TRASLADO'} onChange={(e) => setTipoMovimiento(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
              Traslado (Bodega → Salón)
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 ml-4">
              <input type="radio" value="CONSUMO" checked={tipoMovimiento === 'CONSUMO'} onChange={(e) => {setTipoMovimiento(e.target.value); setIdDestino('');}} className="w-4 h-4 text-orange-600 focus:ring-orange-500" />
              Consumo Final (Salida del sistema)
            </label>
          </div>

          {/* NUEVO BUSCADOR TIPO TYPEAHEAD */}
          <div className="md:col-span-2 relative" ref={buscadorRef}>
            <label className="block text-sm font-bold text-slate-700 mb-1">Artículo y Ubicación de Origen *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">🔍</span>
              <input 
                type="text" 
                value={busquedaOrigen}
                onChange={(e) => {
                  setBusquedaOrigen(e.target.value)
                  setMostrarSugerencias(true)
                  setSeleccionOrigen('') // Borramos el ID si el usuario altera el texto
                }}
                onFocus={() => setMostrarSugerencias(true)}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="Escribe para buscar un artículo..."
              />
            </div>
            
            {/* Lista desplegable flotante */}
            {mostrarSugerencias && (
              <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                {opcionesFiltradas.length === 0 ? (
                  <li className="p-3 text-sm text-slate-500 text-center">No se encontraron artículos en stock con ese nombre.</li>
                ) : (
                  opcionesFiltradas.map((item, idx) => (
                    <li 
                      key={idx} 
                      onClick={() => seleccionarArticulo(item)}
                      className="p-3 border-b border-slate-100 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{item.articulo_nombre}</p>
                        <p className="text-xs text-slate-500">Bodega/Salón: {item.ubicacion_nombre}</p>
                      </div>
                      <div className="text-right">
                        <span className="block text-sm font-black text-emerald-600">{item.stock_total} disp.</span>
                        <span className="text-xs text-slate-400">{item.unidad_medida}</span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {tipoMovimiento === 'TRASLADO' ? (
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Ubicación de Destino *</label>
              <select required value={idDestino} onChange={(e) => setIdDestino(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">-- ¿A dónde se dirige la mercancía? --</option>
                {ubicacionesDestino.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre} (Tipo: {u.tipo})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Motivo / Justificación de la Baja *</label>
              <input type="text" required value={justificacion} onChange={(e) => setJustificacion(e.target.value)} className="w-full border border-orange-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500 bg-orange-50" placeholder="Ej. Material entregado a estudiantes para taller de pintura" />
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-1">Cantidad a Despachar *</label>
            <input type="number" required min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej. 10" />
          </div>

          <div className="md:col-span-2 pt-4 border-t border-slate-200">
            <button type="submit" disabled={procesando} className={`w-full text-white font-bold py-3.5 rounded-lg transition-colors shadow-lg text-lg flex justify-center items-center gap-2 ${
              tipoMovimiento === 'CONSUMO' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'
            } disabled:bg-slate-400 disabled:cursor-not-allowed`}>
              {procesando ? 'Procesando algoritmo FIFO...' : `Ejecutar ${tipoMovimiento}`}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}