// app/(auth)/callback/page.tsx
'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function CallbackInner() {
  const sp = useSearchParams()
  const type = sp.get('type') ?? ''
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-xl font-semibold">Auth callback</h1>
      <p className="mt-2 text-muted-foreground">type: {type || 'n/a'}</p>
      <p className="mt-2">
        (Cette page est juste un placeholder — l’application a bien un
        Suspense autour de <code>useSearchParams</code>.)
      </p>
    </main>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="p-6">Chargement…</div>}>
      <CallbackInner />
    </Suspense>
  )
}
