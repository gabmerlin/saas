"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/lib/hooks/use-page-title";

function OnboardingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Vérification du paiement en cours...");
  
  // Définir le titre de la page
  usePageTitle("Paiement confirmé - QG Chatting");

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        // Récupérer les paramètres de l'URL
        const invoiceId = searchParams.get("invoiceId");
        const transactionId = searchParams.get("transactionId");

        if (!invoiceId && !transactionId) {
          setStatus("error");
          setMessage("Paramètres de paiement manquants");
          return;
        }

        // Vérifier le statut du paiement
        const response = await fetch(`/api/btcpay/check-status/${invoiceId || transactionId}`);
        
        if (!response.ok) {
          throw new Error("Erreur lors de la vérification du paiement");
        }

        const data = await response.json();

        if (data.status === "paid") {
          setStatus("success");
          setMessage("Paiement confirmé ! Votre agence est en cours de création...");
          
          // Rediriger vers la page d'initialisation après 3 secondes
          setTimeout(() => {
            router.push("/onboarding/agency-initializing");
          }, 3000);
        } else if (data.status === "expired" || data.status === "cancelled") {
          setStatus("error");
          setMessage("Le paiement a expiré ou été annulé");
        } else {
          setStatus("error");
          setMessage("Paiement en attente ou échoué");
        }
      } catch {
        setStatus("error");
        setMessage("Erreur lors de la vérification du paiement");
      }
    };

    checkPaymentStatus();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-[35%] bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h1 className="text-3xl font-bold">QG Chatting</h1>
              </div>
              <h2 className="text-2xl font-semibold mb-4">
                {status === "success" ? "Paiement confirmé !" : 
                 status === "error" ? "Vérification en cours" : 
                 "Vérification du paiement"}
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed">
                {status === "success" ? 
                  "Votre paiement a été confirmé avec succès. Votre agence est en cours de création et sera bientôt opérationnelle." :
                  status === "error" ? 
                  "Nous vérifions votre paiement. Si vous avez effectué un paiement, veuillez patienter quelques minutes." :
                  "Nous vérifions votre paiement pour finaliser la création de votre agence."
                }
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Paiement Sécurisé</h3>
                  <p className="text-blue-100 text-sm">Transaction confirmée</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <ArrowRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Redirection</h3>
                  <p className="text-blue-100 text-sm">Vers votre agence</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        </div>

        {/* Right side - Content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8 lg:hidden">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">QG Chatting</h1>
              </div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8"
            >
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  {status === "loading" && (
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                  )}
                  {status === "success" && (
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  )}
                  {status === "error" && (
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                  )}
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {status === "loading" && "Vérification du paiement"}
                  {status === "success" && "Paiement confirmé !"}
                  {status === "error" && "Problème de paiement"}
                </h1>
                <p className="text-gray-600 mb-6 text-lg">
                  {message}
                </p>
                
                {status === "success" && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Votre agence est en cours de création. Vous allez être redirigé automatiquement...
                    </p>
                    <div className="flex justify-center">
                      <div className="animate-pulse">
                        <ArrowRight className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                  </div>
                )}
                
                {status === "error" && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Si vous avez effectué un paiement, veuillez patienter quelques minutes ou contactez le support.
                    </p>
                    <Button 
                      onClick={() => router.push("/")}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Retour à l&apos;accueil
                    </Button>
                  </div>
                )}
                
                {status === "loading" && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">
                      Veuillez patienter pendant que nous vérifions votre paiement...
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <LoadingScreen 
            message="Chargement..."
            variant="minimal"
            showLogo={false}
            size="sm"
          />
        </div>
      </div>
    }>
      <OnboardingSuccessContent />
    </Suspense>
  );
}
