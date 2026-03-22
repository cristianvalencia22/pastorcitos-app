import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

// Recibimos la 'session' como parámetro (props) para saber quién está logueado
export default function Movimientos({ session }) {
  // ==========================================
  // ZONA 1: ESTADO LOCAL Y CATÁLOGOS
  // ==========================================
  const [articulos, setArticulos] = useState([])
  const [bodegas, setBodegas] = useState([])
  const [mensaje, setMensaje] = useState('Cargando catálogos de base de datos...')
  const [procesando, setProcesando] = useState(false)

  // Variables del formulario de Recepción
  const [idArticulo, setIdArticulo] = useState('')
  const [idUbicacion, setIdUbicacion] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [costoTotal, setCostoTotal] = useState('')

  // ==========================================
  // ZONA 2: LÓGICA TRANSACCIONAL Y BASE DE DATOS
  // ==========================================
  useEffect(() => {
    async function cargarDependencias() {
      try {
        // 1. Traer solo artículos activos
        const { data: arts, error: errArts } = await supabase
          .from('articulos')
          .select('id, nombre, unidad_medida')
          .eq('activo', true)
          .order('nombre')

        // 2. Traer solo ubicaciones tipo 'Bodega' (Las recepciones no van directo al salón)
        const { data: bods, error: errBods } = await supabase
          .from('ubicaciones')
          .select('id, nombre')
          .eq('tipo', 'Bodega')
          .order('nombre')

        if (errArts) throw errArts
        if (errBods) throw errBods

        setArticulos(arts)
        setBodegas(bods)
        setMensaje('Sistema listo para registrar operaciones.')
      } catch (error) {
        setMensaje('Error de red: ' + error.message)
      }
    }
    cargarDependencias()
  }, [])

  async function registrarRecepcion(evento) {
    evento.preventDefault()
    setProcesando(true)
    setMensaje('Registrando transacción financiera...')

    try {
      const qty = parseInt(cantidad)
      const cost = parseFloat(costoTotal)
      const costoUnitario = cost / qty // Cálculo fundamental para el FIFO

      // 1er PASO: Crear el Lote físico en la bodega
      const { data: loteNuevo, error: errLote } = await supabase
        .from('lotes_ingreso')
        .insert([{
          id_articulo: idArticulo,
          id_ubicacion: idUbicacion,
          cantidad_original: qty,
          cantidad_disponible: qty,
          costo_unitario: costoUnitario
        }])
        .select()

      if (errLote) throw errLote

      // 2do PASO: Registrar la trazabilidad inmutable en el Kardex
      const { error: errTx } = await supabase
        .from('transacciones')
        .insert([{
          id_articulo: idArticulo,
          id_usuario: session.user.id, // ¡Usamos el ID del administrador logueado!
          tipo_movimiento: 'RECEPCION',
          cantidad: qty,
          costo_total_movimiento: cost,
          id_ubicacion_destino: idUbicacion
        }])

      if (errTx) throw errTx

      setMensaje(`¡Éxito! Lote registrado. Costo unitario calculado: $${costoUnitario.toFixed(2)}`)
      
      // Limpiar formulario (Poka-Yoke: prevenir doble envío)
      setIdArticulo('')
      setIdUbicacion('')
      setCantidad('')
      setCostoTotal('')

    } catch (error) {
      setMensaje('Fallo en la transacción: ' + error.message)
    } finally {
      setProcesando(false)
    }
  }

  // ==========================================
  // ZONA 3: LA VISTA (Tailwind CSS)
  // ==========================================
  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Centro de Operaciones</h1>
        <p className="text-slate-500 mt-2">Registra las entradas físicas y financieras al inventario.</p>
      </header>

      <div className={`px-4 py-3 rounded-lg mb-8 shadow-sm border ${
        mensaje.includes('Éxito') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
        mensaje.includes('Fallo') ? 'bg-red-50 border-red-200 text-red-800' : 
        'bg-blue-50 border-blue-200 text-blue-800'
      }`}>
        <span className="font-semibold">Log del Sistema:</span> {mensaje}
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-800 mb-6 border-b pb-2 flex items-center gap-2">
          <span>📥</span> Nueva Recepción (Compra)
        </h2>

        <form onSubmit={registrarRecepcion} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Selector de Artículo (Autocompletado nativo del navegador) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Artículo Recibido</label>
            <select required value={idArticulo} onChange={(e) => setIdArticulo(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="" disabled>-- Seleccione un artículo del catálogo --</option>
              {articulos.map(art => (
                <option key={art.id} value={art.id}>{art.nombre} (Medida: {art.unidad_medida})</option>
              ))}
            </select>
          </div>

          {/* Selector de Bodega */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Bodega de Destino</label>
            <select required value={idUbicacion} onChange={(e) => setIdUbicacion(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="" disabled>-- Seleccione la bodega de almacenamiento --</option>
              {bodegas.map(bod => (
                <option key={bod.id} value={bod.id}>{bod.nombre}</option>
              ))}
            </select>
          </div>

          {/* Cantidad Física */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad Física Recibida</label>
            <input type="number" required min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="Ej. 50" />
          </div>

          {/* Costo Total Financiero */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Costo Total de la Compra ($)</label>
            <input type="number" required min="0.01" step="0.01" value={costoTotal} onChange={(e) => setCostoTotal(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="Ej. 150000" />
            <p className="text-xs text-slate-500 mt-1">
              Ingresa el valor total pagado al proveedor por todo el lote.
            </p>
          </div>

          {/* Botón de Acción */}
          <div className="md:col-span-2 pt-4">
            <button type="submit" disabled={procesando}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md">
              {procesando ? 'Procesando inserción segura...' : 'Registrar Entrada de Inventario'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}