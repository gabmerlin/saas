'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { supabaseBrowserWithCookies } from '@/lib/supabase/client-with-cookies';
import { getCurrentSubdomain, redirectToMainDomain } from '@/lib/utils/cross-domain-redirect';

interface AgencyOwnerGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function AgencyOwnerGuard({ 
  children, 
  redirectTo = '/access-denied',
  fallback = (
    <LoadingScreen 
      message="Vérification des permissions"
      submessage="Contrôle de votre statut de propriétaire..."
      variant="minimal"
    />
  )
}: AgencyOwnerGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkOwnerStatus = async () => {
      // Attendre que l'authentification soit chargée
      if (isLoading) {
        return;
      }

      if (!user || !isAuthenticated) {
        setCanAccess(false);
        setChecking(false);
        return;
      }

      try {
        // Récupérer le sous-domaine actuel
        const subdomain = getCurrentSubdomain();
        
        if (!subdomain) {
          // Si pas de sous-domaine, accès refusé
          setCanAccess(false);
          setChecking(false);
          return;
        }

        // Vérifier si l'utilisateur est propriétaire de cette agence
        const { data: userTenants, error } = await supabaseBrowserWithCookies()
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
          .eq('tenants.subdomain', subdomain)
          .eq('is_owner', true);

        if (error) {
          console.error('Erreur lors de la vérification du statut de propriétaire:', error);
          setCanAccess(false);
        } else if (userTenants && userTenants.length > 0) {
          // L'utilisateur est propriétaire de cette agence
          setCanAccess(true);
        } else {
          // L'utilisateur n'est pas propriétaire de cette agence
          setCanAccess(false);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du statut de propriétaire:', error);
        setCanAccess(false);
      } finally {
        setChecking(false);
      }
    };

    checkOwnerStatus();
  }, [user, isAuthenticated, isLoading]);

  useEffect(() => {
    if (!checking && !canAccess) {
      // Rediriger vers la page d'accès refusé sur le sous-domaine
      // qui se chargera de rediriger vers le domaine principal
      if (typeof window !== 'undefined') {
        window.location.href = '/access-denied';
      }
    }
  }, [canAccess, checking]);

  if (isLoading || checking) {
    return <>{fallback}</>;
  }

  if (!canAccess) {
    return null;
  }

  return <>{children}</>;
}
