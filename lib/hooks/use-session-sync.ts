'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export function useSessionSync() {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true);
        // Récupérer la session
        const supabase = supabaseBrowser();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          return;
        }

        setSession(session);
        setUser(session?.user || null);
      } catch (error) {
        // Erreur silencieuse
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();

    // Écouter les changements d'état d'authentification
    const supabase = supabaseBrowser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
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
      } else if (event === 'INITIAL_SESSION') {
        if (session) {
          setSession(session);
          setUser(session.user);
        }
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      const supabase = supabaseBrowser();
      await supabase.auth.signOut();
      
      // Nettoyer manuellement tous les cookies de session
      if (typeof document !== 'undefined') {
        // Nettoyer les cookies Supabase
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
          const [name] = cookie.trim().split('=');
          if (name.includes('supabase') || name.includes('session')) {
            // Supprimer pour le domaine actuel
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            // Supprimer pour le domaine parent
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.qgchatting.com`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=localhost`;
          }
        });
        
        // Nettoyer localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('session')) {
            localStorage.removeItem(key);
          }
        });
      }
      
      setSession(null);
      setUser(null);
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
