'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { crossDomainLogout } from '@/lib/auth/client/cross-domain-logout';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    
    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      
      if (event === 'INITIAL_SESSION') {
        // Session initiale - récupérer la session actuelle
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setIsLoading(false);
      } else if (event === 'SIGNED_IN' && session) {
        setSession(session);
        setUser(session.user);
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setIsLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setSession(session);
        setUser(session.user);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (isSigningOut) return; // Empêcher les déconnexions multiples
    
    setIsSigningOut(true);
    
    try {
      // Mettre à jour l'état local immédiatement
      setSession(null);
      setUser(null);
      setIsLoading(false);
      
      // Utiliser la déconnexion cross-domain
      await crossDomainLogout.signOut();
      
    } catch (error) {
      // En cas d'erreur, forcer la redirection
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/sign-in';
      }
    } finally {
      setIsSigningOut(false);
    }
  };

  return {
    isLoading,
    session,
    user,
    isAuthenticated: !!user,
    isSigningOut,
    signOut
  };
}
