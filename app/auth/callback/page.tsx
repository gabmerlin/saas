'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Connexion en cours...');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const handleAuthCallback = async () => {
      try {
        console.log('=== DÉBUT CALLBACK OAuth ===');
        console.log('URL complète:', window.location.href);
        console.log('Search params:', Object.fromEntries(searchParams.entries()));
        
        setStatus('Traitement de l\'authentification...');
        
        const supabase = supabaseBrowser();
        
        // Vérifier s'il y a un code d'erreur dans l'URL
        const error = searchParams.get('error');
        if (error) {
          console.error('Erreur OAuth dans URL:', error);
          setStatus(`Erreur: ${error}`);
          setTimeout(() => router.push('/sign-in?error=auth_failed'), 2000);
          return;
        }

        // Vérifier s'il y a un code d'autorisation
        const code = searchParams.get('code');
        if (code) {
          console.log('Code OAuth reçu:', code.substring(0, 20) + '...');
          setStatus('Échange du code d\'autorisation...');
          
          // Échanger le code contre une session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Erreur exchangeCodeForSession:', exchangeError);
            console.log('Tentative de récupération de la session existante...');
            
            // Si l'échange échoue, essayer de récupérer la session existante
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              console.error('Erreur getSession:', sessionError);
              setStatus(`Erreur échange: ${exchangeError.message}`);
              setTimeout(() => router.push('/sign-in?error=auth_failed'), 2000);
              return;
            }
            
            if (session) {
              console.log('Session récupérée avec succès:', session.user?.email);
              setStatus('Connexion réussie !');
              setTimeout(() => {
                const next = searchParams.get('next') || '/home';
                console.log('Redirection vers:', next);
                window.location.href = next;
              }, 1000);
              return;
            } else {
              console.log('Aucune session trouvée');
              setStatus(`Erreur échange: ${exchangeError.message}`);
              setTimeout(() => router.push('/sign-in?error=auth_failed'), 2000);
              return;
            }
          }
          
          if (data.session) {
            console.log('Session créée avec succès:', data.session.user?.email);
            setStatus('Connexion réussie !');
            setTimeout(() => {
              const next = searchParams.get('next') || '/home';
              console.log('Redirection vers:', next);
              window.location.href = next;
            }, 1000);
            return;
          } else {
            console.log('Aucune session après échange du code');
            setStatus('Aucune session créée');
            setTimeout(() => router.push('/sign-in?error=no_session'), 2000);
            return;
          }
        }

        // Si pas de code, essayer de récupérer la session existante
        console.log('Pas de code OAuth, vérification session existante...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Erreur getSession:', sessionError);
          setStatus(`Erreur session: ${sessionError.message}`);
          setTimeout(() => router.push('/sign-in?error=auth_failed'), 2000);
          return;
        }

        if (session) {
          console.log('Session existante trouvée:', session.user?.email);
          setStatus('Connexion réussie !');
          setTimeout(() => {
            const next = searchParams.get('next') || '/home';
            window.location.href = next;
          }, 1000);
        } else {
          console.log('Aucune session trouvée');
          setStatus('Aucune session trouvée');
          setTimeout(() => router.push('/sign-in?error=no_session'), 2000);
        }
      } catch (error) {
        console.error('Erreur callback:', error);
        setStatus(`Erreur: ${error}`);
        setTimeout(() => router.push('/sign-in?error=auth_failed'), 2000);
      }
    };

    handleAuthCallback();
  }, [isClient, router, searchParams]);

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