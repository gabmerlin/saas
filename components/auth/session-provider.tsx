'use client';

import { useEffect } from 'react';
import { crossDomainCookies } from '@/lib/auth/cross-domain-cookies';

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  useEffect(() => {
    console.log('SessionProvider initialisé (cross-domain cookies)');
    crossDomainCookies.initialize();
  }, []);

  return <>{children}</>;
}
