"use client";

import { useEffect, useState } from "react";

export default function RootRedirect() {
  const [status, setStatus] = useState("Chargement...");

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        setStatus("Vérification de l'authentification...");
        
        // Vérifier s'il y a un code OAuth dans l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
          setStatus("Traitement de la connexion Google...");
          
          // Nettoyer l'URL IMMÉDIATEMENT
          window.history.replaceState({}, document.title, '/');
          
          // Traiter le code OAuth directement
          const { supabaseBrowser } = await import('@/lib/supabase/client');
          const supabase = supabaseBrowser();
          
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            setStatus("Erreur de connexion");
            setTimeout(() => window.location.href = '/sign-in', 2000);
            return;
          }
          
          if (data.session) {
            // Stocker la session
            const sessionData = {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: data.session.expires_at,
              user: data.session.user
            };
            
            localStorage.setItem('supabase-session', JSON.stringify(sessionData));
            sessionStorage.setItem('supabase-session', JSON.stringify(sessionData));
            
            setStatus("Connexion réussie !");
            setTimeout(() => window.location.href = '/home', 1000);
            return;
          }
        }
        
        // Si pas de code OAuth, rediriger vers /home
        setStatus("Redirection vers l'accueil...");
        setTimeout(() => window.location.href = '/home', 1000);
        
      } catch (error) {
        setStatus("Erreur, redirection...");
        setTimeout(() => window.location.href = '/sign-in', 2000);
      }
    };

    handleRedirect();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}