// lib/ovh.ts
import crypto from "crypto";

const ENDPOINT = process.env.OVH_API_ENDPOINT!;
const APP_KEY = process.env.OVH_APP_KEY!;
const APP_SECRET = process.env.OVH_APP_SECRET!;
const CONSUMER_KEY = process.env.OVH_CONSUMER_KEY!;

function ovhHeaders(method: string, path: string, body: string = "") {
  const now = Math.floor(Date.now() / 1000).toString();
  const toSign = [
    APP_SECRET,
    CONSUMER_KEY,
    method,
    ENDPOINT + path,
    body,
    now,
  ].join("+");
  const signature = "$1$" + crypto.createHash("sha1").update(toSign).digest("hex");
  return {
    "X-Ovh-Application": APP_KEY,
    "X-Ovh-Consumer": CONSUMER_KEY,
    "X-Ovh-Timestamp": now,
    "X-Ovh-Signature": signature,
    "Content-Type": "application/json",
  };
}

export async function ovhCreateOrUpdateCNAME(
  zone: string,
  sub: string,
  target: string
) {
  const recordPath = `/domain/zone/${zone}/record`;
  // Rechercher s’il existe déjà
  const searchQ = `?field=subDomain&subDomain=${encodeURIComponent(sub)}&field=type&type=CNAME`;
  const listRes = await fetch(ENDPOINT + recordPath + searchQ, {
    headers: ovhHeaders("GET", recordPath + searchQ),
  });
  if (!listRes.ok) throw new Error(`OVH list records: ${await listRes.text()}`);
  const ids: number[] = await listRes.json();

  const payload = JSON.stringify({ fieldType: "CNAME", subDomain: sub, target });

  if (ids.length === 0) {
    // create
    const res = await fetch(ENDPOINT + recordPath, {
      method: "POST",
      headers: ovhHeaders("POST", recordPath, payload),
      body: payload,
    });
    if (!res.ok && res.status !== 409) {
      throw new Error(`OVH create CNAME failed: ${await res.text()}`);
    }
  } else {
    // update first id
    const id = ids[0];
    const recPath = `/domain/zone/${zone}/record/${id}`;
    const res = await fetch(ENDPOINT + recPath, {
      method: "PUT",
      headers: ovhHeaders("PUT", recPath, payload),
      body: payload,
    });
    if (!res.ok) throw new Error(`OVH update CNAME failed: ${await res.text()}`);
  }

  // refresh zone
  const refreshPath = `/domain/zone/${zone}/refresh`;
  const res2 = await fetch(ENDPOINT + refreshPath, {
    method: "POST",
    headers: ovhHeaders("POST", refreshPath),
  });
  if (!res2.ok) throw new Error(`OVH zone refresh failed: ${await res2.text()}`);
}
