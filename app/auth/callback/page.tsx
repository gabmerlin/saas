'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { crossDomainSessionSync } from '@/lib/auth/client/cross-domain-session-sync';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { getAppropriateRedirectUrl } from '@/lib/utils/cross-domain-redirect';

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
            // Récupérer le code verifier stocké pour PKCE
            const { PKCEHelper } = await import('@/lib/auth/pkce-helper');
            const codeVerifier = PKCEHelper.getStoredCodeVerifier();
            
            console.log('🔍 Code verifier récupéré:', codeVerifier ? codeVerifier.substring(0, 20) + '...' : 'AUCUN');
            
            if (!codeVerifier) {
              setStatus('Erreur: Code verifier manquant pour PKCE');
              setTimeout(() => router.push('/auth/sign-in?error=auth_failed'), 2000);
              return;
            }
            
            // Utiliser le code verifier pour l'échange
            const { error } = await supabase.auth.exchangeCodeForSession(code, {
              codeVerifier
            });
            
            if (error) {
              console.error('❌ Erreur exchangeCodeForSession:', error);
              setStatus(`Erreur: ${error.message}`);
              // Nettoyer le code verifier en cas d'erreur
              PKCEHelper.clearCodeVerifier();
              setTimeout(() => router.push('/auth/sign-in?error=auth_failed'), 2000);
              return;
            }
            
            // Nettoyer le code verifier après utilisation
            PKCEHelper.clearCodeVerifier();
            console.log('✅ Code verifier nettoyé');
            
            
            // Vérifier la session créée
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              setStatus(`Erreur session: ${sessionError.message}`);
              setTimeout(() => router.push('/auth/sign-in?error=auth_failed'), 2000);
              return;
            }
            
            if (session) {
              console.log('✅ Session créée avec succès:', {
                userId: session.user.id,
                email: session.user.email
              });
              setStatus('Connexion réussie !');
              
              // Synchroniser la session vers tous les domaines
              await crossDomainSessionSync.syncSessionToAllDomains(session);
              
              setTimeout(async () => {
                const next = searchParams.get('next') || '/home';
                
                // Si l'utilisateur veut aller au dashboard, vérifier s'il a une agence
                if (next === '/dashboard') {
                  try {
                    // Vérifier si l'utilisateur a une agence existante
                    const agencyResponse = await fetch('/api/auth/check-existing-agency', {
                      headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'x-session-token': session.access_token
                      }
                    });
                    
                    const agencyData = await agencyResponse.json();
                    
                    if (agencyData.ok && agencyData.hasExistingAgency && agencyData.agency) {
                      // Rediriger vers le sous-domaine de l'agence
                      console.log('🏢 Agence trouvée, redirection vers:', agencyData.agency.subdomain);
                      const { redirectToAgencyDashboard } = await import('@/lib/auth/client/agency-redirect');
                      await redirectToAgencyDashboard(agencyData.agency.subdomain);
                      return;
                    } else {
                      // Pas d'agence, rediriger vers l'onboarding
                      console.log('❌ Pas d\'agence trouvée, redirection vers onboarding');
                      router.push('/onboarding/owner');
                      return;
                    }
                  } catch (error) {
                    console.error('Erreur lors de la vérification de l\'agence:', error);
                    // En cas d'erreur, rediriger vers la page d'accueil
                    router.push('/home');
                    return;
                  }
                }
                
                // Pour les autres redirections, utiliser la logique normale
                const redirectUrl = getAppropriateRedirectUrl(next);
                if (redirectUrl.startsWith('http')) {
                  window.location.href = redirectUrl;
                } else {
                  router.push(redirectUrl);
                }
              }, 1000);
              return;
            } else {
              setStatus('Aucune session créée');
              setTimeout(() => router.push('/auth/sign-in?error=no_session'), 2000);
              return;
            }
          } catch (error) {
            setStatus(`Erreur: ${error}`);
            setTimeout(() => router.push('/auth/sign-in?error=auth_failed'), 2000);
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
            const redirectUrl = getAppropriateRedirectUrl(next);
            if (redirectUrl.startsWith('http')) {
              window.location.href = redirectUrl;
            } else {
              router.push(redirectUrl);
            }
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
    <LoadingScreen 
      message={status}
      submessage="Veuillez patienter pendant la connexion..."
      variant="default"
    />
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <LoadingScreen 
        message="Chargement..."
        variant="default"
      />
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}