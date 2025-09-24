"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

function RootRedirectContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Vérification...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Vérifier s'il y a un code OAuth dans l'URL
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      
      if (code) {
        console.log('=== CODE OAUTH REÇU SUR PAGE RACINE ===');
        console.log('Code:', code.substring(0, 20) + '...');
        setStatus('Traitement du code OAuth...');
        
        try {
          const supabase = supabaseBrowser();
          
          // Échanger le code contre une session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Erreur exchangeCodeForSession:', exchangeError);
            console.log('Tentative de récupération de la session existante...');
            
            // Si l'échange échoue, essayer de récupérer la session existante
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              console.error('Erreur getSession:', sessionError);
              setStatus('Erreur lors de l\'authentification');
              setTimeout(() => {
                window.location.href = '/sign-in?error=auth_failed';
              }, 2000);
              return;
            }
            
            if (session) {
              console.log('Session récupérée avec succès:', session.user?.email);
              setStatus('Connexion réussie !');
              setTimeout(() => {
                window.location.href = '/home';
              }, 1000);
            } else {
              console.log('Aucune session trouvée');
              setStatus('Aucune session trouvée');
              setTimeout(() => {
                window.location.href = '/sign-in?error=no_session';
              }, 2000);
            }
            return;
          }
          
          if (data.session) {
            console.log('Session créée avec succès:', data.session.user?.email);
            setStatus('Connexion réussie !');
            setTimeout(() => {
              window.location.href = '/home';
            }, 1000);
          } else {
            console.log('Aucune session après échange du code');
            setStatus('Aucune session créée');
            setTimeout(() => {
              window.location.href = '/sign-in?error=no_session';
            }, 2000);
          }
        } catch (error) {
          console.error('Erreur lors du traitement OAuth:', error);
          setStatus('Erreur lors de l\'authentification');
          setTimeout(() => {
            window.location.href = '/sign-in?error=auth_failed';
          }, 2000);
        }
      } else if (error) {
        console.log('Erreur OAuth reçue:', error);
        setStatus(`Erreur: ${error}`);
        setTimeout(() => {
          window.location.href = '/sign-in?error=auth_failed';
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