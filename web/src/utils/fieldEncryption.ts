/**
 * Field-Level Encryption Utilities
 * 
 * Encrypts only sensitive fields (amounts, names, descriptions)
 * while keeping structure (IDs, dates, types) readable for server operations.
 */

import { encryptData, decryptData } from './crypto';

/**
 * Encrypt a single field value
 * 
 * @param value - The value to encrypt (can be string, number, etc.)
 * @param key - CryptoKey for encryption
 * @returns Object with encrypted value and IV
 */
export async function encryptField(
    value: any,
    key: CryptoKey
): Promise<{ encrypted: string; iv: string }> {
    // Convert value to string if it's a number
    const stringValue = typeof value === 'number' ? value.toString() : value;

    return await encryptData(stringValue, key);
}

/**
 * Decrypt a single field value
 * 
 * @param encrypted - Base64 encrypted string
 * @param iv - Hex-encoded IV
 * @param key - CryptoKey for decryption
 * @param originalType - Optional type hint ('number', 'string')
 * @returns Decrypted value in original type
 */
export async function decryptField(
    encrypted: string,
    iv: string,
    key: CryptoKey,
    originalType?: 'number' | 'string'
): Promise<any> {
    const decrypted = await decryptData(encrypted, iv, key);

    // Convert back to number if it was originally a number
    if (originalType === 'number') {
        return parseFloat(decrypted);
    }

    return decrypted;
}

/**
 * Encrypt specific fields in an entity
 * 
 * @param entity - The entity object
 * @param fields - Array of field names to encrypt
 * @param key - CryptoKey for encryption
 * @returns Entity with encrypted fields (fieldName_encrypted, fieldName_iv)
 */
export async function encryptEntity<T extends Record<string, any>>(
    entity: T,
    fields: (keyof T)[],
    key: CryptoKey
): Promise<T> {
    const result = { ...entity };

    for (const field of fields) {
        const value = entity[field];

        if (value !== undefined && value !== null) {
            const { encrypted, iv } = await encryptField(value, key);

            // Add encrypted field
            (result as any)[`${String(field)}_encrypted`] = encrypted;
            (result as any)[`${String(field)}_iv`] = iv;

            // Remove plaintext (for new data)
            // Keep for backward compatibility during migration
            // delete result[field];
        }
    }

    return result;
}

/**
 * Decrypt specific fields in an entity
 * 
 * @param entity - The entity object with encrypted fields
 * @param fields - Array of field names that were encrypted
 * @param key - CryptoKey for decryption
 * @returns Entity with decrypted fields
 */
export async function decryptEntity<T extends Record<string, any>>(
    entity: T,
    fields: string[],
    key: CryptoKey
): Promise<T> {
    const result = { ...entity };

    for (const field of fields) {
        const encryptedField = `${field}_encrypted`;
        const ivField = `${field}_iv`;

        // Check if encrypted version exists
        if ((entity as any)[encryptedField] && (entity as any)[ivField]) {
            try {
                // Determine original type from field name
                const originalType = field.includes('amount') ? 'number' : 'string';

                const decrypted = await decryptField(
                    (entity as any)[encryptedField],
                    (entity as any)[ivField],
                    key,
                    originalType
                );

                (result as any)[field] = decrypted;

                // Clean up encrypted fields from result
                delete (result as any)[encryptedField];
                delete (result as any)[ivField];
            } catch (error) {
                console.error(`Failed to decrypt field ${field}:`, error);
                // Keep encrypted field if decryption fails
            }
        }
        // If no encrypted field, use plaintext (backward compatibility)
    }

    return result;
}

/**
 * Helper to encrypt multiple entities
 */
export async function encryptEntities<T extends Record<string, any>>(
    entities: T[],
    fields: (keyof T)[],
    key: CryptoKey
): Promise<T[]> {
    return Promise.all(entities.map(e => encryptEntity(e, fields, key)));
}

/**
 * Helper to decrypt multiple entities
 */
export async function decryptEntities<T extends Record<string, any>>(
    entities: T[],
    fields: string[],
    key: CryptoKey
): Promise<T[]> {
    return Promise.all(entities.map(e => decryptEntity(e, fields, key)));
}

/**
 * Get list of sensitive fields for each entity type
 */
export const SENSITIVE_FIELDS = {
    income: ['name', 'amount', 'description'],
    expense: ['name', 'amount', 'description'],
    investment: ['name', 'amount', 'description'],
    creditCard: ['name', 'limit', 'description'],
    loan: ['name', 'amount', 'description'],
    futureBomb: ['name', 'amount', 'description'],
    variablePlan: ['name', 'planned', 'description'],
    variableActual: ['name', 'amount', 'description']
} as const;
