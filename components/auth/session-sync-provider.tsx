'use client';

import { useEffect } from 'react';
import { initializeSessionSync } from '@/lib/auth/cross-domain-auth';

interface SessionSyncProviderProps {
  children: React.ReactNode;
}

export function SessionSyncProvider({ children }: SessionSyncProviderProps) {
  useEffect(() => {
    // Initialiser la synchronisation de session au chargement de la page
    initializeSessionSync();
  }, []);

  return <>{children}</>;
}
