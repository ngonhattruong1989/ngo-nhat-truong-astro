const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function mac(payload, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function signSession(username, secret, now = Date.now()) {
  if (!secret) throw new Error('AUTH_SECRET is not configured');
  const payload = `${username}:${now}`;
  return `${btoa(payload)}.${await mac(payload, secret)}`;
}

export async function verifySession(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || !secret) return false;
  const parts = token.split('.');
  if (parts.length !== 2 || !/^[a-f0-9]{64}$/i.test(parts[1])) return false;
  try {
    const payload = atob(parts[0]);
    const separator = payload.lastIndexOf(':');
    if (separator < 1) return false;
    const timestamp = Number(payload.slice(separator + 1));
    const age = now - timestamp;
    if (!Number.isSafeInteger(timestamp) || timestamp <= 0 || age < -60_000 || age > SESSION_TTL_MS) return false;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const signature = Uint8Array.from(parts[1].match(/.{2}/g), (byte) => parseInt(byte, 16));
    return await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(payload));
  } catch {
    return false;
  }
}

export const SESSION_MAX_AGE = SESSION_TTL_MS / 1000;
