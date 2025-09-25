'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { crossDomainSync } from '@/lib/auth/cross-domain-sync';

interface CrossDomainSessionProviderProps {
  children: React.ReactNode;
}

export function CrossDomainSessionProvider({ children }: CrossDomainSessionProviderProps) {
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    const initializeCrossDomainSession = async () => {
      try {
        
        const supabase = supabaseBrowser();
        
        // 1. Récupérer la session actuelle
        const currentSession = crossDomainSync.getCurrentSession();
        if (currentSession) {
          await supabase.auth.setSession({
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token,
          });
        }

        // 2. Écouter les changements de session Supabase
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          
          // Synchroniser avec les autres domaines (sans déclencher les listeners locaux)
          crossDomainSync.syncSession(session, true);
        });

        // 3. Écouter les changements cross-domain
        const unsubscribeCrossDomain = crossDomainSync.onSessionChange(async (session) => {
          
          if (session) {
            // Restaurer la session dans Supabase
            await supabase.auth.setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            });
          } else {
            // Déconnexion - utiliser le système unifié
            const { crossDomainLogout } = await import('@/lib/auth/client/cross-domain-logout');
            await crossDomainLogout.signOut();
          }
        });

        setIsSyncing(false);

        return () => {
          subscription.unsubscribe();
          unsubscribeCrossDomain();
        };
        } catch {
        setIsSyncing(false);
      }
    };

    const cleanup = initializeCrossDomainSession();
    
    return () => {
      if (cleanup) {
        cleanup.then(cleanupFn => cleanupFn?.());
      }
    };
  }, []);

  if (isSyncing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-2">Synchronisation cross-domain...</p>
      </div>
    );
  }

  return <>{children}</>;
}