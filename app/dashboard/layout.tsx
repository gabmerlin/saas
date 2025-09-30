'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { supabaseBrowser } from '@/lib/supabase/client';
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

  console.log('🔄 DashboardLayout render:', { canAccess, checking, isLoading, isAuthenticated, hasChecked: hasChecked.current });

  useEffect(() => {
    const checkAgencyMembership = async () => {
      console.log('🔍 DashboardLayout - checkAgencyMembership start:', {
        hasChecked: hasChecked.current,
        isLoading,
        isAuthenticated,
        user: !!user,
        hostname: window.location.hostname,
        pathname: window.location.pathname,
        search: window.location.search
      });

      // Éviter les vérifications multiples
      if (hasChecked.current) {
        console.log('⏭️ Vérification déjà effectuée, skip');
        return;
      }

      // Essayer de restaurer la session depuis l'URL (pour tous les environnements)
      console.log('🔍 DashboardLayout - Initialisation session sync');
      await localhostSessionSync.initialize();

      // Attendre que l'authentification soit chargée
      if (isLoading) {
        console.log('🔍 DashboardLayout - En attente du chargement de l\'auth');
        return;
      }

      if (!user || !isAuthenticated) {
        console.log('❌ Utilisateur non authentifié, tentative de restauration de session:', { user: !!user, isAuthenticated });
        
        // Essayer de restaurer la session depuis les cookies cross-domain
        try {
          const supabase = supabaseBrowser();
          
          // D'abord, forcer la restauration de session
          console.log('🔍 Tentative de restauration forcée de session...');
          const { data: { session }, error } = await supabase.auth.getSession();
          
          console.log('🔍 Session trouvée:', { session: !!session, error });
          
          if (session && !error) {
            console.log('✅ Session restaurée depuis les cookies');
            // Attendre un peu pour que le hook useAuth se mette à jour
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Vérifier à nouveau après l'attente
            const { data: { session: newSession } } = await supabase.auth.getSession();
            if (newSession) {
              console.log('✅ Session confirmée après attente');
              return; // Relancer la vérification
            }
          } else {
            // Essayer de forcer la restauration depuis les cookies du navigateur
            console.log('🔍 Tentative de restauration depuis les cookies du navigateur...');
            
            // Récupérer tous les cookies
            const allCookies = document.cookie.split('; ');
            console.log('🔍 Cookies disponibles sur le sous-domaine:', allCookies);
            
            // Chercher les cookies Supabase
            const supabaseCookies = allCookies.filter(cookie => 
              cookie.includes('sb-') || 
              cookie.includes('supabase') || 
              cookie.includes('auth-token')
            );
            
            console.log('🔍 Cookies Supabase trouvés:', supabaseCookies);
            
            if (supabaseCookies.length > 0) {
              // Essayer de restaurer la session manuellement
              try {
                const { data: { session: restoredSession } } = await supabase.auth.getSession();
                if (restoredSession) {
                  console.log('✅ Session restaurée manuellement');
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  return; // Relancer la vérification
                }
              } catch (restoreError) {
                console.log('❌ Erreur lors de la restauration manuelle:', restoreError);
              }
            }
          }
        } catch (err) {
          console.log('❌ Impossible de restaurer la session:', err);
        }
        
        // Essayer de forcer la restauration de session depuis l'URL
        try {
          await localhostSessionSync.initialize();
          console.log('🔍 Tentative de restauration depuis l\'URL');
          
          // Attendre un peu et vérifier à nouveau
          await new Promise(resolve => setTimeout(resolve, 1000));
          const supabase = supabaseBrowser();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log('✅ Session restaurée depuis l\'URL');
            return; // Relancer la vérification
          }
        } catch (err) {
          console.log('❌ Impossible de restaurer depuis l\'URL:', err);
        }
        
        // Si toujours pas authentifié, rediriger vers le domaine principal
        const mainDomain = window.location.hostname.includes('localhost')
          ? 'http://localhost:3000'
          : 'https://qgchatting.com';
        
        const subdomain = getCurrentSubdomain();
        const redirectUrl = subdomain
          ? `${mainDomain}/home?subdomain=${subdomain}`
          : `${mainDomain}/home`;
        
        console.log('🔄 Redirection vers:', redirectUrl);
        window.location.href = redirectUrl;
        return;
      }

      try {
        // Récupérer le sous-domaine actuel
        const subdomain = getCurrentSubdomain();
        
        console.log('🔍 Vérification d\'appartenance:', { 
          userId: user.id, 
          subdomain, 
          isAuthenticated 
        });
        
        if (!subdomain) {
          // Si pas de sous-domaine, accès refusé
          console.log('❌ Pas de sous-domaine détecté');
          setCanAccess(false);
          setChecking(false);
          hasChecked.current = true;
          return;
        }

        // Utiliser l'API /api/agency/status pour vérifier l'accès
        console.log('🔍 Vérification via API agency/status...');
        console.log('🔍 User ID:', user.id);
        console.log('🔍 Subdomain:', subdomain);
        
        // Récupérer la session pour le token
        const supabase = supabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          console.log('❌ Pas de token d\'accès disponible');
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
        
        console.log('🔍 Réponse API agency/status:', response.status);
        
        if (!response.ok) {
          console.log('❌ Erreur API agency/status:', response.status);
          setCanAccess(false);
        } else {
          const data = await response.json();
          console.log('✅ Données API agency/status:', data);
          
          // Vérifier si l'utilisateur a accès (owner, admin, manager, employee, marketing)
          const hasAccess = data.status?.user_roles && data.status.user_roles.length > 0;
          
          console.log('🔍 Vérification d\'accès:', { 
            userRoles: data.status?.user_roles, 
            hasAccess 
          });
          
          setCanAccess(hasAccess);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'appartenance:', error);
        setCanAccess(false);
      } finally {
        setChecking(false);
        hasChecked.current = true;
      }
    };

    checkAgencyMembership();
  }, [user, isAuthenticated, isLoading]);

  useEffect(() => {
    console.log('🔍 État de redirection:', { checking, canAccess, shouldRedirect: !checking && canAccess === false });

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

        console.log('🚫 Accès refusé - Redirection vers:', redirectUrl);
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
