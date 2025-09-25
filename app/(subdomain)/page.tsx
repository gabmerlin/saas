'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, Settings, BarChart3, MessageSquare } from 'lucide-react';
import { getUserFirstName } from '@/lib/utils/user';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { UnifiedLogoutButton } from '@/components/auth/unified-logout-button';
import { getCurrentSubdomain } from '@/lib/utils/cross-domain-redirect';

export default function SubdomainHomePage() {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agencyInfo, setAgencyInfo] = useState<{ 
    name: string; 
    subdomain: string; 
    locale: string;
    created_at: string;
  } | null>(null);
  const [userRole, setUserRole] = useState<{ 
    is_owner: boolean; 
    role: string;
  } | null>(null);

  useEffect(() => {
    const loadAgencyInfo = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        const subdomain = getCurrentSubdomain();
        if (!subdomain) {
          setLoading(false);
          return;
        }

        // Récupérer les informations de l'agence et le rôle de l'utilisateur
        const response = await fetch(`/api/agency/status?subdomain=${subdomain}`, {
          headers: {
            'Authorization': `Bearer ${user.id}`,
            'x-session-token': user.id
          }
        });
        
        const data = await response.json();
        
        if (data.ok && data.agency) {
          setAgencyInfo({
            name: data.agency.name,
            subdomain: data.agency.subdomain,
            locale: data.agency.locale || 'fr',
            created_at: data.agency.created_at
          });
          
          // Déterminer le rôle de l'utilisateur
          if (data.agency.is_owner) {
            setUserRole({ is_owner: true, role: 'Propriétaire' });
          } else {
            setUserRole({ is_owner: false, role: 'Membre' });
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des informations de l\'agence:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAgencyInfo();
  }, [isAuthenticated, user]);

  if (loading) {
    return (
      <LoadingScreen 
        message="Chargement de l'agence"
        submessage="Récupération des informations..."
        variant="default"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {agencyInfo?.name || 'Agence'}
              </h1>
              <p className="text-gray-600">
                {agencyInfo?.subdomain}.qgchatting.com
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 font-medium">
              Bonjour, {getUserFirstName(user)}
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {userRole?.role}
            </span>
            <UnifiedLogoutButton 
              variant="outline"
            />
          </div>
        </div>

        {/* Agency Info Card */}
        <Card className="mb-8 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2 text-blue-600" />
              Informations de l'agence
            </CardTitle>
            <CardDescription>
              Détails de votre agence et de votre rôle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Nom de l'agence</h3>
                <p className="text-gray-700">{agencyInfo?.name}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Sous-domaine</h3>
                <p className="text-gray-700">{agencyInfo?.subdomain}.qgchatting.com</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Votre rôle</h3>
                <p className="text-gray-700">{userRole?.role}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Langue</h3>
                <p className="text-gray-700">{agencyInfo?.locale?.toUpperCase()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Actions disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userRole?.is_owner && (
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <BarChart3 className="h-6 w-6 text-purple-600 mb-2" />
                <CardTitle>Tableau de bord</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">
                  Accédez au tableau de bord complet de votre agence.
                </p>
                <Button 
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full"
                >
                  Ouvrir le dashboard
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <Users className="h-6 w-6 text-green-600 mb-2" />
              <CardTitle>Équipe</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm mb-4">
                Gérez les membres de votre équipe et leurs permissions.
              </p>
              <Button variant="outline" className="w-full">
                Gérer l'équipe
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <Settings className="h-6 w-6 text-orange-600 mb-2" />
              <CardTitle>Paramètres</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm mb-4">
                Configurez les paramètres de votre agence.
              </p>
              <Button variant="outline" className="w-full">
                Gérer les paramètres
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <MessageSquare className="h-6 w-6 text-blue-600 mb-2" />
              <CardTitle>Communication</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm mb-4">
                Gérez les canaux de communication et les modèles.
              </p>
              <Button variant="outline" className="w-full">
                Gérer la communication
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
