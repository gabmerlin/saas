"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { MessageSquare, Shield, Users, Zap } from "lucide-react";
import { supabaseBrowserWithCookies } from "@/lib/supabase/client-with-cookies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { signInWithEmail, resetPassword } from "@/lib/auth/client/auth-actions";
import { crossDomainSessionSync } from "@/lib/auth/client/cross-domain-session-sync";
import { LoadingScreen } from "@/components/ui/loading-screen";

function SignInContent() {
  const searchParams = useSearchParams();
  const [isChecking, setIsChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // Détecter le contexte (domaine principal vs sous-domaine)
  const isSubdomain = typeof window !== 'undefined' && 
    window.location.hostname.split('.').length > 2 && 
    !window.location.hostname.includes('localhost');
  
  // Ajuster la redirection par défaut selon le contexte
  const defaultNext = isSubdomain ? "/dashboard" : "/home";
  const next = searchParams?.get("next") ?? defaultNext;
  const invitation = searchParams?.get("invitation");
  
  // Définir le titre de la page
  usePageTitle("Connexion - QG Chatting");

  // Vérifier si l'utilisateur est déjà connecté
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabaseBrowserWithCookies().auth.getSession();
        if (session) {
          // L'utilisateur est déjà connecté, rediriger
          window.location.href = next;
          return;
        }
      } catch {
      } finally {
        setIsChecking(false);
      }
    };

    checkSession();
  }, [next]);

  // Connexion par email
  async function handleEmailSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMsg(null);

    try {
      const result = await signInWithEmail(email, password);
      toast.success("Connexion réussie !");
      
      // Synchroniser la session vers tous les domaines
      if (result?.session) {
        await crossDomainSessionSync.syncSessionToAllDomains(result.session);
      }
      
      // Si il y a une invitation, l'accepter d'abord
      if (invitation) {
        try {
          const response = await fetch('/api/invitations/accept', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: invitation }),
          });
          
          if (response.ok) {
            toast.success("Invitation acceptée avec succès !");
            const data = await response.json();
            if (data.tenant?.subdomain) {
              const isLocalhost = window.location.hostname === 'localhost';
              const baseUrl = isLocalhost 
                ? `http://${data.tenant.subdomain}.localhost:3000`
                : `https://${data.tenant.subdomain}.qgchatting.com`;
              window.location.href = `${baseUrl}/dashboard`;
              return;
            }
          } else {
            const errorData = await response.json();
            toast.error(errorData.error || "Erreur lors de l'acceptation de l'invitation");
          }
        } catch {
          toast.error("Erreur lors de l'acceptation de l'invitation");
        }
      }
      
      // Redirection simple après connexion email
      const targetUrl = next || '/home';
      window.location.href = targetUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Échec de connexion";
      setMsg(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  // Connexion Google
  async function handleGoogleSignIn() {
    try {
      
      // Utiliser l'API Supabase standard
      const { error } = await supabaseBrowserWithCookies().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next || '/home')}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        const errorMessage = error.message || "Échec de connexion Google";
        setMsg(errorMessage);
        toast.error(errorMessage);
        return;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Échec de connexion Google";
      setMsg(errorMessage);
      toast.error(errorMessage);
    }
  }

  // Réinitialisation mot de passe
  async function handleResetPassword() {
    if (!email) {
      toast.error("Veuillez saisir votre email d'abord");
      return;
    }

    setIsResetting(true);
    try {
      await resetPassword(email);
      toast.success("Email de réinitialisation envoyé !");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Échec d'envoi de l'email";
      toast.error(errorMessage);
    } finally {
      setIsResetting(false);
    }
  }

  // Afficher un loader pendant la vérification
  if (isChecking) {
    return (
      <LoadingScreen 
        message="Vérification de la session"
        submessage="Contrôle de votre authentification..."
        variant="default"
      />
    );
  }

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
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h1 className="text-3xl font-bold">QG Chatting</h1>
              </div>
              <h2 className="text-2xl font-semibold mb-4">
                La solution de communication d&apos;entreprise nouvelle génération
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed">
                Connectez vos équipes, collaborez efficacement et transformez votre façon de travailler.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Sécurité Enterprise</h3>
                  <p className="text-blue-100 text-sm">Chiffrement de bout en bout</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Collaboration Avancée</h3>
                  <p className="text-blue-100 text-sm">Outils intégrés pour vos équipes</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Performance Optimisée</h3>
                  <p className="text-blue-100 text-sm">Interface rapide et intuitive</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        </div>

        {/* Right side - Login Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8 lg:hidden">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">QG Chatting</h1>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Bon retour !</h2>
                <p className="text-gray-600">Connectez-vous à votre compte</p>
              </div>
              
              {/* Formulaire de connexion */}
              <div className="space-y-6">
                <form onSubmit={handleEmailSignIn} className="space-y-5" autoComplete="off">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        id="remember-me"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="remember-me" className="text-sm text-gray-600">
                        Se souvenir de moi
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={isResetting}
                      className="text-sm text-blue-600 hover:text-blue-500 transition-colors font-medium"
                    >
                      {isResetting ? "Envoi..." : "Mot de passe oublié ?"}
                    </button>
                  </div>

                  {msg && (
                    <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{msg}</span>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors" 
                    disabled={submitting}
                  >
                    {submitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Connexion...</span>
                      </div>
                    ) : (
                      "Se connecter"
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-gray-500 font-medium">Ou continuer avec</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 border-gray-200 hover:bg-gray-50 rounded-lg font-medium"
                  onClick={handleGoogleSignIn}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </Button>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Pas encore de compte ?{" "}
                  <Link 
                    href={`/sign-up?next=${encodeURIComponent(next)}`} 
                    className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    Créer un compte
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <LoadingScreen 
        message="Chargement..."
        variant="default"
      />
    }>
      <SignInContent />
    </Suspense>
  );
}