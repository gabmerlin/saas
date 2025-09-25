/**
 * Initialiseur de synchronisation cross-domain
 */
'use client';

import { useEffect } from 'react';
import { crossDomainSessionSync } from '@/lib/auth/client/cross-domain-session-sync';
import { localhostSessionSync } from '@/lib/auth/client/localhost-session-sync';

interface CrossDomainSessionInitializerProps {
  children: React.ReactNode;
}

export function CrossDomainSessionInitializer({ children }: CrossDomainSessionInitializerProps) {
  useEffect(() => {
    // Initialiser la synchronisation cross-domain
    crossDomainSessionSync.initialize();
    
    // Initialiser la synchronisation localhost
    localhostSessionSync.initialize();
  }, []);

  return <>{children}</>;
}
