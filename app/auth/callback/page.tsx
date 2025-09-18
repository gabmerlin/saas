'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { redirectAfterLogin } from '@/lib/auth/agency-redirect';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
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

        // Attendre un peu pour que Supabase traite l'URL
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Attendre que Supabase traite l'authentification
        const { data: { session }, error } = await supabaseBrowser().auth.getSession();
        
        if (error) {
          console.error('Erreur de session:', error);
          setStatus('Erreur lors de l\'authentification');
          setTimeout(() => router.push('/sign-in?error=auth_failed'), 2000);
          return;
        }

        if (session) {
          setStatus('Connexion réussie !');
          
          // Attendre que la session soit bien persistée
          let attempts = 0;
          const maxAttempts = 10;
          
          const checkSession = async () => {
            const { data: { session: currentSession } } = await supabaseBrowser().auth.getSession();
            if (currentSession) {
              try {
                // Vérifier l'agence existante avant la redirection
                const redirectUrl = await redirectAfterLogin(next);
                if (redirectUrl.startsWith('http')) {
                  window.location.href = redirectUrl;
                } else {
                  window.location.href = redirectUrl;
                }
              } catch (redirectError) {
                console.error('Erreur de redirection:', redirectError);
                // Redirection de fallback
                window.location.href = next || '/fr';
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
        } else {
          setStatus('Aucune session trouvée');
          setTimeout(() => router.push('/sign-in?error=no_session'), 2000);
        }
      } catch (error) {
        console.error('Erreur lors de l\'authentification:', error);
        setStatus('Erreur lors de l\'authentification');
        setTimeout(() => router.push('/sign-in?error=auth_failed'), 2000);
      }
    };

    handleAuthCallback();
  }, [isClient, next, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}