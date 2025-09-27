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
      await localhostSessionSync.initialize();
      
      // Essayer de restaurer la session cross-domain si pas authentifié
      if (!isAuthenticated) {
        const restored = await crossDomainSessionSync.restoreSessionInSupabase();
        if (!restored) {
          setCanAccess(false);
          setChecking(false);
          hasChecked.current = true;
          return;
        }
        
        // Attendre un peu pour que le hook useAuth se mette à jour
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!user || !isAuthenticated) {
        setCanAccess(false);
        setChecking(false);
        hasChecked.current = true;
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
          

        if (error) {
          console.error('Erreur lors de la vérification de l\'appartenance:', error);
          setCanAccess(false);
        } else if (userTenants && userTenants.length > 0) {
          // L'utilisateur est membre de cette agence
          const userTenant = userTenants[0] as any;
          setCanAccess(true);
        } else {
          // L'utilisateur n'est pas membre de cette agence
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
