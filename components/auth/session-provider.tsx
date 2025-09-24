'use client';

import { useEffect } from 'react';
import { sessionSync } from '@/lib/auth/session-sync';

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  useEffect(() => {
    // Initialiser la synchronisation de session locale
    sessionSync.initialize();
  }, []);

  return <>{children}</>;
}
