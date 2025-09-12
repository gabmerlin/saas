import { NextRequest, NextResponse } from "next/server";

function sanitizeNext(next: string | null): string {
  if (!next || !next.startsWith("/")) return "/";
  return next;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = sanitizeNext(url.searchParams.get("next"));

  // Toujours rediriger vers la page client qui gérera l'authentification
  const redirectUrl = new URL('/auth/callback', url.origin);
  redirectUrl.searchParams.set('next', next);
  
  // Préserver tous les paramètres de l'URL originale
  for (const [key, value] of url.searchParams) {
    if (key !== 'next') {
      redirectUrl.searchParams.set(key, value);
    }
  }
  
  // Préserver le hash s'il existe
  if (url.hash) {
    redirectUrl.hash = url.hash;
  }

  return NextResponse.redirect(redirectUrl);
}
