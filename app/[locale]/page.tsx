// app/[locale]/page.tsx
import Link from 'next/link'

export default async function LocaleHome({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="rounded-xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Setup OK ✅</h1>
        <p className="mt-2 text-muted-foreground">
          Next.js (App Router) + Tailwind v4 + shadcn/ui — locale: <b>{locale}</b>
        </p>
        <div className="mt-4 space-x-4">
          <Link className="underline" href={`/${locale}/owner`}>
            Ouvrir l’onboarding owner
          </Link>
          <Link className="underline" href="/api/health">
            /api/health
          </Link>
        </div>
      </div>
    </main>
  )
}
