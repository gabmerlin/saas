import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/ping", method: "GET" });
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  return NextResponse.json({ ok: true, route: "/api/ping", method: "POST", received: json });
}
