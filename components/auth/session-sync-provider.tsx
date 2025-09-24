'use client';

import { useEffect } from 'react';
import { sessionSync } from '@/lib/auth/session-sync';

interface SessionSyncProviderProps {
  children: React.ReactNode;
}

export function SessionSyncProvider({ children }: SessionSyncProviderProps) {
  useEffect(() => {
    // Initialiser la synchronisation de session locale
    sessionSync.initialize();
  }, []);

  return <>{children}</>;
}
