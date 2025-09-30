'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { supabaseBrowserWithCookies } from '@/lib/supabase/client-global';
import { getCurrentSubdomain } from '@/lib/utils/cross-domain-redirect';
import { localhostSessionSync } from '@/lib/auth/client/localhost-session-sync';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const hasChecked = useRef(false);


      useEffect(() => {
        const checkAgencyMembership = async () => {
          // Éviter les vérifications multiples
          if (hasChecked.current) {
            return;
          }

          // Si on est sur le domaine principal (www.qgchatting.com), rediriger vers /home
          if (window.location.hostname === 'www.qgchatting.com' || window.location.hostname === 'qgchatting.com') {
            window.location.href = '/home';
            return;
          }

          // Essayer de restaurer la session depuis l'URL (pour tous les environnements)
          await localhostSessionSync.initialize();

          // Attendre que l'authentification soit chargée
          if (isLoading) {
            return;
          }

      if (!user || !isAuthenticated) {
        // Essayer de restaurer la session depuis les cookies cross-domain
        try {
          const supabase = supabaseBrowserWithCookies();
          
          // D'abord, forcer la restauration de session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (session && !error) {
            // Attendre un peu pour que le hook useAuth se mette à jour
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Vérifier à nouveau après l'attente
            const { data: { session: newSession } } = await supabase.auth.getSession();
            if (newSession) {
              return; // Relancer la vérification
            }
          } else {
            // Essayer de forcer la restauration depuis les cookies du navigateur
            const allCookies = document.cookie.split('; ');
            
            // Chercher les cookies Supabase
            const supabaseCookies = allCookies.filter(cookie => 
              cookie.includes('sb-') || 
              cookie.includes('supabase') || 
              cookie.includes('auth-token')
            );
            
            if (supabaseCookies.length > 0) {
              // Essayer de restaurer la session manuellement
              try {
                const { data: { session: restoredSession } } = await supabase.auth.getSession();
                if (restoredSession) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  return; // Relancer la vérification
                }
              } catch {
                // Erreur silencieuse
              }
            }
          }
        } catch {
          // Erreur silencieuse
        }
        
        // Essayer de forcer la restauration de session depuis l'URL
        try {
          await localhostSessionSync.initialize();
          
          // Attendre un peu et vérifier à nouveau
          await new Promise(resolve => setTimeout(resolve, 1000));
          const supabase = supabaseBrowserWithCookies();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            return; // Relancer la vérification
          }
        } catch {
          // Erreur silencieuse
        }
        
        // Si toujours pas authentifié, rediriger vers le domaine principal
        const mainDomain = window.location.hostname.includes('localhost')
          ? 'http://localhost:3000'
          : 'https://qgchatting.com';
        
        const subdomain = getCurrentSubdomain();
        const redirectUrl = subdomain
          ? `${mainDomain}/home?subdomain=${subdomain}`
          : `${mainDomain}/home`;
        
        window.location.href = redirectUrl;
        return;
      }

      try {
        // Récupérer le sous-domaine actuel
        const subdomain = getCurrentSubdomain();
        
        if (!subdomain) {
          // Si pas de sous-domaine, accès refusé
          setCanAccess(false);
          setChecking(false);
          hasChecked.current = true;
          return;
        }
        
        // Récupérer la session pour le token
        const supabase = supabaseBrowserWithCookies();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          setCanAccess(false);
          setChecking(false);
          hasChecked.current = true;
          return;
        }
        
        const response = await fetch(`/api/agency/status?subdomain=${subdomain}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'x-session-token': session.access_token
          }
        });
        
        if (!response.ok) {
          setCanAccess(false);
        } else {
          const data = await response.json();
          
          // Vérifier si l'utilisateur a accès (owner, admin, manager, employee, marketing)
          const hasAccess = data.status?.user_roles && data.status.user_roles.length > 0;
          
          setCanAccess(hasAccess);
        }
      } catch {
        setCanAccess(false);
      } finally {
        setChecking(false);
        hasChecked.current = true;
      }
    };

    checkAgencyMembership();
  }, [user, isAuthenticated, isLoading]);

  useEffect(() => {
    if (!checking && canAccess === false) {
      // Rediriger vers le domaine principal avec la page d'accès refusé
      if (typeof window !== 'undefined') {
        const subdomain = getCurrentSubdomain();
        const mainDomainUrl = window.location.hostname.includes('localhost')
          ? 'http://localhost:3000'
          : 'https://qgchatting.com';

        const redirectUrl = subdomain
          ? `${mainDomainUrl}/access-denied?subdomain=${subdomain}`
          : `${mainDomainUrl}/access-denied`;

        window.location.href = redirectUrl;
      }
    }
  }, [canAccess, checking]);

  if (isLoading || checking) {
    return (
      <LoadingScreen
        message="Vérification de l'accès"
        submessage="Contrôle de votre appartenance à l'agence..."
        variant="minimal"
      />
    );
  }

  if (!canAccess) {
    return (
      <LoadingScreen
        message="Redirection en cours..."
        submessage="Vous allez être redirigé vers la page d'accès refusé"
        variant="default"
      />
    );
  }

  return <>{children}</>;
}
