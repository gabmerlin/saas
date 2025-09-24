'use client';

import { useEffect } from 'react';
import { simpleSessionSync } from '@/lib/auth/simple-session-sync';

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  useEffect(() => {
    console.log('SessionProvider initialisé (simple session sync)');
    simpleSessionSync.initialize();
  }, []);

  return <>{children}</>;
}
