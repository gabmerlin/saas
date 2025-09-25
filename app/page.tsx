"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function RootRedirectContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Vérification...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Vérifier s'il y a un code OAuth dans l'URL
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      
      if (code) {
        setStatus('Redirection vers le gestionnaire OAuth...');
        
        // Rediriger vers /auth/callback qui gère correctement l'OAuth
        const currentUrl = new URL(window.location.href);
        const callbackUrl = `/auth/callback${currentUrl.search}`;
        window.location.href = callbackUrl;
        return;
      } else if (error) {
        setStatus(`Erreur: ${error}`);
        setTimeout(() => {
          window.location.href = '/auth/sign-in?error=auth_failed';
        }, 2000);
      } else {
        
        // Redirection normale vers /home
        setStatus('Redirection vers /home...');
        window.location.href = '/home';
      }
    };

    handleOAuthCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}

export default function RootRedirect() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <RootRedirectContent />
    </Suspense>
  );
}