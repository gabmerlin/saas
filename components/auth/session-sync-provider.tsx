'use client';

import { useEffect } from 'react';

interface SessionSyncProviderProps {
  children: React.ReactNode;
}

export function SessionSyncProvider({ children }: SessionSyncProviderProps) {
  useEffect(() => {
    // Initialisation simple sans dépendances complexes
  }, []);

  return <>{children}</>;
}
