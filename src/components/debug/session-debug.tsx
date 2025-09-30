'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export function SessionDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const getDebugInfo = async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        const allCookies = document.cookie.split('; ');
        const supabaseCookies = allCookies.filter(cookie => 
          cookie.includes('sb-') || 
          cookie.includes('supabase') || 
          cookie.includes('auth-token')
        );

        setDebugInfo({
          hostname: window.location.hostname,
          pathname: window.location.pathname,
          search: window.location.search,
          session: session ? {
            user: session.user?.email,
            expires_at: session.expires_at,
            access_token: session.access_token ? 'présent' : 'absent'
          } : null,
          error: error?.message || null,
          allCookies: allCookies,
          supabaseCookies: supabaseCookies,
          cookieCount: allCookies.length
        });
      } catch (err) {
        setDebugInfo({
          error: err instanceof Error ? err.message : 'Erreur inconnue'
        });
      }
    };

    getDebugInfo();
  }, []);

  if (!debugInfo) {
    return <div>Chargement des informations de debug...</div>;
  }

  return (
    <div className="bg-gray-100 p-4 rounded-lg text-xs font-mono">
      <h3 className="font-bold mb-2">🐛 Debug Session</h3>
      <div className="space-y-1">
        <div><strong>Hostname:</strong> {debugInfo.hostname}</div>
        <div><strong>Pathname:</strong> {debugInfo.pathname}</div>
        <div><strong>Search:</strong> {debugInfo.search}</div>
        <div><strong>Session:</strong> {debugInfo.session ? '✅' : '❌'}</div>
        {debugInfo.session && (
          <div className="ml-4">
            <div>User: {debugInfo.session.user}</div>
            <div>Expires: {new Date(debugInfo.session.expires_at * 1000).toLocaleString()}</div>
            <div>Token: {debugInfo.session.access_token}</div>
          </div>
        )}
        <div><strong>Cookies totaux:</strong> {debugInfo.cookieCount}</div>
        <div><strong>Cookies Supabase:</strong> {debugInfo.supabaseCookies.length}</div>
        {debugInfo.supabaseCookies.length > 0 && (
          <div className="ml-4">
            {debugInfo.supabaseCookies.map((cookie: string, index: number) => (
              <div key={index}>- {cookie}</div>
            ))}
          </div>
        )}
        {debugInfo.error && (
          <div className="text-red-600"><strong>Erreur:</strong> {debugInfo.error}</div>
        )}
      </div>
    </div>
  );
}
