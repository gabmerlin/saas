'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { Loader2, Building2 } from 'lucide-react';

interface OwnerGuardProps {
  children: React.ReactNode;
}

export default function OwnerGuard({ children }: OwnerGuardProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAgencyStatus = async () => {
      try {
        // Utiliser getUser() au lieu de getSession() pour une meilleure fiabilité
        const { data: { user }, error: userError } = await supabaseBrowser.auth.getUser();
        
        if (userError || !user) {
          console.log("Pas d'utilisateur authentifié, redirection vers la connexion");
          router.push('/sign-in');
          return;
        }

        
        // Récupérer la session pour obtenir le token d'accès
        const { data: { session }, error: sessionError } = await supabaseBrowser.auth.getSession();
        
        if (sessionError || !session) {
          console.log("Pas de session valide, redirection vers la connexion");
          router.push('/sign-in');
          return;
        }
        
        const response = await fetch("/api/auth/check-existing-agency", {
          method: "GET",
          headers: {
            "authorization": `Bearer ${session.access_token}`,
            "x-session-token": session.access_token
          }
        });
        
        const result = await response.json();
        
        
        if (result.ok && result.hasExistingAgency && result.agency?.url) {
          // Redirection directe vers le subdomain de l'agence
          window.location.href = result.agency.url;
          return;
        }
        
        // Si pas d'agence existante, autoriser l'accès à la page owner
        setIsAuthorized(true);
        setIsChecking(false);
        
      } catch (error) {
        console.error("Erreur lors de la vérification d'agence existante:", error);
        // En cas d'erreur, autoriser l'accès pour ne pas bloquer l'utilisateur
        setIsAuthorized(true);
        setIsChecking(false);
      }
    };

    checkAgencyStatus();
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Building2 className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Vérification en cours...
          </h2>
          <p className="text-gray-600">
            Nous vérifions si vous avez déjà une agence.
          </p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // La redirection est en cours
  }

  return <>{children}</>;
}
