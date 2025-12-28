import { describe, it, expect } from 'vitest';
import {
    encryptField,
    decryptField,
    encryptEntity,
    decryptEntity,
    encryptEntities,
    decryptEntities,
    SENSITIVE_FIELDS
} from './fieldEncryption';
import { generateSalt, deriveKey } from './crypto';

describe('Field Encryption', () => {
    let key: CryptoKey;

    beforeEach(async () => {
        const password = 'TestPassword123!';
        const salt = generateSalt();
        key = await deriveKey(password, salt);
    });

    describe('Single Field Encryption', () => {
        it('should encrypt and decrypt a string field', async () => {
            const original = 'My Salary';
            const { encrypted, iv } = await encryptField(original, key);
            const decrypted = await decryptField(encrypted, iv, key);

            expect(decrypted).toBe(original);
        });

        it('should encrypt and decrypt a number field', async () => {
            const original = 50000;
            const { encrypted, iv } = await encryptField(original, key);
            const decrypted = await decryptField(encrypted, iv, key, 'number');

            expect(decrypted).toBe(original);
        });
    });

    describe('Entity Encryption', () => {
        it('should encrypt specified fields in entity', async () => {
            const income = {
                id: 'inc_1',
                userId: 'user_1',
                name: 'Google Salary',
                amount: 150000,
                category: 'employment',
                frequency: 'monthly'
            };

            const encrypted = await encryptEntity(income, ['name', 'amount'], key);

            // Should have encrypted fields
            expect(encrypted.name_encrypted).toBeDefined();
            expect(encrypted.name_iv).toBeDefined();
            expect(encrypted.amount_encrypted).toBeDefined();
            expect(encrypted.amount_iv).toBeDefined();

            // Should keep unencrypted fields
            expect(encrypted.id).toBe('inc_1');
            expect(encrypted.category).toBe('employment');
            expect(encrypted.frequency).toBe('monthly');
        });

        it('should decrypt encrypted entity correctly', async () => {
            const income = {
                id: 'inc_1',
                name: 'Freelance Work',
                amount: 50000,
                category: 'freelance'
            };

            const encrypted = await encryptEntity(income, ['name', 'amount'], key);
            const decrypted = await decryptEntity(encrypted, ['name', 'amount'], key);

            expect(decrypted.name).toBe('Freelance Work');
            expect(decrypted.amount).toBe(50000);
            expect(decrypted.category).toBe('freelance');

            // Encrypted fields should be removed
            expect(decrypted.name_encrypted).toBeUndefined();
            expect(decrypted.name_iv).toBeUndefined();
        });

        it('should handle missing fields gracefully', async () => {
            const income = {
                id: 'inc_1',
                name: 'Salary',
                category: 'employment'
                // No amount field
            };

            const encrypted = await encryptEntity(income, ['name', 'amount'], key);

            // Should encrypt name but not fail on missing amount
            expect(encrypted.name_encrypted).toBeDefined();
            expect(encrypted.amount_encrypted).toBeUndefined();
        });
    });

    describe('Multiple Entities', () => {
        it('should encrypt multiple entities', async () => {
            const incomes = [
                { id: '1', name: 'Job A', amount: 100000 },
                { id: '2', name: 'Job B', amount: 200000 }
            ];

            const encrypted = await encryptEntities(incomes, ['name', 'amount'], key);

            expect(encrypted).toHaveLength(2);
            expect(encrypted[0].name_encrypted).toBeDefined();
            expect(encrypted[1].name_encrypted).toBeDefined();
        });

        it('should decrypt multiple entities', async () => {
            const incomes = [
                { id: '1', name: 'Job A', amount: 100000 },
                { id: '2', name: 'Job B', amount: 200000 }
            ];

            const encrypted = await encryptEntities(incomes, ['name', 'amount'], key);
            const decrypted = await decryptEntities(encrypted, ['name', 'amount'], key);

            expect(decrypted[0].name).toBe('Job A');
            expect(decrypted[0].amount).toBe(100000);
            expect(decrypted[1].name).toBe('Job B');
            expect(decrypted[1].amount).toBe(200000);
        });
    });

    describe('Sensitive Fields Config', () => {
        it('should have field definitions for all entity types', () => {
            expect(SENSITIVE_FIELDS.income).toContain('name');
            expect(SENSITIVE_FIELDS.income).toContain('amount');
            expect(SENSITIVE_FIELDS.expense).toContain('name');
            expect(SENSITIVE_FIELDS.investment).toContain('name');
        });
    });

    describe('Backward Compatibility', () => {
        it('should read plaintext if encrypted field missing', async () => {
            const income = {
                id: 'inc_1',
                name: 'Plaintext Salary',  // No encrypted version
                amount: 50000,
                category: 'employment'
            };

            const decrypted = await decryptEntity(income, ['name', 'amount'], key);

            // Should keep plaintext when encrypted version unavailable
            expect(decrypted.name).toBe('Plaintext Salary');
            expect(decrypted.amount).toBe(50000);
        });
    });
});
