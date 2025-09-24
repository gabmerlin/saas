'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

export default function AuthGuard({ 
  children, 
  fallback = <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Vérification de l&apos;authentification...</p>
    </div>
  </div>,
  redirectTo = '/sign-in',
  requireAuth = true
}: AuthGuardProps) {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isLoading, isAuthenticated, requireAuth, router, redirectTo]);

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (requireAuth && !isAuthenticated) {
    return null; // Ne rien afficher, la redirection se fait dans useEffect
  }

  return <>{children}</>;
}