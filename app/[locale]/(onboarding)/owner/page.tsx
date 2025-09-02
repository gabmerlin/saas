// app/[locale]/(onboarding)/owner/page.tsx
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function OwnerOnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Server Action: appelée par <form action={provision}>
  async function provision(formData: FormData) {
    "use server"

    const sub = formData.get("subdomain")?.toString().trim().toLowerCase()
    if (!sub) throw new Error("Sous-domaine requis.")

    // Validation minimale
    const ok =
      /^[a-z0-9-]{3,30}$/.test(sub) && !sub.startsWith("-") && !sub.endsWith("-")
    if (!ok) {
      throw new Error(
        "Sous-domaine invalide. Utilise 3–30 caractères : a-z, 0-9 et tiret (pas en début/fin).",
      )
    }

    const secret = process.env.DOMAIN_PROVISIONING_SECRET
    if (!secret) throw new Error("DOMAIN_PROVISIONING_SECRET manquant.")

    // Base URL pour appeler l’API interne côté serveur
    const base =
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.APP_BASE_URL || "http://localhost:3000"

    // Appel de ton endpoint interne (ne fuit pas le secret au client)
    const res = await fetch(`${base}/api/tenants/domains`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-provisioning-secret": secret,
      },
      body: JSON.stringify({ subdomain: sub }),
      cache: "no-store",
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json?.ok) {
      console.error("Provision error:", res.status, json)
      throw new Error(json?.error || `Provisioning failed (HTTP ${res.status})`)
    }

    // Redirection vers le nouveau sous-domaine (on garde la locale dans l’URL)
    const root =
      process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.PRIMARY_ZONE || "qgchatting.com"
    redirect(`https://${sub}.${root}/${locale}`)
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-2 text-3xl font-bold">Onboarding Owner</h1>
      <p className="text-muted-foreground">
        Ici, on crée le tenant, on lie l’owner (plus tard), puis on provisionne un sous-domaine via l’API interne.
      </p>

      <div className="my-6 rounded-xl border p-4">
        <p className="font-medium mb-2">Étapes prévues :</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Créer le tenant en base (à brancher ensuite)</li>
          <li>Associer l’owner (user courant)</li>
          <li>Appeler <code>POST /api/tenants/domains</code></li>
          <li>Rediriger vers le sous-domaine une fois prêt</li>
        </ol>
      </div>

      {/* Formulaire: appelle la Server Action ci-dessus */}
      <form action={provision} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Sous-domaine souhaité</span>
          <div className="mt-1 flex items-stretch overflow-hidden rounded-lg border">
            <input
              name="subdomain"
              required
              pattern="[a-z0-9-]{3,30}"
              title="3–30 caractères (a-z, 0-9 et tiret)."
              placeholder="ex. demo7"
              className="flex-1 bg-transparent px-3 py-2 outline-none"
            />
            <span className="border-l px-3 py-2 text-sm text-muted-foreground">
              .{process.env.NEXT_PUBLIC_ROOT_DOMAIN || "qgchatting.com"}
            </span>
          </div>
        </label>

        <button
          type="submit"
          className="rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90"
        >
          Créer et provisionner →
        </button>
      </form>

      <p className="mt-6">
        <Link href={`/${locale}`} className="underline">
          Revenir à l’accueil
        </Link>
      </p>
    </main>
  )
}
