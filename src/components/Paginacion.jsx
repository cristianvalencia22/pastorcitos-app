import React from 'react';

export default function Paginacion({ paginaActual, totalPaginas, onCambioPagina }) {
  // Si no hay datos suficientes para paginar, ocultamos el control
  if (totalPaginas <= 1) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
      <span className="text-sm text-slate-500">
        Mostrando página <strong className="font-bold text-slate-800">{paginaActual}</strong> de <strong className="font-bold text-slate-800">{totalPaginas}</strong>
      </span>
      <div className="flex gap-2">
        <button 
          onClick={() => onCambioPagina(paginaActual - 1)} 
          disabled={paginaActual === 1}
          className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          &larr; Anterior
        </button>
        <button 
          onClick={() => onCambioPagina(paginaActual + 1)} 
          disabled={paginaActual === totalPaginas}
          className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          Siguiente &rarr;
        </button>
      </div>
    </div>
  );
}