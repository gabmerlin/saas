// app/auth/verify-email/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Mail, RefreshCw, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { resendVerificationEmail } from '@/lib/auth/actions';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    // Récupérer l'email depuis le localStorage ou les paramètres
    const savedEmail = localStorage.getItem('pending-verification-email');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleResendEmail = async () => {
    try {
      setSending(true);
      await resendVerificationEmail();
      setSent(true);
      toast.success('Email de vérification renvoyé !');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setSending(false);
    }
  };

  const handleGoBack = () => {
    router.push('/auth/sign-in');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl">Vérifiez votre email</CardTitle>
          <CardDescription>
            Nous avons envoyé un lien de vérification à votre adresse email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {email && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Email envoyé à : <strong>{email}</strong>
              </AlertDescription>
            </Alert>
          )}

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Cliquez sur le lien dans l'email pour activer votre compte.
            </p>
            <p className="text-xs text-gray-500">
              Vérifiez aussi votre dossier spam si vous ne recevez pas l'email.
            </p>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={handleResendEmail}
              disabled={sending}
              className="w-full"
            >
              {sending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Renvoyer l'email
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleGoBack}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la connexion
            </Button>
          </div>

          {sent && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Email de vérification renvoyé ! Vérifiez votre boîte de réception.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}