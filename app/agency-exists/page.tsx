"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Building2, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";
import { usePageTitle } from "@/lib/hooks/use-page-title";

export default function AgencyExistsPage() {
  const router = useRouter();
  const [agencyInfo, setAgencyInfo] = useState<{
    name: string;
    subdomain: string;
    url: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  
  // Définir le titre de la page
  usePageTitle("Agence existante - QG Chatting");

  useEffect(() => {
    const checkExistingAgency = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabaseBrowser.auth.getSession();
        
        if (sessionError || !session) {
          router.push('/sign-in');
          return;
        }
        
        const authToken = session.access_token;
        
        const response = await fetch("/api/auth/check-existing-agency", {
          method: "GET",
          headers: { 
            "authorization": `Bearer ${authToken}`,
            "x-session-token": authToken
          }
        });
        
        const result = await response.json();
        
        if (result.ok && result.hasExistingAgency) {
          setAgencyInfo({
            name: result.agency.name,
            subdomain: result.agency.subdomain,
            url: result.agency.url
          });
        } else {
          // Pas d'agence existante, rediriger vers l'onboarding
          router.push('/fr/owner');
        }
      } catch (err) {
        console.error("Erreur lors de la vérification d'agence existante:", err);
        setError("Une erreur est survenue lors de la vérification de votre agence.");
      } finally {
        setLoading(false);
      }
    };
    
    checkExistingAgency();
  }, [router]);

  // Compte à rebours pour la redirection automatique
  useEffect(() => {
    if (agencyInfo?.url && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (agencyInfo?.url && countdown === 0) {
      handleRedirectToAgency();
    }
  }, [agencyInfo, countdown]);

  const handleRedirectToAgency = () => {
    if (agencyInfo?.url) {
      window.location.href = agencyInfo.url;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de votre agence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4"
        >
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/sign-in')}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Retour à la connexion
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4"
      >
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Agence existante détectée
          </h1>
          <p className="text-gray-600 mb-6">
            Vous avez déjà une agence : <strong>{agencyInfo?.name}</strong>
          </p>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-center mb-2">
              <Building2 className="h-5 w-5 text-gray-500 mr-2" />
              <span className="text-sm text-gray-600">Sous-domaine :</span>
            </div>
            <code className="text-sm font-mono text-gray-800">
              {agencyInfo?.subdomain}
            </code>
          </div>

          <button
            onClick={handleRedirectToAgency}
            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
          >
            Accéder à mon agence
            <ArrowRight className="h-4 w-4 ml-2" />
          </button>
          
          <p className="text-xs text-gray-500 mt-4">
            Redirection automatique dans {countdown} seconde{countdown > 1 ? 's' : ''}...
          </p>
        </div>
      </motion.div>
    </div>
  );
}
