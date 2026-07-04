import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase.js";

// Sesión + perfil del usuario. Login por "magic link" (sin contraseñas).
export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;

  const loadProfile = useCallback(async () => {
    if (!user) { setProfile(null); return; }
    const { data } = await supabase
      .from("profiles").select("nombre, telefono, is_admin").eq("id", user.id).maybeSingle();
    setProfile(data ?? null);
  }, [user]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // El nombre/teléfono viajan como metadata: el trigger handle_new_user los
  // vuelca al perfil, así el perfil ya llega completo al volver del enlace.
  // Redirect a la raíz (no a #/reservar): con PKCE el ?code se corrompería tras
  // el #. App.jsx salta a #/reservar al detectar el login con reserva pendiente.
  const signInWithEmail = (email, { nombre, telefono } = {}) =>
    supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nombre, telefono },
      },
    });

  const saveProfile = async ({ nombre, telefono }) => {
    if (!user) return { error: new Error("Sin sesión") };
    const { error } = await supabase.from("profiles")
      .upsert({ id: user.id, nombre, telefono });
    if (!error) await loadProfile();
    return { error };
  };

  const signOut = () => supabase.auth.signOut();

  const profileComplete = !!(profile && profile.nombre && profile.telefono);
  const isAdmin = !!(profile && profile.is_admin);

  return { user, session, loading, profile, profileComplete, isAdmin,
           signInWithEmail, saveProfile, signOut };
}
