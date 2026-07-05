// Team API keys: opaque `koeti_<64 hex>` bearer tokens for MVP-to-MVP and
// external integrations. Only the SHA-256 hash is stored (see apiKeys table in
// @koeti/db); the plaintext is shown once at creation. Web Crypto so the same
// code runs in node and edge runtimes.

export function generateApiKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `koeti_${toHex(bytes)}`;
}

export async function hashApiKey(key: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return toHex(new Uint8Array(digest));
}

// Enough to identify a key in the UI without revealing it.
export function apiKeyPrefix(key: string) {
  return key.slice(0, 14);
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
