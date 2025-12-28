import React, { createContext, useContext, useState, ReactNode } from 'react';

interface EncryptionContextType {
    encryptionKey: CryptoKey | null;
    setEncryptionKey: (key: CryptoKey | null) => void;
    clearEncryptionKey: () => void;
    isEncrypted: boolean;
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(undefined);

interface EncryptionProviderProps {
    children: ReactNode;
}

/**
 * EncryptionProvider - Manages encryption key in memory
 * 
 * SECURITY NOTES:
 * - Key stored in memory only (NOT localStorage/sessionStorage)
 * - Key cleared on logout or browser close
 * - Key never transmitted to server
 */
export function EncryptionProvider({ children }: EncryptionProviderProps) {
    const [encryptionKey, setEncryptionKeyState] = useState<CryptoKey | null>(null);

    const setEncryptionKey = (key: CryptoKey | null) => {
        setEncryptionKeyState(key);
    };

    const clearEncryptionKey = () => {
        setEncryptionKeyState(null);
    };

    const isEncrypted = encryptionKey !== null;

    return (
        <EncryptionContext.Provider
            value={{
                encryptionKey,
                setEncryptionKey,
                clearEncryptionKey,
                isEncrypted
            }}
        >
            {children}
        </EncryptionContext.Provider>
    );
}

/**
 * useEncryption Hook
 * 
 * Access encryption context from any component
 * @throws Error if used outside EncryptionProvider
 */
export function useEncryption(): EncryptionContextType {
    const context = useContext(EncryptionContext);

    if (context === undefined) {
        throw new Error('useEncryption must be used within an EncryptionProvider');
    }

    return context;
}
