import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const { error } = await supabaseAdmin.from('tenants').select('id').limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, error: null, at: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { ok: false, error: message, at: new Date().toISOString() },
      { status: 500 }
    );
  }
}
