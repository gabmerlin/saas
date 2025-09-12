"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import SignInForm from "./SignInForm";

function SignInContent() {
  // En Client Component, on lit les query params via le hook
  const searchParams = useSearchParams();
  const next = searchParams?.get("next") ?? "/dashboard";

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-4">Se connecter</h1>
        <SignInForm next={next} />
        <div className="mt-4 text-sm text-muted-foreground">
          Pas de compte ?
          <Link href={`/sign-up?next=${encodeURIComponent(next)}`} className="ml-2 underline text-foreground">
            Créer un compte
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <SignInContent />
    </Suspense>
  );
}
