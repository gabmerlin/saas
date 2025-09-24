'use client';

import { useEffect } from 'react';
import { crossDomainSession } from '@/lib/auth/cross-domain-session';

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  useEffect(() => {
    console.log('SessionProvider initialisé (cross-domain activé)');
    crossDomainSession.initialize();
  }, []);

  return <>{children}</>;
}
