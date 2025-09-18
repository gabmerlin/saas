"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Rediriger automatiquement vers la page d'accueil du domaine principal
    const mainDomain = process.env.NODE_ENV === 'production' 
      ? 'https://qgchatting.com'
      : 'http://localhost:3000';
    window.location.href = `${mainDomain}/home`;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement...</p>
      </div>
    </div>
  );
}