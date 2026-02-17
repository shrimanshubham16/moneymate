import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaArrowLeft, FaArrowRight, FaTimes, FaBell, FaHeart, FaChartLine, FaCogs, FaUsers, FaQuestionCircle } from "react-icons/fa";
import { Modal } from "./Modal";
import "./WalkthroughModal.css";

const STEPS = [
  {
    id: "dashboard",
    title: "Dashboard Overview",
    icon: <FaChartLine />,
    body: "See your health, dues, and shared finances. Switch views (me/merged/specific user) to adjust aggregates."
  },
  {
    id: "health",
    title: "Health & Breakdown",
    icon: <FaHeart />,
    body: "Open Health to see totals and line items. Thresholds are configurable in Health page (Settings → Health)."
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: <FaBell />,
    body: "Bell shows in-app alerts; Preferences live under Settings → Notifications. Toggle categories on or off to suit your workflow."
  },
  {
    id: "settings",
    title: "Settings & Themes",
    icon: <FaCogs />,
    body: "Manage billing prefs, themes (Dark/Light), sharing, and security. Themes persist per-device."
  },
  {
    id: "sharing",
    title: "Sharing",
    icon: <FaUsers />,
    body: "Invite partners, approve requests, and view combined finances. Specific-user view uses their aggregates."
  },
  {
    id: "help",
    title: "Need Help?",
    icon: <FaQuestionCircle />,
    body: "Check About for privacy caveats, or Support for help. Notifications and onboarding are best-effort with E2E."
  }
];

export function WalkthroughModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  const current = STEPS[step];
  const hasPrev = step > 0;
  const hasNext = step < STEPS.length - 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title="Quick Walkthrough"
          size="lg"
          footer={
            <div className="wt-footer">
              <button className="ghost" onClick={onClose}>Skip</button>
              <div className="wt-nav">
                <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={!hasPrev}>
                  <FaArrowLeft /> Back
                </button>
                {hasNext ? (
                  <button className="primary" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
                    Next <FaArrowRight />
                  </button>
                ) : (
                  <button className="primary" onClick={onClose}>
                    Done
                  </button>
                )}
              </div>
            </div>
          }
        >
          <div className="wt-step">
            <div className="wt-icon">{current.icon}</div>
            <div className="wt-copy">
              <h3>{current.title}</h3>
              <p>{current.body}</p>
            </div>
            <div className="wt-progress">
              {STEPS.map((_, idx) => (
                <span key={idx} className={`dot ${idx === step ? "active" : ""}`} />
              ))}
            </div>
          </div>
        </Modal>
      )}
    </AnimatePresence>
  );
}
