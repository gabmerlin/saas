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
          
          // Rediriger vers le callback standard pour éviter les conflits
          window.location.href = '/auth/callback';
          return;
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