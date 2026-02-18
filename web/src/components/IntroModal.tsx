import { PageInfoModal } from "./PageInfoModal";

interface IntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  tips?: string[];
}

/**
 * IntroModal now delegates to the unified PageInfoModal.
 * `tips` are mapped to `howItWorks` for a consistent premium design.
 */
export function IntroModal({ isOpen, onClose, title, description, tips }: IntroModalProps) {
  return (
    <PageInfoModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      howItWorks={tips}
    />
  );
}
