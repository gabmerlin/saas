"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Vérifier si on est sur un subdomain
    const host = window.location.host;
    const isSubdomain = host.includes('.') && !host.startsWith('www.') && !host.includes('localhost');
    
    if (isSubdomain) {
      // Sur un subdomain, rediriger vers la page d'accueil du subdomain
      router.replace('/');
    } else {
      // Sur le domaine principal, rediriger vers la page d'accueil
      router.replace('/fr');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirection en cours...</p>
      </div>
    </div>
  );
}