import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

// Session key storage - stores exported key material in sessionStorage
// This survives page refresh but clears when browser closes
const SESSION_KEY_STORAGE = 'finflow_session_key';
const SESSION_SALT_STORAGE = 'finflow_session_salt';

type CryptoContextValue = {
  key: CryptoKey | null;
  encryptionSalt: string | null;
  isRestoring: boolean;
  setKey: (key: CryptoKey, salt: string) => void;
  clearKey: () => void;
};

const CryptoContext = createContext<CryptoContextValue>({
  key: null,
  encryptionSalt: null,
  isRestoring: false,
  setKey: () => {},
  clearKey: () => {},
});

// Helper to export CryptoKey to storable format
async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Helper to import CryptoKey from stored format
async function importKey(keyData: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export const CryptoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [key, setKeyState] = useState<CryptoKey | null>(null);
  const [encryptionSalt, setSalt] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // On mount, try to restore key from sessionStorage
  useEffect(() => {
    const restoreKey = async () => {
      try {
        const storedKey = sessionStorage.getItem(SESSION_KEY_STORAGE);
        const storedSalt = sessionStorage.getItem(SESSION_SALT_STORAGE);
        
        if (storedKey && storedSalt) {
          const restored = await importKey(storedKey);
          setKeyState(restored);
          setSalt(storedSalt);
        }
      } catch (e) {
        console.error('[CRYPTO] Failed to restore key:', e);
        sessionStorage.removeItem(SESSION_KEY_STORAGE);
        sessionStorage.removeItem(SESSION_SALT_STORAGE);
      } finally {
        setIsRestoring(false);
      }
    };
    
    restoreKey();
  }, []);

  const setKey = useCallback(async (next: CryptoKey, salt: string) => {
    setKeyState(next);
    setSalt(salt);
    
    // Store in sessionStorage for page refresh survival
    try {
      const exported = await exportKey(next);
      sessionStorage.setItem(SESSION_KEY_STORAGE, exported);
      sessionStorage.setItem(SESSION_SALT_STORAGE, salt);
    } catch (e) {
      console.error('[CRYPTO] Failed to store key:', e);
    }
  }, []);

  const clearKey = useCallback(() => {
    setKeyState(null);
    setSalt(null);
    sessionStorage.removeItem(SESSION_KEY_STORAGE);
    sessionStorage.removeItem(SESSION_SALT_STORAGE);
    console.log('[CRYPTO] Key cleared');
  }, []);

  return (
    <CryptoContext.Provider value={{ key, encryptionSalt, isRestoring, setKey, clearKey }}>
      {children}
    </CryptoContext.Provider>
  );
};

export function useCrypto() {
  return useContext(CryptoContext);
}



