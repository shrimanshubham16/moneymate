import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaQuestionCircle, FaEnvelope, FaComments, FaBug, FaLightbulb } from "react-icons/fa";
import "./SupportPage.css";

export function SupportPage() {
  const navigate = useNavigate();

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
          <h2><FaComments style={{ marginRight: 8 }} />Get Help</h2>
          <p>Need assistance with MoneyMate? We're here to help!</p>
          <div className="contact-options">
            <div className="contact-card">
              <FaEnvelope size={32} className="contact-icon" />
              <h3>Email Support</h3>
              <p>support@moneymate.app</p>
              <p className="response-time">Response within 24 hours</p>
            </div>
            <div className="contact-card">
              <FaComments size={32} className="contact-icon" />
              <h3>Live Chat</h3>
              <p>Available 9 AM - 6 PM IST</p>
              <button className="chat-button">Start Chat</button>
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
                You can share your account with a partner via email or username. Choose their role (editor/viewer)
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
          <p>Found an issue? Help us improve MoneyMate!</p>
          <button className="report-button">Report Bug</button>
        </section>

        <section className="support-section">
          <h2><FaLightbulb style={{ marginRight: 8 }} />Feature Request</h2>
          <p>Have an idea for a new feature? We'd love to hear it!</p>
          <button className="feature-button">Suggest Feature</button>
        </section>
      </motion.div>
    </div>
  );
}

