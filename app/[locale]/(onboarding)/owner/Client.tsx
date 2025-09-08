"use client";

import { useEffect, useMemo, useState } from "react";
import { OwnerOnboardingSchema } from "@/lib/validation/onboarding";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const LANGS = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
];

// Liste réduite de timezones IANA (ajoute les tiennes si besoin)
const TIMEZONES = [
  "UTC","Europe/Paris","Europe/London","Europe/Berlin","Europe/Madrid",
  "America/New_York","America/Los_Angeles","America/Sao_Paulo",
  "Africa/Casablanca","Asia/Dubai","Asia/Singapore","Asia/Tokyo","Australia/Sydney"
];

export default function OwnerOnboardingClient({
  locale, email, rootDomain
}: { locale: string; email: string; rootDomain: string }) {

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);

  const [form, setForm] = useState({
    agencyName: "",
    agencySlug: "",
    subdomain: "",
    primaryColor: "#3b82f6",
    logoUrl: "",
    locale,
    timezone: "UTC",
  });

  const [subdomainState, setSubdomainState] = useState<"idle"|"checking"|"available"|"taken">("idle");

  // Aperçu de domaine
  const previewUrl = useMemo(() => {
    if (!form.subdomain) return `https://____.${rootDomain}`;
    return `https://${form.subdomain}.${rootDomain}`;
  }, [form.subdomain, rootDomain]);

  // Auto-slug (bouton)
  function makeSlugFromName() {
    const s = form.agencyName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setForm({ ...form, agencySlug: s });
  }

  async function checkSubdomain(sd: string) {
    if (!sd) return;
    setSubdomainState("checking");
    try {
      const r = await fetch(`/api/onboarding/check-subdomain?subdomain=${encodeURIComponent(sd)}`);
      const j = await r.json();
      if (j.ok) setSubdomainState("available");
      else setSubdomainState("taken");
    } catch {
      setSubdomainState("idle");
    }
  }
  useEffect(() => {
    const t = setTimeout(() => checkSubdomain(form.subdomain), 400);
    return () => clearTimeout(t);
  }, [form.subdomain]);

  async function submit() {
    setErrors(null);
    const parsed = OwnerOnboardingSchema.safeParse(form);
    if (!parsed.success) { setErrors("Entrée invalide."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/onboarding/owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) { setErrors(j.error || "Unknown error"); setLoading(false); return; }
      window.location.href = j.agencyUrl;
    } catch (e: unknown) {
      setErrors(e instanceof Error ? e.message : "Request failed");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">Onboarding Owner</h1>
      <p className="text-sm text-muted-foreground mb-6">Logged as: {email}</p>

      <Card className="p-6 space-y-6">
        <StepIndicator step={step} />
        {step === 1 && (
          <section className="space-y-4">
            <h2 className="text-lg font-medium">1) Agence</h2>
            <div>
              <label className="text-sm">Nom de l&apos;agence</label>
              <Input value={form.agencyName} onChange={(e) => setForm({ ...form, agencyName: e.target.value })} placeholder="Ex: Lumen Agency" />
              <p className="text-xs text-muted-foreground mt-1">
                Utilisé pour l’affichage et la facturation.
              </p>
            </div>
            <div>
              <label className="text-sm">Slug agence</label>
              <div className="flex gap-2">
                <Input value={form.agencySlug} onChange={(e) => setForm({ ...form, agencySlug: e.target.value })} placeholder="ex: lumen-agency" />
                <Button type="button" variant="secondary" onClick={makeSlugFromName}>Générer</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Le <strong>slug</strong> est un identifiant lisible (URL-friendly) dérivé du nom, utilisé dans la config interne & thèmes.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setStep(2)} disabled={!form.agencyName || !form.agencySlug}>Continuer</Button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4">
            <h2 className="text-lg font-medium">2) Sous-domaine</h2>
            <div>
              <label className="text-sm">Sous-domaine</label>
              <Input value={form.subdomain} onChange={(e) => setForm({ ...form, subdomain: e.target.value.toLowerCase() })} placeholder="ex: lumen" />
              <div className="text-xs mt-1">
                <span className="mr-2">Aperçu&nbsp;:</span>
                <code className="px-2 py-0.5 rounded bg-muted">{previewUrl}</code>
              </div>
              <p className="text-xs mt-1">
                {subdomainState === "checking" && "Vérification..."}
                {subdomainState === "available" && "✅ Disponible"}
                {subdomainState === "taken" && "❌ Déjà pris"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>Retour</Button>
              <Button onClick={() => setStep(3)} disabled={subdomainState !== "available"}>Continuer</Button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-4">
            <h2 className="text-lg font-medium">3) Branding</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Couleur principale</label>
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Choisir une couleur"
                    type="color"
                    className="h-10 w-14 rounded border"
                    value={form.primaryColor}
                    onChange={(e)=>setForm({ ...form, primaryColor: e.target.value })}
                  />
                  <Input
                    value={form.primaryColor}
                    onChange={(e)=>setForm({ ...form, primaryColor: e.target.value })}
                    placeholder="#3b82f6"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Utilise le sélecteur ou colle un code <code>#hex</code>.
                </p>
              </div>
              <div>
                <label className="text-sm">Logo (URL)</label>
                <Input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>Retour</Button>
              <Button onClick={() => setStep(4)}>Continuer</Button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-4">
            <h2 className="text-lg font-medium">4) Préférences</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Langue</label>
                <select
                  className="border rounded h-10 px-2 w-full bg-background"
                  value={form.locale}
                  onChange={(e)=>setForm({ ...form, locale: e.target.value })}
                >
                  {LANGS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm">Fuseau horaire</label>
                <select
                  className="border rounded h-10 px-2 w-full bg-background"
                  value={form.timezone}
                  onChange={(e)=>setForm({ ...form, timezone: e.target.value })}
                >
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>
            <Separator />
            {errors && <p className="text-sm text-red-600">{errors}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(3)}>Retour</Button>
              <Button onClick={submit} disabled={loading}>{loading ? "Création..." : "Créer l'agence"}</Button>
            </div>
          </section>
        )}
      </Card>
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  const labels = ["Agence", "Sous-domaine", "Branding", "Préférences"];
  return (
    <div className="flex items-center gap-2 text-sm">
      {labels.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${i+1<=step ? "bg-primary text-white" : "bg-muted"}`}>{i+1}</div>
          <span className={`${i+1===step ? "font-medium" : "text-muted-foreground"}`}>{l}</span>
          {i<labels.length-1 && <Separator orientation="vertical" className="h-4" />}
        </div>
      ))}
    </div>
  );
}
