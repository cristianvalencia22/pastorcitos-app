import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // LA SOLUCIÓN: Cambiar la llave de almacenamiento fuerza una sesión limpia
    // y abandona cualquier "Lock" que haya quedado trabado en el caché viejo.
    storageKey: 'pastorcitos-token-v2', 
  }
})