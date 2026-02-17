import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaQuestionCircle, FaEnvelope, FaBug, FaLightbulb } from "react-icons/fa";
import "./SupportPage.css";

export function SupportPage() {
  const navigate = useNavigate();
  const [showBugForm, setShowBugForm] = useState(false);
  const [showFeatureForm, setShowFeatureForm] = useState(false);
  const [bugForm, setBugForm] = useState({ title: "", description: "" });
  const [featureForm, setFeatureForm] = useState({ title: "", description: "" });

  return (
    <div className="support-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/settings")}>← Back</button>
        <h1>Support</h1>
      </div>

      <motion.div
        className="support-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <section className="support-section">
          <h2><FaEnvelope style={{ marginRight: 8 }} />Get Help</h2>
          <p>Need assistance with FinFlow? We're here to help!</p>
          <div className="contact-options">
            <div className="contact-card">
              <FaEnvelope size={32} className="contact-icon" />
              <h3>Email Support</h3>
              <p>
                <a href="mailto:shriman.shubham@gmail.com" style={{ color: "#3b82f6", textDecoration: "none" }}>
                  shriman.shubham@gmail.com
                </a>
              </p>
              <p className="response-time">Response within 24 hours</p>
            </div>
          </div>
        </section>

        <section className="support-section">
          <h2><FaQuestionCircle style={{ marginRight: 8 }} />FAQs</h2>
          <div className="faq-list">
            <details className="faq-item">
              <summary>How do I add a new expense?</summary>
              <p>
                Go to Settings → Plan Finances → Fixed or Variable Expenses → Click the "+ Add" button.
                Fill in the details and save.
              </p>
            </details>
            <details className="faq-item">
              <summary>What is "SIP for periodic expenses"?</summary>
              <p>
                When you have a non-monthly expense (quarterly, yearly), you can mark it for SIP.
                This helps you accumulate funds monthly with potential growth until the payment is due.
              </p>
            </details>
            <details className="faq-item">
              <summary>How does sharing work?</summary>
              <p>
                You can share your account with a partner via username. Choose their role (editor/viewer)
                and optionally merge finances to combine income and expenses for a unified view.
              </p>
            </details>
            <details className="faq-item">
              <summary>Can I change my username?</summary>
              <p>
                No, usernames are immutable once set during signup. This ensures consistency across
                shared accounts and activity logs. Contact support if you have special circumstances.
              </p>
            </details>
            <details className="faq-item">
              <summary>What do the health categories mean?</summary>
              <p>
                • Good: &gt; ₹10,000 remaining<br/>
                • OK: ₹1,000-9,999 remaining<br/>
                • Not Well: ₹1-3,000 short<br/>
                • Worrisome: &gt; ₹3,000 short
              </p>
            </details>
            <details className="faq-item">
              <summary>How are alerts calculated?</summary>
              <p>
                Alerts are triggered when you overspend on a variable expense plan,
                miss a planned investment, or have upcoming SIP payment deadlines.
              </p>
            </details>
          </div>
        </section>

        <section className="support-section">
          <h2><FaBug style={{ marginRight: 8 }} />Report a Bug</h2>
          <p>Found an issue? Help us improve FinFlow!</p>
          {!showBugForm ? (
            <button className="report-button" onClick={() => setShowBugForm(true)}>Report Bug</button>
          ) : (
            <motion.div
              className="report-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <form onSubmit={(e) => {
                e.preventDefault();
                const subject = encodeURIComponent(`Bug Report: ${bugForm.title}`);
                const body = encodeURIComponent(`Bug Description:\n${bugForm.description}\n\nPlease provide steps to reproduce and any error messages.`);
                window.location.href = `mailto:shriman.shubham@gmail.com?subject=${subject}&body=${body}`;
                setShowBugForm(false);
                setBugForm({ title: "", description: "" });
              }}>
                <div className="form-group">
                  <label>Bug Title *</label>
                  <input
                    type="text"
                    value={bugForm.title}
                    onChange={(e) => setBugForm({ ...bugForm, title: e.target.value })}
                    required
                    placeholder="Brief description of the bug"
                  />
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={bugForm.description}
                    onChange={(e) => setBugForm({ ...bugForm, description: e.target.value })}
                    required
                    rows={5}
                    placeholder="Describe the bug, steps to reproduce, and any error messages..."
                  />
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => { setShowBugForm(false); setBugForm({ title: "", description: "" }); }}>
                    Cancel
                  </button>
                  <button type="submit" className="primary">Send Report</button>
                </div>
              </form>
            </motion.div>
          )}
        </section>

        <section className="support-section">
          <h2><FaLightbulb style={{ marginRight: 8 }} />Feature Request</h2>
          <p>Have an idea for a new feature? We'd love to hear it!</p>
          {!showFeatureForm ? (
            <button className="feature-button" onClick={() => setShowFeatureForm(true)}>Suggest Feature</button>
          ) : (
            <motion.div
              className="report-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <form onSubmit={(e) => {
                e.preventDefault();
                const subject = encodeURIComponent(`Feature Request: ${featureForm.title}`);
                const body = encodeURIComponent(`Feature Description:\n${featureForm.description}\n\nPlease explain how this feature would help you.`);
                window.location.href = `mailto:shriman.shubham@gmail.com?subject=${subject}&body=${body}`;
                setShowFeatureForm(false);
                setFeatureForm({ title: "", description: "" });
              }}>
                <div className="form-group">
                  <label>Feature Title *</label>
                  <input
                    type="text"
                    value={featureForm.title}
                    onChange={(e) => setFeatureForm({ ...featureForm, title: e.target.value })}
                    required
                    placeholder="Brief description of the feature"
                  />
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={featureForm.description}
                    onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })}
                    required
                    rows={5}
                    placeholder="Describe the feature and how it would help you..."
                  />
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => { setShowFeatureForm(false); setFeatureForm({ title: "", description: "" }); }}>
                    Cancel
                  </button>
                  <button type="submit" className="primary">Send Request</button>
                </div>
              </form>
            </motion.div>
          )}
        </section>
      </motion.div>
    </div>
  );
}

