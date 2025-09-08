import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/tenants";

type Body = { email?: string; username?: string };

export async function POST(req: Request) {
  let body: Body = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const supabase = getServiceClient();

  // Email
// Email
let emailTaken = false;
if (body.email) {
  const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  emailTaken = !!data.users.find(
    (u) => u.email?.toLowerCase() === body.email!.toLowerCase()
  );
}


  // Username (stocké dans user_metadata.username) — scan simple première page
  let usernameTaken = false;
  if (body.username) {
    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    usernameTaken = !!data.users.find(u =>
      typeof (u.user_metadata as Record<string, unknown> | undefined)?.username === "string" &&
      String((u.user_metadata as Record<string, unknown>).username).toLowerCase() === body.username!.toLowerCase()
    );
  }

  return NextResponse.json({ ok: true, emailTaken, usernameTaken });
}
