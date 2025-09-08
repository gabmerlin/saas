// lib/utils/http.ts
// Parse une réponse en JSON sans planter si le corps est vide ou non-JSON.
export async function safeJson<T = unknown>(res: Response): Promise<T | null> {
  const text = await res.text(); // lit une fois le body
  if (!text) return null;        // 204/empty -> null
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
