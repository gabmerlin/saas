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

        // Attendre un peu pour que Supabase traite l'URL
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Attendre que Supabase traite l'authentification
        const { data: { session }, error } = await supabaseBrowser().auth.getSession();
        
        if (error) {
          setStatus('Erreur lors de l\'authentification');
          setTimeout(() => router.push('/sign-in?error=auth_failed'), 2000);
          return;
        }

        if (session) {
          setStatus('Connexion réussie !');
          
          // Vérifier si l'utilisateur a une agence et rediriger en conséquence
          setTimeout(async () => {
            try {
              const agencyResponse = await fetch('/api/auth/check-existing-agency', {
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'x-session-token': session.access_token
                }
              });
              
              const agencyData = await agencyResponse.json();
              
              if (agencyData.ok && agencyData.hasExistingAgency) {
                // Rediriger vers l'agence
                const subdomain = agencyData.agency.subdomain;
                const baseUrl = process.env.NODE_ENV === 'production' 
                  ? `https://${subdomain}.qgchatting.com`
                  : 'http://localhost:3000';
                window.location.href = `${baseUrl}/dashboard`;
                return;
              }
            } catch (agencyError) {
              // Erreur silencieuse
            }
            
            // Sinon, rediriger vers la page d'accueil
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