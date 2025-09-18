"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { syncSessionAcrossDomains, hasStoredSession } from "@/lib/auth/session-sync";

export default function SessionDebug() {
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [storedSession, setStoredSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSessions = async () => {
      try {
        // Synchroniser la session
        await syncSessionAcrossDomains();
        
        // Récupérer la session Supabase
        const supabase = supabaseBrowser();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        setSessionInfo({
          session: session ? {
            user: session.user?.email,
            expires_at: session.expires_at,
            access_token: session.access_token?.substring(0, 20) + '...'
          } : null,
          error: error?.message
        });

        // Récupérer la session stockée
        const hasStored = hasStoredSession();
        if (hasStored) {
          const stored = localStorage.getItem('supabase-session');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setStoredSession({
                user: parsed.user?.email,
                expires_at: parsed.expires_at,
                access_token: parsed.access_token?.substring(0, 20) + '...'
              });
            } catch (e) {
              setStoredSession({ error: 'Erreur de parsing' });
            }
          }
        } else {
          setStoredSession(null);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSessions();
  }, []);

  if (loading) {
    return <div className="p-4 bg-gray-100 rounded">Chargement des informations de session...</div>;
  }

  return (
    <div className="p-4 bg-gray-100 rounded space-y-4">
      <h3 className="font-bold text-lg">Debug Session</h3>
      
      <div className="space-y-2">
        <h4 className="font-semibold">Session Supabase:</h4>
        <pre className="text-xs bg-white p-2 rounded overflow-auto">
          {JSON.stringify(sessionInfo, null, 2)}
        </pre>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">Session Stockée:</h4>
        <pre className="text-xs bg-white p-2 rounded overflow-auto">
          {JSON.stringify(storedSession, null, 2)}
        </pre>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">Informations du domaine:</h4>
        <div className="text-sm">
          <p>Hostname: {typeof window !== 'undefined' ? window.location.hostname : 'N/A'}</p>
          <p>Subdomain: {typeof window !== 'undefined' ? window.location.hostname.split('.')[0] : 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}
