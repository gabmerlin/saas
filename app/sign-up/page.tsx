'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Page de redirection vers l'authentification
 * Évite les 404 lors du préchargement Next.js
 */
export default function SignUpRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Rediriger vers la page d'authentification
    router.replace('/auth/sign-in');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirection vers la connexion...</p>
      </div>
    </div>
  );
}
