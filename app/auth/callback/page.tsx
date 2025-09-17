'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { redirectAfterLogin } from '@/lib/auth/agency-redirect';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/fr';
  const code = searchParams.get('code');
  const [status, setStatus] = useState('Connexion en cours...');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const handleAuthCallback = async () => {
      try {
        setStatus('Traitement de l\'authentification...');

        // Cas 1: Code d'autorisation (PKCE flow)
        if (code) {
          const { data, error } = await supabaseBrowser.auth.exchangeCodeForSession(code);
          
          if (error) {
            setStatus('Erreur lors de l\'échange du code');
            setTimeout(() => router.push('/sign-in?error=auth_failed'), 2000);
            return;
          }

          if (data.session) {
            setStatus('Connexion réussie !');
            // Vérifier l'agence existante avant la redirection
            const redirectUrl = await redirectAfterLogin(next);
            setTimeout(() => {
              if (redirectUrl.startsWith('http')) {
                window.location.href = redirectUrl;
              } else {
                router.push(redirectUrl);
              }
            }, 1000);
            return;
          }
        }

        // Cas 2: Fragments OAuth (Implicit flow)
        const hash = window.location.hash;
        if (hash) {
          // Parser les paramètres du hash
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');


          if (accessToken && refreshToken) {
            setStatus('Création de la session...');
            
            try {
              // Définir la session Supabase
              const { data, error } = await supabaseBrowser.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (error) {
                setStatus('Erreur lors de la création de la session');
                setTimeout(() => router.push('/sign-in?error=auth_failed'), 2000);
                return;
              }

              if (data.session) {
                setStatus('Connexion réussie !');
                
                // Attendre que la session soit bien persistée et synchronisée
                let attempts = 0;
                const maxAttempts = 10;
                
                const checkSession = async () => {
                  const { data: { session } } = await supabaseBrowser.auth.getSession();
                  if (session) {
                    // Vérifier l'agence existante avant la redirection
                    const redirectUrl = await redirectAfterLogin(next);
                    if (redirectUrl.startsWith('http')) {
                      window.location.href = redirectUrl;
                    } else {
                      window.location.href = redirectUrl;
                    }
                  } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkSession, 500);
                  } else {
                    setStatus('Erreur: Session non synchronisée');
                    setTimeout(() => router.push('/sign-in?error=session_sync_failed'), 2000);
                  }
                };
                
                setTimeout(checkSession, 1000);
                return;
              } else {
                setStatus('Erreur: Aucune session créée');
                setTimeout(() => router.push('/sign-in?error=no_session'), 2000);
                return;
              }
            } catch (error) {
              setStatus('Erreur lors de la création de la session');
              setTimeout(() => router.push('/sign-in?error=auth_failed'), 2000);
              return;
            }
          }
        }

        // Vérifier si on a déjà une session active
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        if (session) {
          setStatus('Connexion réussie !');
          // Vérifier l'agence existante avant la redirection
          const redirectUrl = await redirectAfterLogin(next);
          setTimeout(() => {
            if (redirectUrl.startsWith('http')) {
              window.location.href = redirectUrl;
            } else {
              router.push(redirectUrl);
            }
          }, 1000);
          return;
        }

        // Si aucun token ni code, rediriger vers sign-in
        setStatus('Aucune donnée d\'authentification');
        setTimeout(() => router.push('/sign-in?error=no_auth_data'), 2000);
      } catch (error) {
        setStatus('Erreur lors de l\'authentification');
        setTimeout(() => router.push('/sign-in?error=auth_failed'), 2000);
      }
    };

    handleAuthCallback();
  }, [router, next, code, isClient]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">{status}</p>
        {isClient && (
          <p className="mt-2 text-sm text-gray-500">
            URL: {window.location.href}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}