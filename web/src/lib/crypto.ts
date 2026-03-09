import { generateMnemonic, mnemonicToEntropy, entropyToMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";

// Helpers for base64 encoding/decoding in browser
const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (b64: string) =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/**
 * Derive an AES-GCM key from password and salt using PBKDF2
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations = 100_000
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,  // extractable: true - allows key to be exported for sessionStorage
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt plaintext with AES-GCM and return base64 ciphertext + iv
 */
export async function encryptString(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return {
    ciphertext: toBase64(new Uint8Array(encrypted)),
    iv: toBase64(iv),
  };
}

/**
 * Decrypt AES-GCM ciphertext (base64) using provided iv (base64)
 */
export async function decryptString(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const encryptedBytes = fromBase64(ciphertext);
  const ivBytes = fromBase64(iv);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    encryptedBytes
  );
  return new TextDecoder().decode(decrypted);
}

/**
 * Generate a 24-word mnemonic recovery key
 */
export function generateRecoveryKey(): string {
  return generateMnemonic(wordlist, 256);
}

/**
 * Validate a recovery mnemonic (returns false if invalid)
 */
export function isValidRecoveryKey(mnemonic: string): boolean {
  try {
    mnemonicToEntropy(mnemonic, wordlist);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a random salt (16 bytes) encoded as base64 string
 */
export function generateSalt(): { raw: Uint8Array; b64: string } {
  const raw = crypto.getRandomValues(new Uint8Array(16));
  return { raw, b64: toBase64(raw) };
}

/**
 * Convert base64 salt string back to Uint8Array
 */
export function saltFromBase64(b64: string): Uint8Array {
  return fromBase64(b64);
}

/**
 * Hash recovery key (mnemonic) for safe storage on server.
 */
export async function hashRecoveryKey(mnemonic: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(mnemonic);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toBase64(new Uint8Array(digest));
}

// ── Key Wrapping (KEK-based recovery-safe encryption) ──

/**
 * Generate a random 256-bit AES-GCM master key (KEK).
 * Unlike deriveKey, this is not tied to any password.
 */
export async function generateMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Export a CryptoKey to base64 string (raw format).
 */
export async function exportKeyRaw(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return toBase64(new Uint8Array(raw));
}

/**
 * Import a CryptoKey from base64 string (raw format).
 */
export async function importKeyRaw(b64: string): Promise<CryptoKey> {
  const raw = fromBase64(b64);
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Wrap (encrypt) a master key with a wrapping key using AES-GCM.
 * Returns base64 ciphertext + iv.
 */
export async function wrapKey(
  masterKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const rawKey = await crypto.subtle.exportKey("raw", masterKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    rawKey
  );
  return {
    ciphertext: toBase64(new Uint8Array(wrapped)),
    iv: toBase64(iv),
  };
}

/**
 * Unwrap (decrypt) a master key using a wrapping key.
 * Returns the original CryptoKey.
 */
export async function unwrapKey(
  ciphertext: string,
  iv: string,
  wrappingKey: CryptoKey
): Promise<CryptoKey> {
  const encBytes = fromBase64(ciphertext);
  const ivBytes = fromBase64(iv);
  const rawKey = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    wrappingKey,
    encBytes
  );
  return crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

