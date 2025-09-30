'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowserWithCookies } from '@/lib/supabase/client-with-cookies';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface SimpleCrossDomainProviderProps {
  children: React.ReactNode;
}

export function SimpleCrossDomainProvider({ children }: SimpleCrossDomainProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = supabaseBrowserWithCookies();
        
        // Vérifier si on a une session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
        } else {
        }
        
        setIsReady(true);
      } catch {
        setIsReady(true);
      }
    };

    init();
  }, []);

  if (!isReady) {
    return (
      <LoadingScreen 
        message="Chargement..."
        variant="default"
      />
    );
  }

  return <>{children}</>;
}

