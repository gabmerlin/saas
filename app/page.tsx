"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { getAppropriateRedirectUrl } from "@/lib/utils/redirects";

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
        // Vérifier si un paiement est en cours
        const isPaymentInProgress = () => {
          if (typeof window === 'undefined') return false;
          
          // Vérifier les paramètres URL
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('payment') === 'processing') return true;
          
          // Vérifier le localStorage
          return localStorage.getItem('paymentInProgress') === 'true';
        };

        // Ne pas rediriger si un paiement est en cours
        if (!isPaymentInProgress()) {
          // Redirection normale vers /home
          setStatus('Redirection vers /home...');
          if (typeof window !== 'undefined') {
            // Utiliser router.push au lieu de window.location pour éviter les boucles
            window.location.replace('/home');
          }
        } else {
          setStatus('Paiement en cours...');
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