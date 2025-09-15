"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function OnboardingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Vérification du paiement en cours...");

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
          
          // Rediriger vers le dashboard après 3 secondes
          setTimeout(() => {
            const subdomain = searchParams.get("subdomain");
            if (subdomain) {
              window.location.href = `https://${subdomain}.qgchatting.com/dashboard`;
            } else {
              router.push("/dashboard");
            }
          }, 3000);
        } else if (data.status === "expired" || data.status === "cancelled") {
          setStatus("error");
          setMessage("Le paiement a expiré ou été annulé");
        } else {
          setStatus("error");
          setMessage("Paiement en attente ou échoué");
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        setStatus("error");
        setMessage("Erreur lors de la vérification du paiement");
      }
    };

    checkPaymentStatus();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              {status === "loading" && (
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
              )}
              {status === "success" && (
                <CheckCircle className="w-16 h-16 text-green-500" />
              )}
              {status === "error" && (
                <AlertCircle className="w-16 h-16 text-red-500" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {status === "loading" && "Vérification du paiement"}
              {status === "success" && "Paiement confirmé !"}
              {status === "error" && "Problème de paiement"}
            </CardTitle>
            <CardDescription className="text-lg">
              {message}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {status === "success" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Votre agence est en cours de création. Vous allez être redirigé automatiquement...
                </p>
                <div className="flex justify-center">
                  <div className="animate-pulse">
                    <ArrowRight className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
              </div>
            )}
            
            {status === "error" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Si vous avez effectué un paiement, veuillez patienter quelques minutes ou contactez le support.
                </p>
                <Button 
                  onClick={() => router.push("/")}
                  className="w-full"
                >
                  Retour à l&apos;accueil
                </Button>
              </div>
            )}
            
            {status === "loading" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Veuillez patienter pendant que nous vérifions votre paiement...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function OnboardingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    }>
      <OnboardingSuccessContent />
    </Suspense>
  );
}
