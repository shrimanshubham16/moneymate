import { useState } from "react";
import { FaInfoCircle } from "react-icons/fa";
import { PageInfoModal } from "./PageInfoModal";
import "./PageInfoButton.css";

interface PageInfoButtonProps {
  title: string;
  description: string;
  impact?: string;
  howItWorks?: string[];
}

export function PageInfoButton({
  title,
  description,
  impact,
  howItWorks
}: PageInfoButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="page-info-button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        aria-label="Page information"
      >
        <FaInfoCircle size={15} />
      </button>
      <PageInfoModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        description={description}
        impact={impact}
        howItWorks={howItWorks}
      />
    </>
  );
}
