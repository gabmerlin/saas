'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

interface SimpleCrossDomainProviderProps {
  children: React.ReactNode;
}

export function SimpleCrossDomainProvider({ children }: SimpleCrossDomainProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = supabaseBrowser();
        
        // Vérifier si on a une session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
        } else {
        }
        
        setIsReady(true);
      } catch (error) {
        setIsReady(true);
      }
    };

    init();
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}

