/**
 * Cifra el payload de login con la llave pública del backend
 * (RSA-OAEP SHA-256 + AES-256-GCM, vía WebCrypto). En el front no hay
 * ninguna llave secreta: la privada vive solo en el servidor.
 * Debe coincidir con backend/src/auth/crypto/login-crypto.service.ts.
 */
export interface LoginKey {
  kid: string;
  alg: string;
  publicKey: string; // SPKI DER en base64
}

export interface LoginCifrado {
  kid: string;
  ek: string;
  iv: string;
  ct: string;
}

const ALG = 'RSA-OAEP-256+A256GCM';
const AAD = new TextEncoder().encode('sm-login-v1');

const b64 = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  bytes.forEach(b => (s += String.fromCharCode(b)));
  return btoa(s);
};

const desdeB64 = (s: string): ArrayBuffer => Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer as ArrayBuffer;

export async function cifrarLogin(key: LoginKey, username: string, password: string): Promise<LoginCifrado> {
  if (key.alg !== ALG) throw new Error('Algoritmo de login no soportado');
  const subtle = globalThis.crypto.subtle;

  const rsa = await subtle.importKey(
    'spki', desdeB64(key.publicKey), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt'],
  );
  const aes = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const nonce = b64(crypto.getRandomValues(new Uint8Array(18)));

  const plano = new TextEncoder().encode(JSON.stringify({ username, password, ts: Date.now(), nonce }));
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, aes, plano);
  const ek = await subtle.encrypt({ name: 'RSA-OAEP' }, rsa, await subtle.exportKey('raw', aes));

  return { kid: key.kid, ek: b64(ek), iv: b64(iv), ct: b64(ct) };
}
