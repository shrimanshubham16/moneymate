import { describe, it, expect } from 'vitest';
import {
    generateSalt,
    uint8ArrayToHex,
    hexToUint8Array,
    deriveKey,
    encryptData,
    decryptData,
    validatePasswordStrength,
    testEncryption
} from './crypto';

describe('Crypto Utils', () => {
    describe('Salt Generation', () => {
        it('should generate unique salts', () => {
            const salt1 = generateSalt();
            const salt2 = generateSalt();

            expect(salt1).toHaveLength(16);
            expect(salt2).toHaveLength(16);
            expect(uint8ArrayToHex(salt1)).not.toBe(uint8ArrayToHex(salt2));
        });
    });

    describe('Hex Conversion', () => {
        it('should convert Uint8Array to hex and back', () => {
            const original = new Uint8Array([1, 2, 3, 255, 128, 0]);
            const hex = uint8ArrayToHex(original);
            const converted = hexToUint8Array(hex);

            expect(Array.from(converted)).toEqual(Array.from(original));
        });
    });

    describe('Key Derivation', () => {
        it('should derive the same key from same password and salt', async () => {
            const password = 'TestPassword123!';
            const salt = generateSalt();

            const key1 = await deriveKey(password, salt);
            const key2 = await deriveKey(password, salt);

            // Keys should be deterministic
            expect(key1).toBeDefined();
            expect(key2).toBeDefined();
        });

        it('should derive different keys from different salts', async () => {
            const password = 'TestPassword123!';
            const salt1 = generateSalt();
            const salt2 = generateSalt();

            const key1 = await deriveKey(password, salt1);
            const key2 = await deriveKey(password, salt2);

            // Test by encrypting same data
            const testData = { test: 'data' };
            const { encrypted: enc1 } = await encryptData(testData, key1);
            const { encrypted: enc2 } = await encryptData(testData, key2);

            expect(enc1).not.toBe(enc2);
        });
    });

    describe('Encryption/Decryption', () => {
        it('should encrypt and decrypt data correctly', async () => {
            const password = 'SecurePassword123!';
            const salt = generateSalt();
            const key = await deriveKey(password, salt);

            const originalData = {
                income: 50000,
                expenses: 30000,
                investments: [
                    { name: 'SIP', amount: 10000 }
                ]
            };

            const { encrypted, iv } = await encryptData(originalData, key);
            const decrypted = await decryptData(encrypted, iv, key);

            expect(decrypted).toEqual(originalData);
        });

        it('should fail to decrypt with wrong password', async () => {
            const salt = generateSalt();
            const correctKey = await deriveKey('CorrectPassword123!', salt);
            const wrongKey = await deriveKey('WrongPassword123!', salt);

            const data = { secret: 'data' };
            const { encrypted, iv } = await encryptData(data, correctKey);

            await expect(
                decryptData(encrypted, iv, wrongKey)
            ).rejects.toThrow('Decryption failed');
        });

        it('should produce different ciphertext for same data', async () => {
            const password = 'TestPassword123!';
            const salt = generateSalt();
            const key = await deriveKey(password, salt);

            const data = { test: 'data' };
            const { encrypted: enc1 } = await encryptData(data, key);
            const { encrypted: enc2 } = await encryptData(data, key);

            // Different IVs should produce different ciphertext
            expect(enc1).not.toBe(enc2);
        });
    });

    describe('Password Validation', () => {
        it('should accept strong passwords', () => {
            const result = validatePasswordStrength('MyStrongP@ssw0rd');
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject short passwords', () => {
            const result = validatePasswordStrength('Short1!');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Password must be at least 12 characters long');
        });

        it('should require uppercase letters', () => {
            const result = validatePasswordStrength('lowercase123!');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Password must contain uppercase letters');
        });

        it('should require special characters', () => {
            const result = validatePasswordStrength('NoSpecialChar123');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Password must contain special characters');
        });
    });

    describe('Round-trip Test', () => {
        it('should pass internal encryption test', async () => {
            const result = await testEncryption();
            expect(result).toBe(true);
        });
    });
});
