/**
 * useEncryptedApi - Hook for E2E encrypted API operations
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
const SENSITIVE_FIELDS = [
  'name', 'amount', 'planned', 'description', 'justification',
  'source', 'goal', 'limit', 'bill_amount', 'paid_amount',
  'monthly_amount', 'total_amount', 'saved_amount'
];

/**
 * Check if a field should be encrypted
 */
function isSensitiveField(field: string): boolean {
  return SENSITIVE_FIELDS.some(sf => 
    field === sf || field.endsWith(`_${sf}`) || field.startsWith(`${sf}_`)
  );
}

/**
 * Recursively encrypt sensitive fields in an object
 */
async function encryptObject(obj: any, key: CryptoKey): Promise<any> {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => encryptObject(item, key)));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [field, value] of Object.entries(obj)) {
      if (isSensitiveField(field) && value !== null && value !== undefined) {
        // Encrypt sensitive field
        const { ciphertext, iv } = await encryptString(String(value), key);
        result[`${field}_enc`] = ciphertext;
        result[`${field}_iv`] = iv;
        // Keep original for backward compatibility during transition
        result[field] = value;
      } else if (typeof value === 'object') {
        result[field] = await encryptObject(value, key);
      } else {
        result[field] = value;
      }
    }
    return result;
  }
  
  return obj;
}

/**
 * Recursively decrypt sensitive fields in an object
 */
async function decryptObject(obj: any, key: CryptoKey): Promise<any> {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => decryptObject(item, key)));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    const processedFields = new Set<string>();
    
    for (const [field, value] of Object.entries(obj)) {
      // Check if this is an encrypted field
      if (field.endsWith('_enc')) {
        const originalField = field.slice(0, -4); // Remove '_enc'
        const ivField = `${originalField}_iv`;
        
        if (obj[ivField]) {
          try {
            // Decrypt the field
            const decrypted = await decryptString(value as string, obj[ivField] as string, key);
            
            // Determine if original was a number
            const numValue = parseFloat(decrypted);
            result[originalField] = isNaN(numValue) ? decrypted : numValue;
            
            processedFields.add(field);
            processedFields.add(ivField);
          } catch (e) {
            console.warn(`Failed to decrypt field ${originalField}:`, e);
            // Fall back to original value if decryption fails
            if (obj[originalField] !== undefined) {
              result[originalField] = obj[originalField];
            }
          }
        }
      } else if (!processedFields.has(field) && !field.endsWith('_iv')) {
        // Regular field or fallback
        if (typeof value === 'object') {
          result[field] = await decryptObject(value, key);
        } else {
          result[field] = value;
        }
      }
    }
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

