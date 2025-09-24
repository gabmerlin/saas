'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    
    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
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
    try {
      const supabase = supabaseBrowser();
      
      // Déconnexion Supabase
      await supabase.auth.signOut();
      
      // Nettoyer localStorage et sessionStorage
      if (typeof window !== 'undefined') {
        // Nettoyer toutes les clés liées à Supabase
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('session') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
        
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('session') || key.includes('sb-')) {
            sessionStorage.removeItem(key);
          }
        });
        
        // Nettoyer les cookies
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
      }
      
      // Mettre à jour l'état local
      setSession(null);
      setUser(null);
      setIsLoading(false);
      
      console.log('Déconnexion terminée');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return {
    isLoading,
    session,
    user,
    isAuthenticated: !!user,
    signOut
  };
}
