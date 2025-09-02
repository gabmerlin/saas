const VERCEL_API = "https://api.vercel.com";

type VercelProjectDomain = {
  name: string;
  projectId: string;
  verified: boolean;
  /** etc. champs non exhaustifs, on ne les utilise pas ici */
};

export async function vercelAddDomainToProject(domain: string): Promise<boolean> {
  const res = await fetch(`${VERCEL_API}/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: domain }),
  });

  if (!res.ok && res.status !== 409) {
    const txt = await res.text();
    throw new Error(`Vercel add domain failed (${res.status}): ${txt}`);
  }
  return res.ok || res.status === 409;
}

export async function vercelGetDomainVerification(domain: string): Promise<VercelProjectDomain> {
  const res = await fetch(
    `${VERCEL_API}/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}`,
    { headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Vercel get domain failed: ${await res.text()}`);
  return (await res.json()) as VercelProjectDomain;
}
