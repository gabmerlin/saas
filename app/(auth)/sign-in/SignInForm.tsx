"use client";

import { useState } from "react";
import { signInWithEmail, resetPassword } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { redirectAfterLogin } from "@/lib/auth/agency-redirect";

type Props = { next: string; invitation?: string | null };


// ⚠️ IMPORTANT : on utilise le client "auth-helpers" côté client
// pour que le login crée/maj les cookies lisibles par le middleware.

export default function SignInForm({ next, invitation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isResetting, setIsResetting] = useState(false);


  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMsg(null);

    try {
      await signInWithEmail(email, password, rememberMe);
      toast.success("Connexion réussie !");
      
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
            // Rediriger vers le dashboard du tenant
            const data = await response.json();
            if (data.tenant?.subdomain) {
              window.location.href = `https://${data.tenant.subdomain}.qgchatting.com/dashboard`;
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
      
      // Vérifier l'agence existante avant la redirection
      const redirectUrl = await redirectAfterLogin(next || "/dashboard");
      window.location.replace(redirectUrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Échec de connexion";
      setMsg(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      // Utiliser notre endpoint personnalisé pour l'authentification Google
      window.location.href = `/api/auth/google?redirectTo=${encodeURIComponent(next || '/dashboard')}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Échec de connexion Google";
      setMsg(errorMessage);
      toast.error(errorMessage);
    }
  }

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

  return (
    <div className="space-y-6">
        <form onSubmit={onSubmit} className="space-y-5" autoComplete="off">
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
  );
}
