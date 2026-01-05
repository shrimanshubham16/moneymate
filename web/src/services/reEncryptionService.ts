/**
 * Re-Encryption Service
 * 
 * Handles re-encrypting all user data when password changes.
 * Critical for E2E encryption - changing password creates a new key,
 * so all data must be decrypted with old key and re-encrypted with new key.
 */

import { deriveKey, saltFromBase64, encryptString, decryptString } from '../lib/crypto';

// Sensitive fields that need re-encryption (same as useEncryptedApi)
const SENSITIVE_FIELDS = [
  'name', 'amount', 'planned', 'description', 'justification',
  'source', 'goal', 'limit', 'bill_amount', 'paid_amount',
  'monthly_amount', 'total_amount', 'saved_amount', 'accumulated_funds'
];

function isSensitiveField(field: string): boolean {
  return SENSITIVE_FIELDS.some(sf => 
    field === sf || field.endsWith(`_${sf}`) || field.startsWith(`${sf}_`)
  );
}

export interface ReEncryptionProgress {
  phase: 'deriving_keys' | 'fetching_data' | 'decrypting' | 're_encrypting' | 'uploading' | 'complete' | 'error';
  current: number;
  total: number;
  entityType?: string;
  error?: string;
}

export type ProgressCallback = (progress: ReEncryptionProgress) => void;

/**
 * Decrypt a single object with given key
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
      if (field.endsWith('_enc')) {
        const originalField = field.slice(0, -4);
        const ivField = `${originalField}_iv`;
        
        if (obj[ivField]) {
          try {
            const decrypted = await decryptString(value as string, obj[ivField] as string, key);
            const numValue = parseFloat(decrypted);
            result[originalField] = isNaN(numValue) ? decrypted : numValue;
            processedFields.add(field);
            processedFields.add(ivField);
          } catch (e) {
            // Fall back to plaintext if decryption fails
            if (obj[originalField] !== undefined) {
              result[originalField] = obj[originalField];
            }
          }
        }
      } else if (!processedFields.has(field) && !field.endsWith('_iv')) {
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

/**
 * Encrypt a single object with given key
 */
async function encryptObject(obj: any, key: CryptoKey): Promise<any> {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => encryptObject(item, key)));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [field, value] of Object.entries(obj)) {
      // Skip existing encrypted fields
      if (field.endsWith('_enc') || field.endsWith('_iv')) continue;
      
      if (isSensitiveField(field) && value !== null && value !== undefined) {
        const { ciphertext, iv } = await encryptString(String(value), key);
        result[`${field}_enc`] = ciphertext;
        result[`${field}_iv`] = iv;
        result[field] = value; // Keep plaintext during transition
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
 * Fetch all user data from API
 */
async function fetchAllUserData(token: string, baseUrl: string, apikey: string): Promise<{
  incomes: any[];
  fixedExpenses: any[];
  variablePlans: any[];
  investments: any[];
  creditCards: any[];
}> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  if (apikey) headers['apikey'] = apikey;
  
  const fetchEndpoint = async (path: string) => {
    const res = await fetch(`${baseUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`Failed to fetch ${path}`);
    const data = await res.json();
    return data.data || [];
  };
  
  const [incomes, fixedExpenses, variablePlans, investments, creditCards] = await Promise.all([
    fetchEndpoint('/planning/income'),
    fetchEndpoint('/planning/fixed-expenses'),
    fetchEndpoint('/planning/variable-expenses'),
    fetchEndpoint('/planning/investments'),
    fetchEndpoint('/debts/credit-cards'),
  ]);
  
  return { incomes, fixedExpenses, variablePlans, investments, creditCards };
}

/**
 * Update a single entity via API
 */
async function updateEntity(
  token: string,
  baseUrl: string,
  apikey: string,
  entityType: string,
  id: string,
  data: any
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  if (apikey) headers['apikey'] = apikey;
  
  const pathMap: Record<string, string> = {
    income: '/planning/income',
    fixedExpense: '/planning/fixed-expenses',
    variablePlan: '/planning/variable-expenses',
    investment: '/planning/investments',
    creditCard: '/debts/credit-cards',
  };
  
  const path = `${pathMap[entityType]}/${id}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to update ${entityType} ${id}`);
  }
}

/**
 * Re-encrypt all user data when password changes
 * 
 * @param oldPassword - Current password
 * @param newPassword - New password
 * @param encryptionSalt - User's encryption salt (base64)
 * @param token - JWT token
 * @param onProgress - Progress callback
 */
export async function reEncryptAllData(
  oldPassword: string,
  newPassword: string,
  encryptionSalt: string,
  token: string,
  onProgress: ProgressCallback
): Promise<void> {
  const baseUrl = getBaseUrl();
  const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  try {
    // Phase 1: Derive keys
    onProgress({ phase: 'deriving_keys', current: 0, total: 2 });
    const salt = saltFromBase64(encryptionSalt);
    const oldKey = await deriveKey(oldPassword, salt);
    onProgress({ phase: 'deriving_keys', current: 1, total: 2 });
    const newKey = await deriveKey(newPassword, salt);
    onProgress({ phase: 'deriving_keys', current: 2, total: 2 });
    
    // Phase 2: Fetch all data
    onProgress({ phase: 'fetching_data', current: 0, total: 5 });
    const allData = await fetchAllUserData(token, baseUrl, apikey);
    onProgress({ phase: 'fetching_data', current: 5, total: 5 });
    
    // Calculate total entities
    const totalEntities = 
      allData.incomes.length +
      allData.fixedExpenses.length +
      allData.variablePlans.length +
      allData.investments.length +
      allData.creditCards.length;
    
    let processedCount = 0;
    
    // Phase 3: Decrypt all data with old key
    onProgress({ phase: 'decrypting', current: 0, total: totalEntities });
    
    const decrypted = {
      incomes: await Promise.all(allData.incomes.map(async (item) => {
        const dec = await decryptObject(item, oldKey);
        processedCount++;
        onProgress({ phase: 'decrypting', current: processedCount, total: totalEntities, entityType: 'income' });
        return dec;
      })),
      fixedExpenses: await Promise.all(allData.fixedExpenses.map(async (item) => {
        const dec = await decryptObject(item, oldKey);
        processedCount++;
        onProgress({ phase: 'decrypting', current: processedCount, total: totalEntities, entityType: 'fixedExpense' });
        return dec;
      })),
      variablePlans: await Promise.all(allData.variablePlans.map(async (item) => {
        const dec = await decryptObject(item, oldKey);
        processedCount++;
        onProgress({ phase: 'decrypting', current: processedCount, total: totalEntities, entityType: 'variablePlan' });
        return dec;
      })),
      investments: await Promise.all(allData.investments.map(async (item) => {
        const dec = await decryptObject(item, oldKey);
        processedCount++;
        onProgress({ phase: 'decrypting', current: processedCount, total: totalEntities, entityType: 'investment' });
        return dec;
      })),
      creditCards: await Promise.all(allData.creditCards.map(async (item) => {
        const dec = await decryptObject(item, oldKey);
        processedCount++;
        onProgress({ phase: 'decrypting', current: processedCount, total: totalEntities, entityType: 'creditCard' });
        return dec;
      })),
    };
    
    // Phase 4: Re-encrypt all data with new key
    processedCount = 0;
    onProgress({ phase: 're_encrypting', current: 0, total: totalEntities });
    
    const reEncrypted = {
      incomes: await Promise.all(decrypted.incomes.map(async (item) => {
        const enc = await encryptObject(item, newKey);
        processedCount++;
        onProgress({ phase: 're_encrypting', current: processedCount, total: totalEntities, entityType: 'income' });
        return enc;
      })),
      fixedExpenses: await Promise.all(decrypted.fixedExpenses.map(async (item) => {
        const enc = await encryptObject(item, newKey);
        processedCount++;
        onProgress({ phase: 're_encrypting', current: processedCount, total: totalEntities, entityType: 'fixedExpense' });
        return enc;
      })),
      variablePlans: await Promise.all(decrypted.variablePlans.map(async (item) => {
        const enc = await encryptObject(item, newKey);
        processedCount++;
        onProgress({ phase: 're_encrypting', current: processedCount, total: totalEntities, entityType: 'variablePlan' });
        return enc;
      })),
      investments: await Promise.all(decrypted.investments.map(async (item) => {
        const enc = await encryptObject(item, newKey);
        processedCount++;
        onProgress({ phase: 're_encrypting', current: processedCount, total: totalEntities, entityType: 'investment' });
        return enc;
      })),
      creditCards: await Promise.all(decrypted.creditCards.map(async (item) => {
        const enc = await encryptObject(item, newKey);
        processedCount++;
        onProgress({ phase: 're_encrypting', current: processedCount, total: totalEntities, entityType: 'creditCard' });
        return enc;
      })),
    };
    
    // Phase 5: Upload all re-encrypted data
    processedCount = 0;
    onProgress({ phase: 'uploading', current: 0, total: totalEntities });
    
    // Upload in batches to avoid overwhelming the server
    const uploadBatch = async (entities: any[], type: string) => {
      for (const entity of entities) {
        await updateEntity(token, baseUrl, apikey, type, entity.id, entity);
        processedCount++;
        onProgress({ phase: 'uploading', current: processedCount, total: totalEntities, entityType: type });
      }
    };
    
    await uploadBatch(reEncrypted.incomes, 'income');
    await uploadBatch(reEncrypted.fixedExpenses, 'fixedExpense');
    await uploadBatch(reEncrypted.variablePlans, 'variablePlan');
    await uploadBatch(reEncrypted.investments, 'investment');
    await uploadBatch(reEncrypted.creditCards, 'creditCard');
    
    // Complete
    onProgress({ phase: 'complete', current: totalEntities, total: totalEntities });
    
  } catch (error: any) {
    onProgress({ 
      phase: 'error', 
      current: 0, 
      total: 0, 
      error: error.message || 'Re-encryption failed' 
    });
    throw error;
  }
}

function getBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    if (!envUrl.startsWith("http://") && !envUrl.startsWith("https://")) {
      return `https://${envUrl}`;
    }
    return envUrl;
  }
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1/api`;
  }
  
  return "http://localhost:12022";
}

