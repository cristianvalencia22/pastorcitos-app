import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Ubicaciones() {
  const [ubicaciones, setUbicaciones] = useState([])
  const [mensaje, setMensaje] = useState('Conectando al maestro de ubicaciones...')
  const [procesando, setProcesando] = useState(false)

  // Estado para creación: Alineado EXACTAMENTE con la regla de PostgreSQL
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('Salon') 
  const [custodio, setCustodio] = useState('') 

  const [editandoId, setEditandoId] = useState(null)
  const [formularioEdicion, setFormularioEdicion] = useState({})

  useEffect(() => {
    async function cargarUbicaciones() {
      try {
        const { data, error } = await supabase
          .from('ubicaciones')
          .select('*')
          .order('tipo', { ascending: true })
          .order('nombre', { ascending: true })

        if (error) throw error
        setUbicaciones(data)
        setMensaje(`Sistema en línea. ${data.length} ubicaciones registradas.`)
      } catch (error) {
        setMensaje('Error al cargar: ' + error.message)
      }
    }
    cargarUbicaciones()
  }, [])

  async function guardarUbicacion(evento) {
    evento.preventDefault()
    setProcesando(true)
    setMensaje('Registrando ubicación...')

    try {
      // Enviamos el 'tipo' tal cual lo espera la base de datos ('Bodega' o 'Salon')
      const payload = { 
        nombre: nombre.trim(), 
        tipo: tipo, 
        custodio: custodio.trim() || 'Sin asignar' 
      };

      const { data, error } = await supabase.from('ubicaciones').insert([payload]).select()

      if (error) {
        if (error.code === '23505') throw new Error('Ya existe una ubicación con ese nombre exacto.')
        throw error;
      }

      const nuevaLista = [...ubicaciones, data[0]].sort((a, b) => a.nombre.localeCompare(b.nombre))
      setUbicaciones(nuevaLista)
      
      setMensaje('¡Ubicación y custodio registrados con éxito!')
      setNombre(''); setTipo('Salon'); setCustodio('');
    } catch (error) {
      setMensaje('Error al guardar: ' + error.message)
    } finally {
      setProcesando(false)
    }
  }

  async function guardarEdicion(ubicacionOriginal) {
    setMensaje('Actualizando datos de la ubicación...')
    try {
      const { error } = await supabase
        .from('ubicaciones')
        .update({
          nombre: formularioEdicion.nombre.trim(),
          tipo: formularioEdicion.tipo,
          custodio: formularioEdicion.custodio.trim() || 'Sin asignar'
        })
        .eq('id', ubicacionOriginal.id)

      if (error) throw error

      setUbicaciones(ubicaciones.map(u => u.id === ubicacionOriginal.id ? formularioEdicion : u))
      setEditandoId(null)
      setMensaje('Datos actualizados correctamente.')
    } catch (error) {
      setMensaje('Error al editar: ' + error.message)
    }
  }

  return (
    <div className="max-w-5xl mx-auto pb-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Maestro de Ubicaciones</h1>
        <p className="text-slate-500 mt-1">Define la estructura física del jardín y asigna responsabilidades de custodia.</p>
      </header>

      <div className={`px-4 py-3 rounded-lg mb-8 shadow-sm border transition-all ${
        mensaje.includes('Error') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-800'
      }`}>
        <span className="font-semibold">Estado:</span> {mensaje}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Nueva Ubicación Física</h3>
        <form onSubmit={guardarUbicacion} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Espacio *</label>
            {/* Los values coinciden con la BD, el texto visual tiene la tilde */}
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500">
              <option value="Salon">Salón (Clases)</option>
              <option value="Bodega">Bodega (Almacenamiento)</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-600 mb-1">Nombre / Identificador *</label>
            <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Párvulos A" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1">Custodio (Responsable del espacio)</label>
            <input type="text" value={custodio} onChange={e => setCustodio(e.target.value)} placeholder="Ej. Prof. Martha Gómez" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="md:col-span-4 pt-2">
            <button type="submit" disabled={procesando} className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:bg-slate-400">
              {procesando ? 'Guardando...' : 'Crear Ubicación'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-800">Directorio de Espacios Activos</h3>
        </div>
        
        {ubicaciones.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No hay ubicaciones creadas. Empieza por registrar la Bodega Principal.</div>
        ) : (
          <div className="overflow-x-auto min-h-[250px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4 w-32 text-center">Clasificación</th>
                  <th className="p-4">Identificador del Espacio</th>
                  <th className="p-4">Custodio Asignado</th>
                  <th className="p-4 w-32 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ubicaciones.map((item) => (
                  <tr key={item.id} className={editandoId === item.id ? 'bg-blue-50/50' : 'hover:bg-slate-50 transition-colors'}>
                    <td className="p-4 text-center">
                      {editandoId === item.id ? (
                        <select value={formularioEdicion.tipo} onChange={e => setFormularioEdicion({...formularioEdicion, tipo: e.target.value})} className="w-full border rounded px-2 py-1 text-sm border-slate-300 bg-white">
                          <option value="Bodega">Bodega</option>
                          <option value="Salon">Salón</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                          item.tipo === 'Bodega' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-orange-100 text-orange-700 border-orange-200'
                        }`}>
                          {item.tipo === 'Salon' ? 'Salón' : item.tipo}
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-slate-800">
                      {editandoId === item.id ? (
                        <input type="text" value={formularioEdicion.nombre} onChange={e => setFormularioEdicion({...formularioEdicion, nombre: e.target.value})} className="w-full border rounded px-2 py-1 text-sm border-slate-300 outline-none" />
                      ) : (
                        item.nombre
                      )}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {editandoId === item.id ? (
                        <input type="text" value={formularioEdicion.custodio} onChange={e => setFormularioEdicion({...formularioEdicion, custodio: e.target.value})} className="w-full border rounded px-2 py-1 text-sm border-slate-300 outline-none" placeholder="Nombre del responsable" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">👤</span>
                          {item.custodio}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center space-x-2">
                      {editandoId === item.id ? (
                        <>
                          <button onClick={() => guardarEdicion(item)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold shadow-sm">Guardar</button>
                          <button onClick={() => setEditandoId(null)} className="bg-slate-200 text-slate-600 px-3 py-1 rounded text-xs font-bold">X</button>
                        </>
                      ) : (
                        <button onClick={() => {setEditandoId(item.id); setFormularioEdicion({...item});}} className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-xs font-bold border border-transparent hover:border-blue-100">
                          Modificar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}