import { Modal } from "./Modal";

interface Props {
  modal: { isOpen: boolean; title: string; message: string; type: "alert" | "confirm" };
  closeModal: () => void;
  confirmAndClose: () => void;
}

/**
 * Drop-in replacement renderer for useAppModal hook.
 * Place once at the bottom of your page component's JSX.
 */
export function AppModalRenderer({ modal, closeModal, confirmAndClose }: Props) {
  if (!modal.isOpen) return null;
  return (
    <Modal
      isOpen={modal.isOpen}
      onClose={closeModal}
      title={modal.title}
      size="sm"
      footer={
        modal.type === "confirm" ? (
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="ghost-btn" onClick={closeModal} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "var(--text-primary)", cursor: "pointer" }}>Cancel</button>
            <button className="primary-btn" onClick={confirmAndClose} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent-cyan, #22d3ee)", color: "#041019", fontWeight: 700, cursor: "pointer" }}>Confirm</button>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={closeModal} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent-cyan, #22d3ee)", color: "#041019", fontWeight: 700, cursor: "pointer" }}>OK</button>
          </div>
        )
      }
    >
      <p style={{ margin: 0, lineHeight: 1.5 }}>{modal.message}</p>
    </Modal>
  );
}
