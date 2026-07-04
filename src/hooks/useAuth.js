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

  // Identificación por CÓDIGO de 6 dígitos (no enlace): se teclea en la misma
  // pantalla, sin salir de la web ni volver a rellenar nada. El nombre/teléfono
  // viajan como metadata (el trigger los vuelca al perfil de usuarios nuevos).
  const sendCode = (email, { nombre, telefono } = {}) =>
    supabase.auth.signInWithOtp({
      email,
      options: { data: { nombre, telefono }, shouldCreateUser: true },
    });

  const verifyCode = (email, token) =>
    supabase.auth.verifyOtp({ email, token, type: "email" });

  const saveProfile = async ({ nombre, telefono }) => {
    // Coge el usuario del cliente (recién verificado), no del estado del hook,
    // que puede no haberse propagado todavía tras verificar el código.
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return { error: new Error("Sin sesión") };
    const { error } = await supabase.from("profiles")
      .upsert({ id: u.id, nombre, telefono });
    if (!error) await loadProfile();
    return { error };
  };

  const signOut = () => supabase.auth.signOut();

  const profileComplete = !!(profile && profile.nombre && profile.telefono);
  const isAdmin = !!(profile && profile.is_admin);

  return { user, session, loading, profile, profileComplete, isAdmin,
           sendCode, verifyCode, saveProfile, signOut };
}
