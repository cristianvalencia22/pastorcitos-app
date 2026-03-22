import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [mensaje, setMensaje] = useState('Conectando con el catálogo de proveedores...')

  const [nit, setNit] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [contacto, setContacto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')

  useEffect(() => {
    async function cargarProveedores() {
      try {
        const { data, error } = await supabase
          .from('proveedores')
          .select('*')
          .eq('activo', true)
          .order('razon_social', { ascending: true })

        if (error) throw error
        setProveedores(data)
        setMensaje(`Sistema en línea. ${data.length} proveedores activos.`)
      } catch (error) {
        setMensaje('Error de conexión: ' + error.message)
      }
    }
    cargarProveedores()
  }, [])

  async function guardarProveedor(evento) {
    evento.preventDefault()
    setMensaje('Guardando proveedor...')

    try {
      // 1. Imprimimos en consola lo que vamos a enviar (útil para debug)
      const payload = { nit, razon_social: razonSocial, contacto, telefono, correo };
      console.log("Enviando a Supabase:", payload);

      const { data, error } = await supabase
        .from('proveedores')
        .insert([payload])
        .select()

      // 2. Si Supabase devuelve un error, lo lanzamos al catch
      if (error) {
        if (error.code === '23505') throw new Error('Ya existe un proveedor con ese NIT/RUT.')
        throw error
      }

      // 3. Validación de seguridad por si Supabase no devuelve data por reglas RLS
      if (!data || data.length === 0) {
         throw new Error('El registro se guardó, pero la base de datos no devolvió los datos (Revisar permisos RLS).')
      }

      setProveedores([...proveedores, data[0]].sort((a, b) => a.razon_social.localeCompare(b.razon_social)))
      setMensaje('¡Proveedor guardado con éxito!')
      
      setNit(''); setRazonSocial(''); setContacto(''); setTelefono(''); setCorreo('');

    } catch (error) {
      // 4. EL DEBUGGER: Imprimimos el error crudo en la consola (F12)
      console.error("🔥 Error crítico en guardarProveedor:", error)
      
      // Intentamos extraer el mensaje de la mejor manera posible
      const textoError = error.message || error.details || error.hint || JSON.stringify(error)
      setMensaje('Error al guardar: ' + textoError)
    }
  }

  async function desactivarProveedor(id) {
    if (!window.confirm("¿Estás seguro de desactivar este proveedor? No aparecerá en futuras compras.")) return;
    setMensaje('Desactivando proveedor...')
    try {
      const { error } = await supabase.from('proveedores').update({ activo: false }).eq('id', id)
      if (error) throw error
      setProveedores(proveedores.filter(item => item.id !== id))
      setMensaje('Proveedor desactivado exitosamente.')
    } catch (error) {
      setMensaje('Error al desactivar: ' + error.message)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Maestro de Proveedores</h1>
        <p className="text-slate-500 mt-2">Gestiona las entidades que suministran el inventario al jardín.</p>
      </header>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-8 shadow-sm">
        <span className="font-semibold">Estado:</span> {mensaje}
      </div>

      {/* Formulario */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Registrar Nuevo Proveedor</h3>
        
        <form onSubmit={guardarProveedor} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">NIT / RUT</label>
            <input type="text" required value={nit} onChange={(e) => setNit(e.target.value)} 
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. 900.123.456-7" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Razón Social</label>
            <input type="text" required value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} 
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. Distribuidora Escolar S.A." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Persona de Contacto</label>
            <input type="text" value={contacto} onChange={(e) => setContacto(e.target.value)} 
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. María Pérez (Ventas)" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} 
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo</label>
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} 
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="md:col-span-2 pt-2">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-sm">
              Guardar Proveedor
            </button>
          </div>
        </form>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-lg font-semibold text-slate-800">Directorio de Proveedores</h3>
        </div>
        {proveedores.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No hay proveedores registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                  <th className="p-4 font-semibold">NIT / RUT</th>
                  <th className="p-4 font-semibold">Razón Social</th>
                  <th className="p-4 font-semibold">Contacto</th>
                  <th className="p-4 font-semibold">Teléfono</th>
                  <th className="p-4 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {proveedores.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-600 font-medium">{item.nit}</td>
                    <td className="p-4 text-slate-800 font-bold">{item.razon_social}</td>
                    <td className="p-4 text-slate-600">{item.contacto || '-'}</td>
                    <td className="p-4 text-slate-600">{item.telefono || '-'}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => desactivarProveedor(item.id)} className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded transition-colors text-sm font-medium">
                        Desactivar
                      </button>
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