/**
 * Password hashing using Web Crypto API (SubtleCrypto).
 * Works in both Node.js and Edge Runtime without external dependencies.
 * No import from 'crypto' or 'bcryptjs' needed for the primary hash path.
 */

const ITERATIONS = 100000;
const HASH_ALGO = 'SHA-256';
const SALT_LENGTH = 32;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: HASH_ALGO,
    },
    keyMaterial,
    256
  );
}

/**
 * Hash a plaintext password using PBKDF2 via Web Crypto API.
 * Format: webpbkdf2:iterations:base64salt:base64hash
 */
export async function hashPassword(plaintext: string): Promise<string> {
  const salt = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(salt);
  const hash = await deriveKey(plaintext, salt);
  return `webpbkdf2:${ITERATIONS}:${arrayBufferToBase64(salt.buffer)}:${arrayBufferToBase64(hash)}`;
}

/**
 * Verify a plaintext password against a stored hash.
 * Supports:
 * - Web PBKDF2 format (webpbkdf2:...)
 * - Node PBKDF2 format (pbkdf2:...) — legacy
 * - Bcrypt format ($2a$, $2b$, $2y$) — legacy
 * - Plaintext — legacy fallback for migration
 */
export async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
  // Web PBKDF2 format
  if (stored.startsWith('webpbkdf2:')) {
    const parts = stored.split(':');
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const salt = new Uint8Array(base64ToArrayBuffer(parts[2]));
    const expectedHash = parts[3];
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(plaintext),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const hash = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: HASH_ALGO },
      keyMaterial,
      256
    );
    return arrayBufferToBase64(hash) === expectedHash;
  }

  // Node PBKDF2 format — need Node.js crypto for verification
  if (stored.startsWith('pbkdf2:')) {
    try {
      const { pbkdf2Sync } = await import('crypto');
      const parts = stored.split(':');
      if (parts.length !== 5) return false;
      const iterations = parseInt(parts[1], 10);
      const keyLength = parseInt(parts[2], 10);
      const salt = Buffer.from(parts[3], 'base64');
      const expectedHash = parts[4];
      const hash = pbkdf2Sync(plaintext, salt, iterations, keyLength, 'sha512');
      return hash.toString('base64') === expectedHash;
    } catch {
      return false;
    }
  }

  // Bcrypt format
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    try {
      const bcrypt = await import('bcryptjs');
      return await bcrypt.compare(plaintext, stored);
    } catch {
      return false;
    }
  }

  // Legacy fallback: plaintext comparison (for unmigrated passwords)
  return plaintext === stored;
}

/**
 * Check if a stored value is already a properly hashed password.
 */
export function isBcryptHash(value: string): boolean {
  return value.startsWith('webpbkdf2:') || value.startsWith('pbkdf2:') || value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$');
}
