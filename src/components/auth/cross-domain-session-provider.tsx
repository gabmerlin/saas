'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowserWithCookies } from '@/lib/supabase/client-with-cookies';
import { crossDomainSync } from '@/lib/auth/cross-domain-sync';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface CrossDomainSessionProviderProps {
  children: React.ReactNode;
}

export function CrossDomainSessionProvider({ children }: CrossDomainSessionProviderProps) {
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    const initializeCrossDomainSession = async () => {
      try {
        
        const supabase = supabaseBrowserWithCookies();
        
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
          // Vérifier si un paiement est en cours
          const isPaymentInProgress = () => {
            if (typeof window === 'undefined') return false;
            
            // Vérifier les paramètres URL
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('payment') === 'processing') return true;
            
            // Vérifier le localStorage
            return localStorage.getItem('paymentInProgress') === 'true';
          };

          // Ne pas synchroniser si un paiement est en cours
          if (!isPaymentInProgress()) {
            // Synchroniser avec les autres domaines (sans déclencher les listeners locaux)
            crossDomainSync.syncSession(session, true);
          }
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
      <LoadingScreen 
        message="Synchronisation des sessions"
        submessage="Synchronisation cross-domain en cours..."
        variant="default"
      />
    );
  }

  return <>{children}</>;
}