'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { crossDomainSessionSync } from '@/lib/auth/client/cross-domain-session-sync';

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
        
        setStatus('Traitement de l\'authentification...');
        
        const supabase = supabaseBrowser();
        
        // Vérifier s'il y a un code d'erreur dans l'URL
        const error = searchParams.get('error');
        if (error) {
          setStatus(`Erreur: ${error}`);
          setTimeout(() => router.push('/auth/sign-in?error=auth_failed'), 2000);
          return;
        }

        // Vérifier s'il y a un code d'autorisation
        const code = searchParams.get('code');
        if (code) {
          setStatus('Échange du code d\'autorisation...');
          
          
          try {
            // Configuration minimale - laissez Supabase gérer
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            
            if (error) {
              setStatus(`Erreur: ${error.message}`);
              setTimeout(() => router.push('/auth/auth/sign-in?error=auth_failed'), 2000);
              return;
            }
            
            
            // Vérifier la session créée
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              setStatus(`Erreur session: ${sessionError.message}`);
              setTimeout(() => router.push('/auth/auth/sign-in?error=auth_failed'), 2000);
              return;
            }
            
            if (session) {
              setStatus('Connexion réussie !');
              
              // Synchroniser la session vers tous les domaines
              await crossDomainSessionSync.syncSessionToAllDomains(session);
              
              setTimeout(() => {
                const next = searchParams.get('next') || '/home';
                window.location.href = next;
              }, 1000);
              return;
            } else {
              setStatus('Aucune session créée');
              setTimeout(() => router.push('/auth/auth/sign-in?error=no_session'), 2000);
              return;
            }
          } catch (error) {
            setStatus(`Erreur: ${error}`);
            setTimeout(() => router.push('/auth/auth/sign-in?error=auth_failed'), 2000);
            return;
          }
        }

        // Si pas de code, essayer de récupérer la session existante
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          setStatus(`Erreur session: ${sessionError.message}`);
          setTimeout(() => router.push('/auth/sign-in?error=auth_failed'), 2000);
          return;
        }

        if (session) {
          setStatus('Connexion réussie !');
          
          // Synchroniser la session vers tous les domaines
          await crossDomainSessionSync.syncSessionToAllDomains(session);
          
          setTimeout(() => {
            const next = searchParams.get('next') || '/home';
            window.location.href = next;
          }, 1000);
        } else {
          setStatus('Aucune session trouvée');
          setTimeout(() => router.push('/auth/sign-in?error=no_session'), 2000);
        }
      } catch (error) {
        setStatus(`Erreur: ${error}`);
        setTimeout(() => router.push('/auth/sign-in?error=auth_failed'), 2000);
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