/**
 * Guard pour les propriétaires centralisé
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabaseBrowser } from '@/lib/supabase/client';

interface OwnerGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function OwnerGuard({ 
  children, 
  redirectTo = '/home',
  fallback = (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
}: OwnerGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkOwnerStatus = async () => {
      if (!user || !isAuthenticated) {
        setIsOwner(false);
        setChecking(false);
        return;
      }

      try {
        // Vérifier si l'utilisateur est propriétaire d'au moins une agence
        const { data: userTenants, error } = await supabaseBrowser()
          .from('user_tenants')
          .select('is_owner')
          .eq('user_id', user.id)
          .eq('is_owner', true);

        if (error) {
          setIsOwner(false);
        } else {
          setIsOwner(userTenants && userTenants.length > 0);
        }
          } catch {
        setIsOwner(false);
      } finally {
        setChecking(false);
      }
    };

    checkOwnerStatus();
  }, [user, isAuthenticated]);

  useEffect(() => {
    if (!checking && !isOwner) {
      router.push(redirectTo);
    }
  }, [isOwner, checking, router, redirectTo]);

  if (isLoading || checking) {
    return <>{fallback}</>;
  }

  if (!isOwner) {
    return null;
  }

  return <>{children}</>;
}