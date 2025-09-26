'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { supabaseBrowser } from '@/lib/supabase/client';
import { getCurrentSubdomain } from '@/lib/utils/cross-domain-redirect';

interface SubdomainLayoutProps {
  children: React.ReactNode;
}

export default function SubdomainLayout({ children }: SubdomainLayoutProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const hasChecked = useRef(false);
  
  console.log('🔄 SubdomainLayout render:', { canAccess, checking, isLoading, isAuthenticated, hasChecked: hasChecked.current });

  useEffect(() => {
    const checkAgencyMembership = async () => {
      // Éviter les vérifications multiples
      if (hasChecked.current) {
        console.log('⏭️ Vérification déjà effectuée, skip');
        return;
      }
      
      // Attendre que l'authentification soit chargée
      if (isLoading) {
        return;
      }

      if (!user || !isAuthenticated) {
        console.log('❌ Utilisateur non authentifié:', { user: !!user, isAuthenticated });
        setCanAccess(false);
        setChecking(false);
        hasChecked.current = true;
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

        // Vérifier si l'utilisateur est membre de cette agence
        console.log('🔍 Exécution de la requête Supabase...');
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
          
        console.log('🔍 Résultat de la requête Supabase:', { userTenants, error });

        if (error) {
          console.error('Erreur lors de la vérification de l\'appartenance:', error);
          setCanAccess(false);
        } else if (userTenants && userTenants.length > 0) {
          // L'utilisateur est membre de cette agence
          const userTenant = userTenants[0] as any;
          console.log('✅ Utilisateur membre de l\'agence:', subdomain, 'is_owner:', userTenant.is_owner);
          console.log('✅ Définition de canAccess à true');
          setCanAccess(true);
        } else {
          // L'utilisateur n'est pas membre de cette agence
          console.log('❌ Utilisateur non membre de l\'agence:', subdomain);
          console.log('🔍 Résultat de la requête:', { userTenants, error });
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
