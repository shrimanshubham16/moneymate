import { useState, useCallback } from "react";

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: "alert" | "confirm";
  onConfirm?: () => void;
}

const initial: ModalState = { isOpen: false, title: "", message: "", type: "alert" };

/**
 * Hook that replaces native alert() and confirm() with app modal state.
 *
 * Usage:
 *   const { modal, showAlert, showConfirm, closeModal, ModalRenderer } = useAppModal();
 *   showAlert("Something went wrong");
 *   showConfirm("Delete this item?", () => { deleteItem(); });
 *   // Render <ModalRenderer /> once in your component JSX
 */
export function useAppModal() {
  const [modal, setModal] = useState<ModalState>(initial);

  const showAlert = useCallback((message: string, title = "Notice") => {
    setModal({ isOpen: true, title, message, type: "alert" });
  }, []);

  const showConfirm = useCallback((message: string, onConfirm: () => void, title = "Confirm") => {
    setModal({ isOpen: true, title, message, type: "confirm", onConfirm });
  }, []);

  const closeModal = useCallback(() => {
    setModal(initial);
  }, []);

  const confirmAndClose = useCallback(() => {
    modal.onConfirm?.();
    setModal(initial);
  }, [modal.onConfirm]);

  return { modal, showAlert, showConfirm, closeModal, confirmAndClose };
}
