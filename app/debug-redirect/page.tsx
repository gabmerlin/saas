"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function DebugRedirectPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const gatherDebugInfo = async () => {
      const info: any = {
        timestamp: new Date().toISOString(),
        hostname: window.location.hostname,
        pathname: window.location.pathname,
        search: window.location.search,
        href: window.location.href,
        userAgent: navigator.userAgent,
      };

      // Vérifier la session
      try {
        const supabase = supabaseBrowser();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        info.session = {
          exists: !!session,
          user: session?.user ? {
            id: session.user.id,
            email: session.user.email,
            email_confirmed_at: session.user.email_confirmed_at
          } : null,
          error: error?.message || null
        };
      } catch (error) {
        info.session = { error: error instanceof Error ? error.message : 'Unknown error' };
      }

      // Vérifier le localStorage
      try {
        info.localStorage = {
          supabaseSession: localStorage.getItem('supabase-session'),
          hasStoredSession: !!localStorage.getItem('supabase-session')
        };
      } catch (error) {
        info.localStorage = { error: 'Cannot access localStorage' };
      }

      // Vérifier le subdomain
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      info.subdomain = {
        detected: subdomain,
        isMainDomain: hostname === 'qgchatting.com' || hostname === 'www.qgchatting.com' || 
                     hostname === 'localhost:3000' || hostname === 'vercel.app',
        isSubdomain: subdomain && subdomain !== 'www' && subdomain !== 'qgchatting' && subdomain !== 'localhost'
      };

      setDebugInfo(info);
      setLoading(false);
    };

    gatherDebugInfo();
  }, []);

  const testRedirect = (path: string) => {
    window.location.href = path;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des informations de debug...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Debug des Redirections</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Informations de l'URL</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Hostname:</strong> {debugInfo.hostname}</p>
                <p><strong>Pathname:</strong> {debugInfo.pathname}</p>
                <p><strong>Search:</strong> {debugInfo.search}</p>
                <p><strong>Href:</strong> {debugInfo.href}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Détection du Sous-domaine</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Sous-domaine détecté:</strong> {debugInfo.subdomain?.detected || 'Aucun'}</p>
                <p><strong>Domaine principal:</strong> {debugInfo.subdomain?.isMainDomain ? 'Oui' : 'Non'}</p>
                <p><strong>Sous-domaine valide:</strong> {debugInfo.subdomain?.isSubdomain ? 'Oui' : 'Non'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session Supabase</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Session existe:</strong> {debugInfo.session?.exists ? 'Oui' : 'Non'}</p>
                {debugInfo.session?.user && (
                  <>
                    <p><strong>User ID:</strong> {debugInfo.session.user.id}</p>
                    <p><strong>Email:</strong> {debugInfo.session.user.email}</p>
                    <p><strong>Email confirmé:</strong> {debugInfo.session.user.email_confirmed_at ? 'Oui' : 'Non'}</p>
                  </>
                )}
                {debugInfo.session?.error && (
                  <p className="text-red-600"><strong>Erreur:</strong> {debugInfo.session.error}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>LocalStorage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Session stockée:</strong> {debugInfo.localStorage?.hasStoredSession ? 'Oui' : 'Non'}</p>
                {debugInfo.localStorage?.supabaseSession && (
                  <p><strong>Contenu:</strong> {debugInfo.localStorage.supabaseSession.substring(0, 100)}...</p>
                )}
                {debugInfo.localStorage?.error && (
                  <p className="text-red-600"><strong>Erreur:</strong> {debugInfo.localStorage.error}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Tests de Redirection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button onClick={() => testRedirect('/')} variant="outline">
                Vers /
              </Button>
              <Button onClick={() => testRedirect('/fr')} variant="outline">
                Vers /fr
              </Button>
              <Button onClick={() => testRedirect('/sign-in')} variant="outline">
                Vers /sign-in
              </Button>
              <Button onClick={() => testRedirect('/dashboard')} variant="outline">
                Vers /dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations Complètes (JSON)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
