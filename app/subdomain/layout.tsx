'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { supabaseBrowser } from '@/lib/supabase/client';
import { getCurrentSubdomain } from '@/lib/utils/cross-domain-redirect';
import { localhostSessionSync } from '@/lib/auth/client/localhost-session-sync';
import { crossDomainSessionSync } from '@/lib/auth/client/cross-domain-session-sync';

interface SubdomainLayoutProps {
  children: React.ReactNode;
}

export default function SubdomainLayout({ children }: SubdomainLayoutProps) {
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
      
      // Attendre que l'authentification soit chargée
      if (isLoading) {
        return;
      }

      // Initialiser la synchronisation des sessions
      console.log('🔍 SUBDOMAIN LAYOUT: Initializing session sync');
      await localhostSessionSync.initialize();
      
      // Essayer de restaurer la session cross-domain si pas authentifié
      if (!isAuthenticated) {
        console.log('🔍 SUBDOMAIN LAYOUT: Not authenticated, trying to restore session');
        console.log('🔍 SUBDOMAIN LAYOUT: Current cookies:', document.cookie);
        
        // Essayer de récupérer la session depuis le domaine principal
        try {
          console.log('🔍 SUBDOMAIN LAYOUT: Fetching session from main domain');
          const mainDomain = window.location.hostname.includes('localhost') 
            ? 'http://localhost:3000' 
            : 'https://qgchatting.com';
          
          const response = await fetch(`${mainDomain}/api/auth/session`, {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const sessionData = await response.json();
            console.log('🔍 SUBDOMAIN LAYOUT: Session data from main domain:', !!sessionData.session);
            
            if (sessionData.session) {
              // Restaurer la session dans Supabase
              const supabase = supabaseBrowser();
              const { error } = await supabase.auth.setSession({
                access_token: sessionData.session.access_token,
                refresh_token: sessionData.session.refresh_token
              });
              
              if (!error) {
                console.log('✅ SUBDOMAIN LAYOUT: Session restored from main domain');
                // Attendre un peu pour que le hook useAuth se mette à jour
                await new Promise(resolve => setTimeout(resolve, 500));
              } else {
                console.error('❌ SUBDOMAIN LAYOUT: Error setting session:', error);
              }
            }
          }
        } catch (error) {
          console.error('❌ SUBDOMAIN LAYOUT: Error fetching session from main domain:', error);
        }
        
        const restored = await crossDomainSessionSync.restoreSessionInSupabase();
        console.log('🔍 SUBDOMAIN LAYOUT: Session restore result:', restored);
        if (!restored) {
          console.log('❌ SUBDOMAIN LAYOUT: Session restore failed, denying access');
          setCanAccess(false);
          setChecking(false);
          hasChecked.current = true;
          return;
        }
        
        // Attendre un peu pour que le hook useAuth se mette à jour
        console.log('🔍 SUBDOMAIN LAYOUT: Waiting for useAuth to update...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('🔍 SUBDOMAIN LAYOUT: Auth check:', { user: !!user, isAuthenticated });
      if (!user || !isAuthenticated) {
        console.log('❌ SUBDOMAIN LAYOUT: User not authenticated after sync, denying access');
        setCanAccess(false);
        setChecking(false);
        hasChecked.current = true;
        return;
      }

      try {
        // Récupérer le sous-domaine actuel
        const subdomain = getCurrentSubdomain();
        console.log('🔍 SUBDOMAIN LAYOUT: Current subdomain:', subdomain);
        
        if (!subdomain) {
          // Si pas de sous-domaine, accès refusé
          console.log('❌ SUBDOMAIN LAYOUT: No subdomain detected, denying access');
          setCanAccess(false);
          setChecking(false);
          hasChecked.current = true;
          return;
        }

        console.log('🔍 SUBDOMAIN LAYOUT: Checking agency membership for user:', user.id);
        // Vérifier si l'utilisateur est membre de cette agence
        const { data: userTenants, error } = await supabaseBrowser()
          .from('user_tenants')
          .select(`
            tenant_id,
            is_owner,
            tenants!inner(
              id,
              name,
              subdomain
            )
          `)
          .eq('user_id', user.id)
          .eq('tenants.subdomain', subdomain);
          
        console.log('🔍 SUBDOMAIN LAYOUT: Database query result:', { userTenants, error });

        if (error) {
          console.error('❌ SUBDOMAIN LAYOUT: Database error:', error);
          setCanAccess(false);
        } else if (userTenants && userTenants.length > 0) {
          // L'utilisateur est membre de cette agence
          const userTenant = userTenants[0] as any;
          console.log('✅ SUBDOMAIN LAYOUT: User is member of agency:', { 
            subdomain, 
            is_owner: userTenant.is_owner,
            tenant_id: userTenant.tenant_id 
          });
          setCanAccess(true);
        } else {
          // L'utilisateur n'est pas membre de cette agence
          console.log('❌ SUBDOMAIN LAYOUT: User is not member of agency:', subdomain);
          setCanAccess(false);
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
    console.log('🔍 SUBDOMAIN LAYOUT: Access check result:', { checking, canAccess });
    
    if (!checking && canAccess === false) {
      // Rediriger vers le domaine principal avec la page d'accès refusé
      console.log('🚫 SUBDOMAIN LAYOUT: Access denied, redirecting to main domain');
      if (typeof window !== 'undefined') {
        const subdomain = getCurrentSubdomain();
        const mainDomainUrl = window.location.hostname.includes('localhost') 
          ? 'http://localhost:3000' 
          : 'https://qgchatting.com';
        
        const redirectUrl = subdomain 
          ? `${mainDomainUrl}/access-denied?subdomain=${subdomain}`
          : `${mainDomainUrl}/access-denied`;
        
        console.log('🔄 SUBDOMAIN LAYOUT: Redirecting to:', redirectUrl);
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
