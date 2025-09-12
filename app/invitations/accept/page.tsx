// app/invitations/accept/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { acceptInvitation } from '@/lib/invitations/actions';

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setError('Token d\'invitation manquant');
      return;
    }

    // Vérifier l'invitation côté client
    checkInvitation();
  }, [token]);

  const checkInvitation = async () => {
    try {
      const response = await fetch(`/api/invitations/check?token=${token}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Invitation invalide');
      }
      
      setInvitationData(data.invitation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la vérification de l\'invitation');
    }
  };

  const handleAcceptInvitation = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'acceptation');
      }

      setSuccess(true);
      toast.success('Invitation acceptée avec succès !');
      
      // Rediriger vers le dashboard du tenant après 2 secondes
      setTimeout(() => {
        if (data.tenant?.subdomain) {
          window.location.href = `https://${data.tenant.subdomain}.qgchatting.com/dashboard`;
        } else {
          router.push('/dashboard');
        }
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'acceptation de l\'invitation';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-600">Invitation invalide</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/auth/sign-in')} 
              className="w-full"
            >
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl text-green-600">Invitation acceptée !</CardTitle>
            <CardDescription>
              Vous allez être redirigé vers votre tableau de bord...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!invitationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
            </div>
            <CardTitle>Vérification de l'invitation...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Invitation à rejoindre</CardTitle>
          <CardDescription>
            {invitationData.tenants?.name || 'Une agence'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Vous êtes invité(e) à rejoindre <strong>{invitationData.tenants?.name}</strong> en tant que <strong>{invitationData.roles?.description}</strong>.
            </p>
            <p className="text-xs text-gray-500">
              Invité par {invitationData.profiles?.full_name || 'un administrateur'}
            </p>
          </div>

          <Alert>
            <AlertDescription>
              En acceptant cette invitation, vous rejoindrez l'équipe et aurez accès aux fonctionnalités selon votre rôle.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Button 
              onClick={handleAcceptInvitation}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Acceptation...
                </>
              ) : (
                'Accepter l\'invitation'
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => router.push('/auth/sign-in')}
              className="w-full"
            >
              Annuler
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}