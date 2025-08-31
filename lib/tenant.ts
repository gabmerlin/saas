export function getSubdomainFromHost(host?: string | null) {
  if (!host) return null;
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  const h = host.split(':')[0].toLowerCase();

  // localhost
  if (h === 'localhost' || h.endsWith('.localhost')) return 'local';

  if (root && h === root) return null;          // apex
  if (root && h === `www.${root}`) return null; // www

  if (root && h.endsWith(`.${root}`)) {
    const sub = h.slice(0, -(root.length + 1)); // remove ".root"
    return sub || null;
  }
  // fallback: sous-domaines vercel *.vercel.app
  const parts = h.split('.');
  if (parts.length > 2) return parts[0];
  return null;
}
