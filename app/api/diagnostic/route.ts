import { NextRequest, NextResponse } from "next/server";

export const runtime = 'nodejs';

export async function GET() {
  try {
    const env = {
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configuré' : '❌ Manquant',
      SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configuré' : '❌ Manquant',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configuré' : '❌ Manquant',
      CRON_SECRET: process.env.CRON_SECRET ? '✅ Configuré' : '❌ Manquant',
    };

    return NextResponse.json({
      ok: true,
      environment: env,
      message: "Diagnostic des variables d'environnement"
    });

  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: "Erreur lors du diagnostic",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
