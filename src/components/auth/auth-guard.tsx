/**
 * Guard d'authentification centralisé
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function AuthGuard({ 
  children, 
  redirectTo = '/auth/sign-in',
  fallback = (
    <LoadingScreen 
      message="Vérification de l'authentification"
      submessage="Veuillez patienter..."
      variant="minimal"
    />
  )
}: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Vérifier si un paiement est en cours
  const isPaymentInProgress = () => {
    if (typeof window === 'undefined') return false;
    
    // Vérifier les paramètres URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'processing') return true;
    
    // Vérifier le localStorage
    return localStorage.getItem('paymentInProgress') === 'true';
  };

  useEffect(() => {
    // Ne pas rediriger si un paiement est en cours
    if (!isLoading && !isAuthenticated && !isPaymentInProgress()) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  if (isLoading) {
    return <>{fallback}</>;
  }

  // Permettre l'accès si l'utilisateur est authentifié OU si un paiement est en cours
  if (!isAuthenticated && !isPaymentInProgress()) {
    return null; 
  }

  return <>{children}</>;
}