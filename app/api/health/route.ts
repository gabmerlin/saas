import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const { error } = await supabaseAdmin.from('tenants').select('id').limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, error: null, at: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message, at: new Date().toISOString() }, { status: 500 });
  }
}
