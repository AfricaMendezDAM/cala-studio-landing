import { createClient } from "@supabase/supabase-js";

// La clave "publishable" es pública por diseño: viaja al navegador.
// La seguridad real la imponen las políticas RLS de la base de datos.
const SUPABASE_URL = "https://iqhbmbecgxticqliiili.supabase.co";
const SUPABASE_KEY = "sb_publishable_ehjl1KXlt6SdYdQE7nDtEA_SNdwWxix";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // procesa el magic link al volver del email
  },
});
