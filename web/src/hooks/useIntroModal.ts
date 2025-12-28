// Hook to manage first-time intro modals
import { useState, useEffect } from "react";

const INTRO_PREFIX = "moneymate_intro_";

export function useIntroModal(pageKey: string) {
    const [showIntro, setShowIntro] = useState(false);

    useEffect(() => {
        const hasSeenIntro = localStorage.getItem(`${INTRO_PREFIX}${pageKey}`);
        if (!hasSeenIntro) {
            // Show intro after a short delay for better UX
            setTimeout(() => setShowIntro(true), 500);
        }
    }, [pageKey]);

    const closeIntro = () => {
        localStorage.setItem(`${INTRO_PREFIX}${pageKey}`, "true");
        setShowIntro(false);
    };

    const resetIntro = () => {
        localStorage.removeItem(`${INTRO_PREFIX}${pageKey}`);
        setShowIntro(true);
    };

    return { showIntro, closeIntro, resetIntro };
}

// Helper to reset all intros (useful for testing or settings)
export function resetAllIntros() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith(INTRO_PREFIX)) {
            localStorage.removeItem(key);
        }
    });
}
