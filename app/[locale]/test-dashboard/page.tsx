"use client";

import { useEffect, useState } from "react";

export default function TestDashboardPage() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const addLog = (message: string) => {
      console.log(message);
      setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
    };

    addLog("🔍 Test Dashboard - Début de la vérification d'authentification...");
    
    // Vérifier manuellement les tokens dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    
    addLog(`🔍 Tokens détectés dans l'URL: access_token=${!!accessToken}, refresh_token=${!!refreshToken}`);
    
    if (accessToken && refreshToken) {
      addLog("✅ Tokens trouvés dans l'URL - Test réussi !");
    } else {
      addLog("❌ Aucun token trouvé dans l'URL");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Test Dashboard</h1>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Logs de débogage :</h2>
          <div className="bg-gray-100 rounded p-4 font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
