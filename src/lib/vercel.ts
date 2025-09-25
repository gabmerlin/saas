// lib/vercel.ts
type AddDomainResult = { created?: boolean; exists?: boolean; name: string; raw?: unknown };

function vercelApi(path: string) {
  const base = "https://api.vercel.com";
  const team = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "";
  return `${base}${path}${team}`;
}

export async function addDomainToVercelProject(name: string): Promise<AddDomainResult> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) throw new Error("ENV_MISSING:VERCEL_TOKEN_OR_PROJECT_ID");

  const res = await fetch(vercelApi(`/v10/projects/${projectId}/domains`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
    // pas de cache, on veut l’état réel
    cache: "no-store",
  });

  if (res.status === 200 || res.status === 201) {
    const json = await res.json();
    return { created: true, name, raw: json };
  }

  const json = await res.json().catch(() => ({} as unknown));
  // idempotent : déjà présent sur le projet
  const j = json as Record<string, unknown>;
  if (
    res.status === 409 ||
    (j.error as Record<string, unknown> | undefined)?.code === "domain_already_in_use" ||
    (j.error as Record<string, unknown> | undefined)?.code === "domain_conflict"
  ) {
    return { exists: true, name, raw: json };
  }

  throw new Error(`VERCEL_ADD_DOMAIN_FAILED: ${res.status} ${JSON.stringify(json)}`);
}
