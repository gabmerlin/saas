'use client';

import { useEffect } from 'react';

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  useEffect(() => {
    // Temporairement désactivé pour isoler le problème OAuth
    console.log('SessionProvider initialisé (cross-domain désactivé)');
  }, []);

  return <>{children}</>;
}
