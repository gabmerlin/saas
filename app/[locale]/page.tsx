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
      <main className="flex min-h-screen items-center justify-center">
        <div className="rounded-xl border p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Setup OK ✅</h1>
          <p className="mt-2 text-muted-foreground">
            Next.js (App Router) + Tailwind v4 + shadcn/ui — locale: <b>{locale}</b>
          </p>
          <div className="mt-4 space-x-4">
            <Link className="underline" href={`/${locale}/owner`}>
              Ouvrir l&apos;onboarding owner
            </Link>
            <Link className="underline" href="/api/health">
              /api/health
            </Link>
            <Link className="underline" href="/debug-auth">
              Debug Auth
            </Link>
          </div>
        </div>
      </main>
    </AuthGuard>
  )
}
