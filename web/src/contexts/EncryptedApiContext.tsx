/**
 * Encrypted API Context
 * 
 * Provides encrypted versions of all API functions.
 * Components can use this context to automatically encrypt/decrypt data.
 * 
 * Usage:
 *   const { createIncome, fetchDashboard } = useEncryptedApiContext();
 *   const dashboard = await fetchDashboard(token);  // Automatically decrypted
 *   await createIncome(token, { source: "Salary", amount: 50000 });  // Automatically encrypted
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useCrypto } from './CryptoContext';
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

// Parallel encryption
async function encryptObject(obj: any, key: CryptoKey): Promise<any> {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => encryptObject(item, key)));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    const tasks: Promise<void>[] = [];
    
    for (const [field, value] of Object.entries(obj)) {
      if (field.endsWith('_enc') || field.endsWith('_iv')) continue;
      
      if (isSensitiveField(field) && value !== null && value !== undefined) {
        tasks.push(
          encryptString(String(value), key).then(({ ciphertext, iv }) => {
            result[`${field}_enc`] = ciphertext;
            result[`${field}_iv`] = iv;
            result[field] = value;
          })
        );
      } else if (typeof value === 'object') {
        tasks.push(encryptObject(value, key).then(enc => { result[field] = enc; }));
      } else {
        result[field] = value;
      }
    }
    
    await Promise.all(tasks);
    return result;
  }
  
  return obj;
}

// Parallel decryption
async function decryptObject(obj: any, key: CryptoKey): Promise<any> {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => decryptObject(item, key)));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    const processed = new Set<string>();
    const tasks: Promise<void>[] = [];
    
    for (const [field, value] of Object.entries(obj)) {
      if (field.endsWith('_enc')) {
        const orig = field.slice(0, -4);
        const ivField = `${orig}_iv`;
        
        if (obj[ivField]) {
          processed.add(field);
          processed.add(ivField);
          
          tasks.push(
            decryptString(value as string, obj[ivField] as string, key)
              .then(dec => {
                const num = parseFloat(dec);
                result[orig] = isNaN(num) ? dec : num;
              })
              .catch(() => {
                if (obj[orig] !== undefined) result[orig] = obj[orig];
              })
          );
        }
      }
    }
    
    for (const [field, value] of Object.entries(obj)) {
      if (!processed.has(field) && !field.endsWith('_iv') && !field.endsWith('_enc')) {
        if (typeof value === 'object') {
          tasks.push(decryptObject(value, key).then(dec => { result[field] = dec; }));
        } else {
          result[field] = value;
        }
      }
    }
    
    await Promise.all(tasks);
    return result;
  }
  
  return obj;
}

// API Configuration
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1/api`;
  }
  return 'http://localhost:12022';
};

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface EncryptedApiContextValue {
  isEncryptionEnabled: boolean;
  // Core request function
  request: <T>(path: string, options?: RequestInit, body?: any, token?: string) => Promise<T>;
  // Encrypt/decrypt utilities
  encrypt: <T extends object>(data: T) => Promise<T>;
  decrypt: <T extends object>(data: T) => Promise<T>;
}

const EncryptedApiContext = createContext<EncryptedApiContextValue | null>(null);

export function EncryptedApiProvider({ children }: { children: React.ReactNode }) {
  const { key } = useCrypto();
  const baseUrl = useMemo(() => getBaseUrl(), []);
  const isSupabase = baseUrl.includes('supabase.co/functions');
  
  const isEncryptionEnabled = key !== null;
  
  const encrypt = async <T extends object>(data: T): Promise<T> => {
    if (!key) return data;
    return encryptObject(data, key) as Promise<T>;
  };
  
  const decrypt = async <T extends object>(data: T): Promise<T> => {
    if (!key) return data;
    return decryptObject(data, key) as Promise<T>;
  };
  
  const request = async <T>(
    path: string,
    options: RequestInit = {},
    body?: any,
    token?: string
  ): Promise<T> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
    
    if (isSupabase && SUPABASE_ANON_KEY) {
      headers['apikey'] = SUPABASE_ANON_KEY;
    }
    
    let processedBody: string | undefined;
    if (body) {
      const encrypted = key ? await encrypt(body) : body;
      processedBody = JSON.stringify(encrypted);
    }
    
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      body: processedBody,
    });
    
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody?.error?.message || `Request failed: ${res.status}`);
    }
    
    const data = await res.json();
    
    // Decrypt response data if encryption is enabled
    if (key && data.data) {
      data.data = await decrypt(data.data);
    }
    
    return data as T;
  };
  
  const value = useMemo(() => ({
    isEncryptionEnabled,
    request,
    encrypt,
    decrypt,
  }), [isEncryptionEnabled, key]);
  
  return (
    <EncryptedApiContext.Provider value={value}>
      {children}
    </EncryptedApiContext.Provider>
  );
}

export function useEncryptedApiContext() {
  const context = useContext(EncryptedApiContext);
  if (!context) {
    throw new Error('useEncryptedApiContext must be used within EncryptedApiProvider');
  }
  return context;
}

/**
 * Hook for making encrypted API calls with convenience methods
 */
export function useEncryptedApi() {
  const { request, encrypt, decrypt, isEncryptionEnabled } = useEncryptedApiContext();
  
  return {
    isEncryptionEnabled,
    encrypt,
    decrypt,
    
    // Convenience methods
    get: <T>(path: string, token?: string) => 
      request<T>(path, { method: 'GET' }, undefined, token),
    
    post: <T>(path: string, body: any, token?: string) => 
      request<T>(path, { method: 'POST' }, body, token),
    
    put: <T>(path: string, body: any, token?: string) => 
      request<T>(path, { method: 'PUT' }, body, token),
    
    patch: <T>(path: string, body: any, token?: string) => 
      request<T>(path, { method: 'PATCH' }, body, token),
    
    delete: <T>(path: string, token?: string) => 
      request<T>(path, { method: 'DELETE' }, undefined, token),
  };
}

