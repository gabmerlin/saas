// app/lib/vercel.ts
const VERCEL_TOKEN = process.env.VERCEL_TOKEN!;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID!;
const API = "https://api.vercel.com";

async function vz<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Vercel ${path} ${res.status}: ${JSON.stringify(data)}`);
  return data as T;
}

export async function vercelAddDomainToProject(name: string) {
  return vz(`/v10/projects/${PROJECT_ID}/domains`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}
