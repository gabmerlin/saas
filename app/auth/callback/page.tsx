'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Connexion en cours...');
  const [isClient, setIsClient] = useState(false);
  
  // Récupérer la redirection depuis localStorage ou les paramètres URL
  const getRedirectUrl = () => {
    if (typeof window !== 'undefined') {
      const storedRedirect = localStorage.getItem('oauth_redirect_after_login');
      if (storedRedirect) {
        localStorage.removeItem('oauth_redirect_after_login'); // Nettoyer
        return storedRedirect;
      }
    }
    return searchParams.get('next') || '/home';
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const handleAuthCallback = async () => {
      try {
        setStatus('Traitement de l\'authentification...');

        // Attendre un peu que Supabase traite l'URL
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Récupérer la session
        const { data: { session }, error } = await supabaseBrowser().auth.getSession();
        
        if (error) {
          console.error('Erreur getSession:', error);
          setStatus('Erreur lors de l\'authentification');
          setTimeout(() => router.push('/sign-in?error=auth_failed'), 2000);
          return;
        }

        if (session) {
          setStatus('Connexion réussie !');
          setTimeout(() => {
            const redirectUrl = getRedirectUrl();
            window.location.href = redirectUrl;
          }, 1000);
        } else {
          setStatus('Aucune session trouvée');
          setTimeout(() => router.push('/sign-in?error=no_session'), 2000);
        }
      } catch (error) {
        console.error('Erreur callback:', error);
        setStatus('Erreur lors de l\'authentification');
        setTimeout(() => router.push('/sign-in?error=auth_failed'), 2000);
      }
    };

    handleAuthCallback();
  }, [isClient, router]);

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