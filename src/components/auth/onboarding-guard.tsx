/**
 * Guard pour l'onboarding - permet aux utilisateurs authentifiés d'accéder à la création d'agence
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { supabaseBrowser } from '@/lib/supabase/client';

interface OnboardingGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function OnboardingGuard({ 
  children, 
  redirectTo = '/home',
  fallback = (
    <LoadingScreen 
      message="Vérification de l'onboarding"
      submessage="Contrôle de votre statut d'agence..."
      variant="minimal"
    />
  )
}: OnboardingGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
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
        // Vérifier si l'utilisateur a déjà une agence
        const { data: userTenants, error } = await supabaseBrowser()
          .from('user_tenants')
          .select('is_owner')
          .eq('user_id', user.id)
          .eq('is_owner', true);

        if (error) {
          // En cas d'erreur, permettre l'accès (l'utilisateur pourra créer son agence)
          setCanAccess(true);
        } else {
          // Si l'utilisateur a déjà une agence, le rediriger vers le dashboard
          if (userTenants && userTenants.length > 0) {
            setCanAccess(false);
          } else {
            // Si l'utilisateur n'a pas d'agence, lui permettre de créer une agence
            setCanAccess(true);
          }
        }
          } catch {
        // En cas d'erreur, permettre l'accès
        setCanAccess(true);
      } finally {
        setChecking(false);
      }
    };

    checkAccess();
  }, [user, isAuthenticated, isLoading]);

  useEffect(() => {
    if (!checking && !canAccess) {
      router.push(redirectTo);
    }
  }, [canAccess, checking, router, redirectTo]);

  if (isLoading || checking) {
    return <>{fallback}</>;
  }

  if (!canAccess) {
    return null;
  }

  return <>{children}</>;
}
