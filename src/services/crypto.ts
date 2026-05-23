function b64ToBytes(value: string): Uint8Array {
  const raw = atob(value);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function bytesToB64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = '';
  for (const byte of arr) str += String.fromCharCode(byte);
  return btoa(str);
}

async function importAesKey(base64Key: string): Promise<CryptoKey> {
  const keyBytes = b64ToBytes(base64Key);
  if (![16, 24, 32].includes(keyBytes.byteLength)) {
    throw new Error('APP_CONFIG_ENCRYPTION_KEY must decode to 16, 24, or 32 bytes');
  }
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptSecret(plainText: string, base64Key: string): Promise<{ encryptedValue: string; iv: string }> {
  const key = await importAesKey(base64Key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plainText);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { encryptedValue: bytesToB64(encrypted), iv: bytesToB64(iv) };
}

export async function decryptSecret(encryptedValue: string, iv: string, base64Key: string): Promise<string> {
  const key = await importAesKey(base64Key);
  const encryptedBytes = b64ToBytes(encryptedValue);
  const ivBytes = b64ToBytes(iv);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, encryptedBytes);
  return new TextDecoder().decode(plain);
}

export function maskSecret(value: string): string {
  if (!value) return '';
  if (value.length <= 8) return '****';
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}
