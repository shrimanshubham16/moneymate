import { generateMnemonic, mnemonicToEntropy, entropyToMnemonic } from "@scure/bip39";
import { wordlists } from "@scure/bip39/wordlists/english";

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
    false,
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
  return generateMnemonic(wordlists.english, 256);
}

/**
 * Validate a recovery mnemonic (returns false if invalid)
 */
export function isValidRecoveryKey(mnemonic: string): boolean {
  try {
    mnemonicToEntropy(mnemonic, wordlists.english);
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

