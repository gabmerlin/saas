/**
 * Provider de session centralisé
 */
'use client';


interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {


  return <>{children}</>;
}