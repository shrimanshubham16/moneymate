/**
 * useEncryptedApi - Hook for E2E encrypted API operations
 * 
 * Phase 1: Parallel encryption/decryption for performance
 * 
 * For new users (with encryption enabled):
 * - Encrypts sensitive data before sending to server
 * - Decrypts data when receiving from server
 * 
 * For legacy users (no encryption):
 * - Passes data through unchanged
 */

import { useCrypto } from '../contexts/CryptoContext';
import { encryptString, decryptString } from '../lib/crypto';

// Fields that contain sensitive financial data
const SENSITIVE_FIELDS = new Set([
  'name', 'amount', 'planned', 'description', 'justification',
  'source', 'goal', 'limit', 'bill_amount', 'paid_amount',
  'monthly_amount', 'total_amount', 'saved_amount', 'accumulated_funds'
]);

/**
 * Check if a field should be encrypted
 */
function isSensitiveField(field: string): boolean {
  if (SENSITIVE_FIELDS.has(field)) return true;
  for (const sf of SENSITIVE_FIELDS) {
    if (field.endsWith(`_${sf}`) || field.startsWith(`${sf}_`)) return true;
  }
  return false;
}

/**
 * PARALLEL: Recursively encrypt sensitive fields in an object
 */
async function encryptObject(obj: any, key: CryptoKey): Promise<any> {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    // Process array items in parallel
    return Promise.all(obj.map(item => encryptObject(item, key)));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    const encryptionTasks: Promise<void>[] = [];
    
    for (const [field, value] of Object.entries(obj)) {
      // Skip already encrypted fields
      if (field.endsWith('_enc') || field.endsWith('_iv')) continue;
      
      if (isSensitiveField(field) && value !== null && value !== undefined) {
        // Queue encryption task (parallel)
        encryptionTasks.push(
          encryptString(String(value), key).then(({ ciphertext, iv }) => {
            result[`${field}_enc`] = ciphertext;
            result[`${field}_iv`] = iv;
            result[field] = value; // Keep plaintext during transition
          })
        );
      } else if (typeof value === 'object') {
        encryptionTasks.push(
          encryptObject(value, key).then(encrypted => {
            result[field] = encrypted;
          })
        );
      } else {
        result[field] = value;
      }
    }
    
    // Execute all encryption tasks in parallel
    await Promise.all(encryptionTasks);
    return result;
  }
  
  return obj;
}

/**
 * PARALLEL: Recursively decrypt sensitive fields in an object
 */
async function decryptObject(obj: any, key: CryptoKey): Promise<any> {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    // Process array items in parallel
    return Promise.all(obj.map(item => decryptObject(item, key)));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    const processedFields = new Set<string>();
    const decryptionTasks: Promise<void>[] = [];
    
    // First pass: identify encrypted fields and queue decryption
    for (const [field, value] of Object.entries(obj)) {
      if (field.endsWith('_enc')) {
        const originalField = field.slice(0, -4);
        const ivField = `${originalField}_iv`;
        
        if (obj[ivField]) {
          processedFields.add(field);
          processedFields.add(ivField);
          
          // Queue decryption task (parallel)
          decryptionTasks.push(
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
          decryptionTasks.push(
            decryptObject(value, key).then(decrypted => {
              result[field] = decrypted;
            })
          );
        } else {
          result[field] = value;
        }
      }
    }
    
    // Execute all decryption tasks in parallel
    await Promise.all(decryptionTasks);
    return result;
  }
  
  return obj;
}

export function useEncryptedApi() {
  const { key, encryptionSalt } = useCrypto();
  
  const isEncryptionEnabled = key !== null && encryptionSalt !== null;
  
  /**
   * Encrypt data before sending to API
   */
  const encrypt = async <T extends object>(data: T): Promise<T> => {
    if (!isEncryptionEnabled || !key) return data;
    return encryptObject(data, key) as Promise<T>;
  };
  
  /**
   * Decrypt data received from API
   */
  const decrypt = async <T extends object>(data: T): Promise<T> => {
    if (!isEncryptionEnabled || !key) return data;
    return decryptObject(data, key) as Promise<T>;
  };
  
  /**
   * Get encryption key for direct use (e.g., with existing API functions)
   */
  const getCryptoKey = (): CryptoKey | null => key;
  
  return {
    isEncryptionEnabled,
    encrypt,
    decrypt,
    getCryptoKey,
    encryptionSalt
  };
}

export default useEncryptedApi;



