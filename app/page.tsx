"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LoadingScreen } from "@/components/ui/loading-screen";

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
        // Redirection normale vers /home avec router pour éviter les redirections forcées
        setStatus('Redirection vers /home...');
        // Utiliser une redirection côté serveur ou client-side navigation
        if (typeof window !== 'undefined') {
          window.location.replace('/home');
        }
      }
    };

    handleOAuthCallback();
  }, [searchParams]);

  return (
    <LoadingScreen 
      message={status}
      submessage="Redirection en cours..."
      variant="default"
    />
  );
}

export default function RootRedirect() {
  return (
    <Suspense fallback={
      <LoadingScreen 
        message="Chargement..."
        variant="default"
      />
    }>
      <RootRedirectContent />
    </Suspense>
  );
}