// app/[locale]/page.tsx
'use client';

import Link from 'next/link'
import AuthGuard from '@/components/auth/auth-guard'
import { use } from 'react'
import { usePageTitle } from '@/lib/hooks/use-page-title'

export default function LocaleHome({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  
  // Définir le titre de la page
  usePageTitle("QG Chatting")

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="flex min-h-screen">
          {/* Left side - Branding */}
          <div className="hidden lg:flex lg:w-[35%] bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative z-10 flex flex-col justify-center px-12 text-white">
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <h1 className="text-3xl font-bold">QG Chatting</h1>
                </div>
                <h2 className="text-2xl font-semibold mb-4">
                  Bienvenue dans votre espace
                </h2>
                <p className="text-blue-100 text-lg leading-relaxed">
                  Vous êtes connecté et prêt à utiliser QG Chatting. 
                  Accédez à votre tableau de bord pour commencer à collaborer avec votre équipe.
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold">Sécurité</h3>
                    <p className="text-blue-100 text-sm">Session authentifiée</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold">Performance</h3>
                    <p className="text-blue-100 text-sm">Interface optimisée</p>
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
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">QG Chatting</h1>
                </div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Setup OK ✅
                  </h1>
                  <p className="text-gray-600 mb-6">
                    Next.js (App Router) + Tailwind v4 + shadcn/ui — locale: <span className="font-semibold text-blue-600">{locale}</span>
                  </p>
                  
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center justify-center mb-2">
                        <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        <span className="text-sm font-medium text-blue-800">Actions disponibles</span>
                      </div>
                      <div className="space-y-2">
                        <Link 
                          className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                          href={`/${locale}/owner`}
                        >
                          Ouvrir l&apos;onboarding owner
                        </Link>
                        <Link 
                          className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                          href="/api/health"
                        >
                          Vérifier l&apos;API Health
                        </Link>
                        <Link 
                          className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                          href="/debug-auth"
                        >
                          Debug Auth
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  )
}
