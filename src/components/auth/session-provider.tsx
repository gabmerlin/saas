/**
 * Provider de session centralisé
 */
'use client';

import { useEffect, useState } from 'react';
import { sessionManager } from '@/lib/auth/client/session-manager';

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  return <>{children}</>;
}