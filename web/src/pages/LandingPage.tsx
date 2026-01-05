import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FaShieldAlt, FaLock, FaChartLine, FaWallet, FaBell, FaUsers, FaArrowRight, FaCheckCircle, FaTimes } from "react-icons/fa";
import "./LandingPage.css";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="hero-badge">
            <FaShieldAlt /> End-to-End Encrypted
          </div>
          <h1>Your Finances,<br /><span className="gradient-text">Truly Private</span></h1>
          <p className="hero-subtitle">
            The only personal finance app where <strong>even we can't see your data</strong>.
            Plan expenses, track investments, and stay financially healthy — all encrypted on your device.
          </p>
          <div className="hero-actions">
            <button className="cta-primary" onClick={() => navigate("/")}>
              Get Started Free <FaArrowRight />
            </button>
            <button className="cta-secondary" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              Learn More
            </button>
          </div>
        </motion.div>
        
        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="hero-card">
            <div className="card-header">
              <span className="status-dot"></span>
              Financial Health
            </div>
            <div className="card-score good">Good</div>
            <div className="card-detail">
              <span>Available</span>
              <span className="encrypted-text">████████</span>
            </div>
            <div className="card-footer">
              <FaLock /> Encrypted on your device
            </div>
          </div>
        </motion.div>
      </section>

      {/* Privacy Difference */}
      <section className="privacy-difference" id="features">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2>What Makes Us Different</h2>
          <p>We built privacy into the core, not as an afterthought</p>
        </motion.div>

        <div className="comparison-cards">
          <motion.div
            className="comp-card others"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3>Other Finance Apps</h3>
            <ul>
              <li><FaTimes className="icon-no" /> Server can read your data</li>
              <li><FaTimes className="icon-no" /> Data used for analytics</li>
              <li><FaTimes className="icon-no" /> Vulnerable to breaches</li>
              <li><FaTimes className="icon-no" /> Employees can access</li>
            </ul>
          </motion.div>

          <motion.div
            className="comp-card finflow"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="recommended-badge">Recommended</div>
            <h3>FinFlow</h3>
            <ul>
              <li><FaCheckCircle className="icon-yes" /> End-to-end encrypted</li>
              <li><FaCheckCircle className="icon-yes" /> Zero-knowledge architecture</li>
              <li><FaCheckCircle className="icon-yes" /> Only you can decrypt</li>
              <li><FaCheckCircle className="icon-yes" /> 24-word recovery key</li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2>Everything You Need</h2>
          <p>Powerful financial tools, completely private</p>
        </motion.div>

        <div className="features-grid">
          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0 }}
          >
            <div className="feature-icon">
              <FaChartLine />
            </div>
            <h3>Financial Health Score</h3>
            <p>Real-time insights into your financial wellbeing. See if you're on track or need adjustments.</p>
          </motion.div>

          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div className="feature-icon">
              <FaWallet />
            </div>
            <h3>Smart Expense Tracking</h3>
            <p>Plan fixed & variable expenses. Mark recurring bills and track spending patterns.</p>
          </motion.div>

          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className="feature-icon investment">
              <FaChartLine />
            </div>
            <h3>Investment Tracking</h3>
            <p>Track SIPs, mutual funds, and other investments. Monitor accumulated wealth.</p>
          </motion.div>

          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <div className="feature-icon alerts">
              <FaBell />
            </div>
            <h3>Smart Alerts</h3>
            <p>Get notified about overspends, missed investments, and upcoming dues.</p>
          </motion.div>

          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <div className="feature-icon sharing">
              <FaUsers />
            </div>
            <h3>Secure Sharing</h3>
            <p>Share finances with partners. Owner, editor, and viewer roles.</p>
          </motion.div>

          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            <div className="feature-icon security">
              <FaShieldAlt />
            </div>
            <h3>AES-256 Encryption</h3>
            <p>Military-grade encryption. Your data is encrypted before it leaves your device.</p>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2>How Privacy Works</h2>
          <p>Simple for you, impenetrable for everyone else</p>
        </motion.div>

        <div className="steps">
          <motion.div
            className="step"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="step-number">1</div>
            <h3>You Enter Data</h3>
            <p>Add income, expenses, investments normally</p>
          </motion.div>

          <div className="step-arrow">→</div>

          <motion.div
            className="step"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div className="step-number">2</div>
            <h3>Device Encrypts</h3>
            <p>AES-256 encryption using your password</p>
          </motion.div>

          <div className="step-arrow">→</div>

          <motion.div
            className="step"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className="step-number">3</div>
            <h3>Secure Storage</h3>
            <p>Only encrypted blobs stored on server</p>
          </motion.div>

          <div className="step-arrow">→</div>

          <motion.div
            className="step"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <div className="step-number">4</div>
            <h3>You Decrypt</h3>
            <p>Only your device can read the data</p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <motion.div
          className="cta-content"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2>Ready for Private Finance?</h2>
          <p>Join the few who truly own their financial data</p>
          <button className="cta-primary large" onClick={() => navigate("/")}>
            Start Free — Forever <FaArrowRight />
          </button>
          <p className="cta-note">No credit card required • Your data stays yours</p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>Built with privacy in mind • v2.1 • © 2026 FinFlow</p>
      </footer>
    </div>
  );
}

