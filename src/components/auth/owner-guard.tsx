/**
 * Guard pour les propriétaires centralisé
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { supabaseBrowserWithCookies } from '@/lib/supabase/client-with-cookies';

interface OwnerGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function OwnerGuard({ 
  children, 
  redirectTo = '/home',
  fallback = (
    <LoadingScreen 
      message="Vérification des permissions"
      submessage="Contrôle de votre statut de propriétaire..."
      variant="minimal"
    />
  )
}: OwnerGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  // Vérifier si un paiement est en cours (via URL ou localStorage)
  const isPaymentInProgress = () => {
    if (typeof window === 'undefined') return false;
    
    // Vérifier les paramètres URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'processing') return true;
    
    // Vérifier le localStorage
    return localStorage.getItem('paymentInProgress') === 'true';
  };

  useEffect(() => {
    const checkOwnerStatus = async () => {
      if (!user || !isAuthenticated) {
        setIsOwner(false);
        setChecking(false);
        return;
      }

      try {
        // Vérifier si l'utilisateur est propriétaire d'au moins une agence
        const { data: userTenants, error } = await supabaseBrowserWithCookies()
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
    // Ne pas rediriger si un paiement est en cours
    if (!checking && !isOwner && !isPaymentInProgress()) {
      router.push(redirectTo);
    }
  }, [isOwner, checking, router, redirectTo]);

  if (isLoading || checking) {
    return <>{fallback}</>;
  }

  // Permettre l'accès si l'utilisateur est propriétaire OU si un paiement est en cours
  if (!isOwner && !isPaymentInProgress()) {
    return null;
  }

  return <>{children}</>;
}