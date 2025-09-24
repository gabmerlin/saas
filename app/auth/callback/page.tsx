'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/fr';
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

        // Nettoyer l'URL immédiatement pour éviter l'affichage du code
        window.history.replaceState({}, document.title, '/auth/callback');

        // Attendre que Supabase traite l'authentification avec plusieurs tentatives
        let session = null;
        let error = null;
        
        // Essayer plusieurs fois de récupérer la session
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: { session: currentSession }, error: currentError } = await supabaseBrowser().auth.getSession();
          
          if (currentSession) {
            session = currentSession;
            break;
          }
          
          if (currentError && !currentError.message.includes('session_not_found')) {
            error = currentError;
            break;
          }
        }
        
        if (error) {
          setStatus('Erreur lors de l\'authentification');
          setTimeout(() => router.push('/sign-in?error=auth_failed'), 2000);
          return;
        }

        // Debug temporaire pour la production

        if (session) {
          setStatus('Connexion réussie !');
          
          // Redirection simple sans vérification d'agence pour éviter les erreurs
          setTimeout(() => {
            window.location.href = next || '/home';
          }, 1000);
        } else {
          setStatus('Aucune session trouvée');
          setTimeout(() => router.push('/sign-in?error=no_session'), 2000);
        }
      } catch (error) {
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