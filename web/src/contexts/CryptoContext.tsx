import React, { createContext, useContext, useState, useCallback } from "react";

type CryptoContextValue = {
  key: CryptoKey | null;
  encryptionSalt: string | null;
  setKey: (key: CryptoKey, salt: string) => void;
  clearKey: () => void;
};

const CryptoContext = createContext<CryptoContextValue>({
  key: null,
  encryptionSalt: null,
  setKey: () => {},
  clearKey: () => {},
});

export const CryptoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [key, setKeyState] = useState<CryptoKey | null>(null);
  const [encryptionSalt, setSalt] = useState<string | null>(null);

  const setKey = useCallback((next: CryptoKey, salt: string) => {
    setKeyState(next);
    setSalt(salt);
  }, []);

  const clearKey = useCallback(() => {
    setKeyState(null);
    setSalt(null);
  }, []);

  return (
    <CryptoContext.Provider value={{ key, encryptionSalt, setKey, clearKey }}>
      {children}
    </CryptoContext.Provider>
  );
};

export function useCrypto() {
  return useContext(CryptoContext);
}

