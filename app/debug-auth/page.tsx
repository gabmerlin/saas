'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function DebugAuthPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [session, setSession] = useState<any>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const debugAuth = async () => {
      addLog('=== DÉBUT DU DEBUG AUTH ===');
      
      // 1. Vérifier l'URL
      addLog(`URL actuelle: ${window.location.href}`);
      addLog(`Search params: ${window.location.search}`);
      
      // 2. Vérifier les paramètres OAuth
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      
      addLog(`Code OAuth: ${code ? 'PRÉSENT' : 'ABSENT'}`);
      addLog(`Erreur OAuth: ${error || 'AUCUNE'}`);
      
      // 3. Vérifier la session actuelle
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabaseBrowser().auth.getSession();
        addLog(`Session actuelle: ${currentSession ? 'PRÉSENTE' : 'ABSENTE'}`);
        if (sessionError) addLog(`Erreur session: ${sessionError.message}`);
        setSession(currentSession);
      } catch (error) {
        addLog(`Erreur getSession: ${error}`);
      }
      
      // 4. Si il y a un code, essayer de l'échanger
      if (code) {
        addLog('Tentative d\'échange du code OAuth...');
        try {
          const { data, error: exchangeError } = await supabaseBrowser().auth.exchangeCodeForSession(code);
          addLog(`Échange réussi: ${data ? 'OUI' : 'NON'}`);
          if (exchangeError) addLog(`Erreur échange: ${exchangeError.message}`);
          if (data?.session) {
            addLog('Session créée avec succès !');
            setSession(data.session);
          }
        } catch (error) {
          addLog(`Erreur exchangeCodeForSession: ${error}`);
        }
      }
      
      addLog('=== FIN DU DEBUG ===');
    };

    debugAuth();
  }, []);

  const testGoogleAuth = async () => {
    addLog('Démarrage de l\'authentification Google...');
    try {
      const { data, error } = await supabaseBrowser().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'email profile'
        }
      });
      
      if (error) {
        addLog(`Erreur OAuth: ${error.message}`);
      } else {
        addLog('Redirection OAuth lancée...');
      }
    } catch (error) {
      addLog(`Erreur: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Debug Authentification</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Session Actuelle</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {session ? JSON.stringify(session, null, 2) : 'Aucune session'}
          </pre>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Logs de Debug</h2>
          <div className="bg-gray-100 p-4 rounded text-sm max-h-96 overflow-auto">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <button
            onClick={testGoogleAuth}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4"
          >
            Tester Google OAuth
          </button>
          <button
            onClick={() => window.location.href = '/sign-in'}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Aller à Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
