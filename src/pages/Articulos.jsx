import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Paginacion from '../components/Paginacion' // 1. IMPORTAMOS PAGINACIÓN

export default function Articulos({ session }) {
  const [articulos, setArticulos] = useState([])
  const [mensaje, setMensaje] = useState('Cargando catálogo...')
  const [procesando, setProcesando] = useState(false) 

  // Estado para creación
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('')
  const [unidadMedida, setUnidadMedida] = useState('') 
  const [stockMinimo, setStockMinimo] = useState(0)

  // Estado para edición
  const [editandoId, setEditandoId] = useState(null)
  const [formularioEdicion, setFormularioEdicion] = useState({})

  // 2. ESTADOS DE PAGINACIÓN
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 20;

  useEffect(() => {
    async function cargarArticulos() {
      try {
        const { data, error } = await supabase
          .from('articulos')
          .select('*')
          .eq('activo', true)
          .order('creado_en', { ascending: false })

        if (error) throw error
        setArticulos(data)
        setMensaje(`Sistema en línea. ${data.length} artículos disponibles en el maestro.`)
        
      } catch (error) {
        setMensaje('Error de conexión: ' + error.message)
      }
    }
    cargarArticulos()
  }, [])

  // --- FUNCIONES DE OPERACIÓN ---
  async function guardarArticulo(evento) {
    evento.preventDefault()
    if (!session?.user) return setMensaje('Error: Sesión no detectada.')

    setProcesando(true)
    setMensaje('Registrando artículo...')
    try {
      const { data, error } = await supabase
        .from('articulos')
        .insert([{ 
          nombre, 
          categoria, 
          unidad_medida: unidadMedida || 'Unidad',
          stock_minimo: parseInt(stockMinimo) 
        }])
        .select()

      if (error) throw error
      
      await supabase.from('auditoria_logs').insert([{
        id_usuario: session.user.id,
        tabla_afectada: 'articulos',
        registro_id: data[0].id,
        accion: 'CREAR',
        valores_nuevos: data[0]
      }])

      setArticulos([data[0], ...articulos])
      setMensaje('¡Artículo creado y auditado con éxito!')
      setNombre(''); setCategoria(''); setUnidadMedida(''); setStockMinimo(0);
      setPaginaActual(1); // Devolver a la página 1 para ver el nuevo registro
    } catch (error) {
      setMensaje('Error: ' + error.message)
    } finally {
      setProcesando(false)
    }
  }

  async function guardarEdicion(articuloOriginal) {
    if (!session?.user) return;
    setMensaje('Actualizando registro...')
    try {
      const { error: errUpdate } = await supabase
        .from('articulos')
        .update({
          nombre: formularioEdicion.nombre,
          categoria: formularioEdicion.categoria,
          unidad_medida: formularioEdicion.unidad_medida,
          stock_minimo: parseInt(formularioEdicion.stock_minimo)
        })
        .eq('id', articuloOriginal.id)

      if (errUpdate) throw errUpdate

      await supabase.from('auditoria_logs').insert([{
        id_usuario: session.user.id,
        tabla_afectada: 'articulos',
        registro_id: articuloOriginal.id,
        accion: 'EDITAR',
        valores_anteriores: articuloOriginal,
        valores_nuevos: formularioEdicion
      }])

      setArticulos(articulos.map(a => a.id === articuloOriginal.id ? formularioEdicion : a))
      setEditandoId(null)
      setMensaje('Cambio guardado y auditado con éxito.')
    } catch (error) {
      setMensaje('Error al editar: ' + error.message)
    }
  }

  async function desactivarArticulo(articulo) {
    if (!session?.user || !window.confirm("¿Retirar este artículo del inventario activo?")) return;
    try {
      const { error } = await supabase.from('articulos').update({ activo: false }).eq('id', articulo.id)
      if (error) throw error

      await supabase.from('auditoria_logs').insert([{
        id_usuario: session.user.id,
        tabla_afectada: 'articulos',
        registro_id: articulo.id,
        accion: 'DESACTIVAR',
        valores_anteriores: articulo,
        valores_nuevos: { ...articulo, activo: false }
      }])

      const nuevaLista = articulos.filter(item => item.id !== articulo.id);
      setArticulos(nuevaLista);
      setMensaje('Artículo desactivado correctamente.')
      
      // Ajustar paginación si borramos el último ítem de la página
      const paginasRestantes = Math.ceil(nuevaLista.length / registrosPorPagina);
      if (paginaActual > paginasRestantes && paginasRestantes > 0) setPaginaActual(paginasRestantes);

    } catch (error) {
      setMensaje('Error: ' + error.message)
    }
  }

  // 3. MATEMÁTICA DE LA PAGINACIÓN
  const totalPaginas = Math.ceil(articulos.length / registrosPorPagina);
  const indiceUltimo = paginaActual * registrosPorPagina;
  const indicePrimero = indiceUltimo - registrosPorPagina;
  const articulosPaginados = articulos.slice(indicePrimero, indiceUltimo);

  // --- VISTA ---
  return (
    <div className="max-w-6xl mx-auto pb-8">
      
      <datalist id="sugerencias-unidades">
        <option value="Unidad" />
        <option value="Caja" />
        <option value="Resma" />
        <option value="Paquete" />
        <option value="Litro" />
        <option value="Metro" />
      </datalist>

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Maestro de Artículos</h1>
        <p className="text-slate-500 mt-1 italic text-sm">Control centralizado con trazabilidad de cambios.</p>
      </header>

      <div className={`px-4 py-3 rounded-lg mb-8 shadow-sm border transition-all ${
        mensaje.includes('Error') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-800'
      }`}>
        <span className="font-bold">Sistema:</span> {mensaje}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Nuevo Registro</h3>
        <form onSubmit={guardarArticulo} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del artículo" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <input type="text" required value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Categoría (Ej. Papelería)" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="text" required list="sugerencias-unidades" value={unidadMedida} onChange={e => setUnidadMedida(e.target.value)} placeholder="U. Medida (Ej. Caja)" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="number" min="0" required value={stockMinimo} onChange={e => setStockMinimo(e.target.value)} placeholder="Alerta Stock Min" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" disabled={procesando} className="md:col-span-5 bg-slate-900 text-white font-bold py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:bg-slate-400">
            {procesando ? 'Guardando...' : 'Registrar en Maestro'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 flex flex-col">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Nombre</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Medida</th>
                <th className="p-4 text-center">Stock Mín.</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {articulosPaginados.map((item) => (
                <tr key={item.id} className={editandoId === item.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}>
                  <td className="p-4">
                    {editandoId === item.id ? 
                      <input type="text" value={formularioEdicion.nombre} onChange={e => setFormularioEdicion({...formularioEdicion, nombre: e.target.value})} className="w-full border rounded px-2 py-1 text-sm border-slate-300 outline-none focus:border-blue-500" /> 
                      : <span className="font-semibold text-slate-700">{item.nombre}</span>}
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {editandoId === item.id ? 
                      <input type="text" value={formularioEdicion.categoria} onChange={e => setFormularioEdicion({...formularioEdicion, categoria: e.target.value})} className="w-full border rounded px-2 py-1 text-sm border-slate-300 outline-none focus:border-blue-500" /> 
                      : item.categoria}
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {editandoId === item.id ? 
                      <input type="text" list="sugerencias-unidades" value={formularioEdicion.unidad_medida} onChange={e => setFormularioEdicion({...formularioEdicion, unidad_medida: e.target.value})} className="w-full border rounded px-2 py-1 text-sm border-slate-300 outline-none focus:border-blue-500" />
                      : item.unidad_medida}
                  </td>
                  <td className="p-4 text-center font-mono text-red-600 font-bold">
                    {editandoId === item.id ? 
                      <input type="number" value={formularioEdicion.stock_minimo} onChange={e => setFormularioEdicion({...formularioEdicion, stock_minimo: e.target.value})} className="w-16 border rounded px-2 py-1 text-sm border-slate-300 text-center outline-none focus:border-blue-500" /> 
                      : item.stock_minimo}
                  </td>
                  <td className="p-4 text-center space-x-2">
                    {editandoId === item.id ? (
                      <>
                        <button onClick={() => guardarEdicion(item)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold shadow-sm transition-colors">Listo</button>
                        <button onClick={() => setEditandoId(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-3 py-1 rounded text-xs font-bold transition-colors">X</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => {setEditandoId(item.id); setFormularioEdicion({...item});}} className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-xs font-bold border border-transparent hover:border-blue-100 transition-colors">Editar</button>
                        <button onClick={() => desactivarArticulo(item)} className="text-red-600 hover:bg-red-50 px-3 py-1 rounded text-xs font-bold transition-colors">Retirar</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 4. RENDERIZAMOS LA PAGINACIÓN */}
        <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambioPagina={setPaginaActual} />
      </div>
    </div>
  )
}