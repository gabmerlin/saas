"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Building2 } from "lucide-react";
import { usePageTitle } from "@/lib/hooks/use-page-title";

export default function OnboardingBlockedPage() {
  const router = useRouter();
  
  // Définir le titre de la page
  usePageTitle("Onboarding bloqué - QG Chatting");

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4"
      >
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Onboarding bloqué
          </h1>
          <p className="text-gray-600 mb-6">
            Vous avez déjà une agence et ne pouvez pas en créer une nouvelle.
          </p>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-center mb-2">
              <Building2 className="h-5 w-5 text-gray-500 mr-2" />
              <span className="text-sm text-gray-600">Une seule agence par compte</span>
            </div>
            <p className="text-sm text-gray-700">
              Chaque compte Google ne peut créer qu&apos;une seule agence. 
              Si vous avez besoin d&apos;aide, contactez le support.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/agency-initializing')}
              className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Voir mon agence existante
            </button>
            
            <button
              onClick={() => router.push('/sign-in')}
              className="w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la connexion
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
