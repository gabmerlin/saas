'use client';

import { getCurrentSubdomain } from '@/lib/utils/cross-domain-redirect';
import { UserRoles } from '@/components/dashboard/user-roles';

export default function DashboardPage() {
  const subdomain = getCurrentSubdomain();
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Dashboard de l'agence
          </h1>
          <p className="text-gray-600 mb-4">
            Bienvenue sur le dashboard de l'agence <strong>{subdomain}</strong>
          </p>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Vos rôles :</h2>
            <UserRoles />
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">
              ✅ Vous avez accès à cette agence !
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}