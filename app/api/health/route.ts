import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const { error } = await supabaseAdmin.from('tenants').select('id').limit(1);
  return NextResponse.json({ ok: !error, error: error?.message ?? null, at: new Date().toISOString() });
}
