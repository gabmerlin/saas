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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!isAuthenticated) {
    return null; 
  }

  return <>{children}</>;
}