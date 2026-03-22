import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    // Inicializamos el estado de la máquina en "sin errores"
    this.state = { tieneError: false, mensajeError: '' };
  }

  // Este método se dispara un milisegundo antes de que la app colapse
  static getDerivedStateFromError(error) {
    return { tieneError: true, mensajeError: error.message };
  }

  // Este método registra el error en la consola para que el desarrollador lo vea
  componentDidCatch(error, errorInfo) {
    console.error("🔥 ErrorBoundary atrapó un fallo crítico en el árbol de React:", error, errorInfo);
  }

  // La acción de escape para el usuario final (El "Botón del Pánico")
  limpiarCacheYRecargar = () => {
    // 1. Destruimos la sesión corrupta de Supabase en memoria
    localStorage.clear();
    sessionStorage.clear();
    
    // 2. Forzamos una recarga dura (Hard Refresh) al inicio de la app
    window.location.replace('/'); 
  }

  render() {
    // Si la máquina de estado detectó un error, dibujamos la pantalla de rescate
    if (this.state.tieneError) {
      return (
        <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-sans text-stone-800">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden p-8 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl border-2 border-red-100">
              ⚠️
            </div>
            <h1 className="text-2xl font-bold text-stone-900 mb-2 tracking-tight">Desincronización del Sistema</h1>
            <p className="text-stone-500 text-sm mb-6 leading-relaxed">
              La aplicación detectó un estado inválido en la memoria local o un fallo crítico de red. 
              Para proteger la integridad de los datos financieros, la ejecución ha sido pausada.
            </p>
            
            {/* Ocultamos el error técnico complejo para no asustar al usuario, pero lo dejamos disponible por si acaso */}
            <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 text-xs text-stone-400 font-mono mb-8 text-left overflow-auto max-h-32 shadow-inner">
              <strong className="block mb-1 text-stone-500">Log Técnico:</strong>
              {this.state.mensajeError || 'Error desconocido en el árbol de componentes.'}
            </div>

            <button 
              onClick={this.limpiarCacheYRecargar}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-lg transition-colors shadow-lg text-sm tracking-wide"
            >
              Restablecer y Recargar Sistema
            </button>
          </div>
        </div>
      );
    }

    // Si no hay errores, dibujamos la aplicación normalmente
    return this.props.children;
  }
}

export default ErrorBoundary;