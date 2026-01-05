/**
 * Encrypted API Service
 * 
 * Wraps all API calls with automatic encryption/decryption.
 * - Encrypts sensitive fields before sending
 * - Decrypts sensitive fields after receiving
 * - Supports parallel decryption for performance
 */

import { encryptString, decryptString } from '../lib/crypto';

// Sensitive fields that need encryption
const SENSITIVE_FIELDS = new Set([
  'name', 'amount', 'planned', 'description', 'justification',
  'source', 'goal', 'limit', 'bill_amount', 'paid_amount',
  'monthly_amount', 'total_amount', 'saved_amount', 'accumulated_funds'
]);

function isSensitiveField(field: string): boolean {
  if (SENSITIVE_FIELDS.has(field)) return true;
  for (const sf of SENSITIVE_FIELDS) {
    if (field.endsWith(`_${sf}`) || field.startsWith(`${sf}_`)) return true;
  }
  return false;
}

/**
 * Parallel-optimized encryption of an object
 */
export async function encryptObjectParallel(obj: any, key: CryptoKey): Promise<any> {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    // Process array items in parallel
    return Promise.all(obj.map(item => encryptObjectParallel(item, key)));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    const encryptionPromises: Promise<void>[] = [];
    
    for (const [field, value] of Object.entries(obj)) {
      // Skip already encrypted fields
      if (field.endsWith('_enc') || field.endsWith('_iv')) continue;
      
      if (isSensitiveField(field) && value !== null && value !== undefined) {
        // Queue encryption
        encryptionPromises.push(
          encryptString(String(value), key).then(({ ciphertext, iv }) => {
            result[`${field}_enc`] = ciphertext;
            result[`${field}_iv`] = iv;
            result[field] = value; // Keep plaintext during transition
          })
        );
      } else if (typeof value === 'object') {
        encryptionPromises.push(
          encryptObjectParallel(value, key).then(encrypted => {
            result[field] = encrypted;
          })
        );
      } else {
        result[field] = value;
      }
    }
    
    await Promise.all(encryptionPromises);
    return result;
  }
  
  return obj;
}

/**
 * Parallel-optimized decryption of an object
 */
export async function decryptObjectParallel(obj: any, key: CryptoKey): Promise<any> {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    // Process array items in parallel
    return Promise.all(obj.map(item => decryptObjectParallel(item, key)));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    const processedFields = new Set<string>();
    const decryptionPromises: Promise<void>[] = [];
    
    // First pass: identify encrypted fields and queue decryption
    for (const [field, value] of Object.entries(obj)) {
      if (field.endsWith('_enc')) {
        const originalField = field.slice(0, -4);
        const ivField = `${originalField}_iv`;
        
        if (obj[ivField]) {
          processedFields.add(field);
          processedFields.add(ivField);
          
          decryptionPromises.push(
            decryptString(value as string, obj[ivField] as string, key)
              .then(decrypted => {
                const numValue = parseFloat(decrypted);
                result[originalField] = isNaN(numValue) ? decrypted : numValue;
              })
              .catch(() => {
                // Fall back to plaintext if decryption fails
                if (obj[originalField] !== undefined) {
                  result[originalField] = obj[originalField];
                }
              })
          );
        }
      }
    }
    
    // Second pass: handle non-encrypted fields
    for (const [field, value] of Object.entries(obj)) {
      if (!processedFields.has(field) && !field.endsWith('_iv') && !field.endsWith('_enc')) {
        if (typeof value === 'object') {
          decryptionPromises.push(
            decryptObjectParallel(value, key).then(decrypted => {
              result[field] = decrypted;
            })
          );
        } else {
          result[field] = value;
        }
      }
    }
    
    await Promise.all(decryptionPromises);
    return result;
  }
  
  return obj;
}

/**
 * Create an encrypted API client
 */
export function createEncryptedApiClient(
  baseUrl: string,
  getToken: () => string | null,
  getCryptoKey: () => CryptoKey | null,
  apikey?: string
) {
  const getHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (apikey) headers['apikey'] = apikey;
    return headers;
  };
  
  /**
   * Make an encrypted request
   */
  async function encryptedRequest<T>(
    path: string,
    options: RequestInit = {},
    body?: any
  ): Promise<T> {
    const key = getCryptoKey();
    const headers = getHeaders();
    
    let processedBody: string | undefined;
    if (body) {
      // Encrypt body if encryption is enabled
      const encrypted = key ? await encryptObjectParallel(body, key) : body;
      processedBody = JSON.stringify(encrypted);
    }
    
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
      body: processedBody,
    });
    
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody?.error?.message || `Request failed: ${res.status}`);
    }
    
    const data = await res.json();
    
    // Decrypt response if encryption is enabled
    if (key && data.data) {
      data.data = await decryptObjectParallel(data.data, key);
    }
    
    return data as T;
  }
  
  return {
    get: <T>(path: string) => encryptedRequest<T>(path, { method: 'GET' }),
    post: <T>(path: string, body: any) => encryptedRequest<T>(path, { method: 'POST' }, body),
    put: <T>(path: string, body: any) => encryptedRequest<T>(path, { method: 'PUT' }, body),
    patch: <T>(path: string, body: any) => encryptedRequest<T>(path, { method: 'PATCH' }, body),
    delete: <T>(path: string) => encryptedRequest<T>(path, { method: 'DELETE' }),
  };
}

/**
 * Batch decrypt multiple entities (for dashboard data)
 */
export async function batchDecrypt<T>(
  entities: T[],
  key: CryptoKey | null,
  batchSize: number = 10
): Promise<T[]> {
  if (!key || entities.length === 0) return entities;
  
  const results: T[] = [];
  
  // Process in batches
  for (let i = 0; i < entities.length; i += batchSize) {
    const batch = entities.slice(i, i + batchSize);
    const decryptedBatch = await Promise.all(
      batch.map(entity => decryptObjectParallel(entity, key))
    );
    results.push(...decryptedBatch);
  }
  
  return results;
}

