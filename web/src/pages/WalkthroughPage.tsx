import { WalkthroughModal } from "../components/WalkthroughModal";
import { useState } from "react";

export function WalkthroughPage() {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ padding: 24 }}>
      <WalkthroughModal isOpen={open} onClose={() => setOpen(false)} />
      {!open && (
        <button onClick={() => setOpen(true)} style={{ marginTop: 16 }}>
          Restart walkthrough
        </button>
      )}
    </div>
  );
}
