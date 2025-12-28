/**
 * MoneyMate - End-to-End Encryption Utilities
 * 
 * Uses Web Crypto API for production-grade encryption:
 * - AES-256-GCM for authenticated encryption
 * - PBKDF2 for password-based key derivation (100,000 iterations)
 * - Cryptographically secure random number generation
 */

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 256;
const ALGORITHM = 'AES-GCM';

/**
 * Generate a cryptographically secure random salt
 * Used for key derivation to ensure unique keys even with same password
 */
export function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Convert Uint8Array to hex string for storage
 */
export function uint8ArrayToHex(arr: Uint8Array): string {
    return Array.from(arr)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Convert hex string back to Uint8Array
 */
export function hexToUint8Array(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

/**
 * Derive an encryption key from user's password using PBKDF2
 * 
 * @param password - User's password
 * @param salt - Unique salt (stored server-side, NOT secret)
 * @returns CryptoKey for encryption/decryption
 */
export async function deriveKey(
    password: string,
    salt: Uint8Array
): Promise<CryptoKey> {
    // Convert password to key material
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    // Derive actual encryption key
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        {
            name: ALGORITHM,
            length: KEY_LENGTH
        },
        false, // Not extractable (security)
        ['encrypt', 'decrypt']
    );

    return key;
}

/**
 * Encrypt data using AES-256-GCM
 * 
 * @param data - Any JSON-serializable data
 * @param key - CryptoKey from deriveKey()
 * @returns Object with encrypted data and IV
 */
export async function encryptData(
    data: any,
    key: CryptoKey
): Promise<{ encrypted: string; iv: string }> {
    // Serialize data to JSON string
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);

    // Generate random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encryptedBuffer = await crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            iv: iv
        },
        key,
        dataBuffer
    );

    // Convert to base64 for storage
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));

    return {
        encrypted: encryptedBase64,
        iv: uint8ArrayToHex(iv)
    };
}

/**
 * Decrypt data using AES-256-GCM
 * 
 * @param encrypted - Base64 encrypted string
 * @param iv - Hex-encoded initialization vector
 * @param key - CryptoKey from deriveKey()
 * @returns Decrypted data (original object)
 * @throws Error if decryption fails (wrong password, corrupted data)
 */
export async function decryptData(
    encrypted: string,
    iv: string,
    key: CryptoKey
): Promise<any> {
    try {
        // Convert from base64 to ArrayBuffer
        const encryptedString = atob(encrypted);
        const encryptedArray = new Uint8Array(encryptedString.length);
        for (let i = 0; i < encryptedString.length; i++) {
            encryptedArray[i] = encryptedString.charCodeAt(i);
        }

        // Convert IV from hex
        const ivArray = hexToUint8Array(iv);

        // Decrypt
        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: ALGORITHM,
                iv: ivArray
            },
            key,
            encryptedArray
        );

        // Convert back to JSON
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(decryptedBuffer);

        return JSON.parse(jsonString);
    } catch (error) {
        throw new Error('Decryption failed. Incorrect password or corrupted data.');
    }
}

/**
 * Validate password strength
 * Returns true if password meets security requirements
 */
export function validatePasswordStrength(password: string): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (password.length < 12) {
        errors.push('Password must be at least 12 characters long');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain lowercase letters');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain uppercase letters');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain numbers');
    }

    if (!/[^a-zA-Z0-9]/.test(password)) {
        errors.push('Password must contain special characters');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Test encryption/decryption round-trip
 * Useful for debugging and verification
 */
export async function testEncryption(): Promise<boolean> {
    try {
        const password = 'TestPassword123!';
        const salt = generateSalt();
        const key = await deriveKey(password, salt);

        const testData = {
            income: 50000,
            expenses: 30000,
            name: 'Test User'
        };

        const { encrypted, iv } = await encryptData(testData, key);
        const decrypted = await decryptData(encrypted, iv, key);

        return JSON.stringify(testData) === JSON.stringify(decrypted);
    } catch (error) {
        console.error('Encryption test failed:', error);
        return false;
    }
}
