import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FaShieldAlt, FaLock, FaChartLine, FaWallet, FaBell, FaUsers, FaArrowRight, FaCheckCircle, FaTimes, FaComments, FaBomb, FaStar, FaSlidersH, FaFileExport, FaGlobe, FaAdjust, FaPiggyBank } from "react-icons/fa";
import VERSION from "../version";
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
            <FaShieldAlt /> End-to-End Encrypted & 100% FREE
          </div>
          <h1>Your Finances,<br /><span className="gradient-text">Truly Private</span></h1>
          <p className="hero-subtitle">
            The only personal finance app where <strong>even we can't see your data</strong>.
            Track income (including live RSU stock prices), plan expenses with SIP accumulation,
            defuse future bombs with three strategies, share finances with family,
            export to Excel — all encrypted on your device, forever free.
          </p>
          <div className="hero-actions">
            <button className="cta-primary" onClick={() => window.location.href = "/"}>
              Start Free — No Credit Card <FaArrowRight />
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
            <h3>RSU & Investment Tracking</h3>
            <p>Track SIPs, mutual funds, and RSU grants with live stock prices, tax withholding, currency conversion, and priority protection — all auto-refreshed.</p>
          </motion.div>

          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <div className="feature-icon alerts">
              <FaBomb />
            </div>
            <h3>3-Path Bomb Defusal</h3>
            <p>Big expense incoming? Pause investments, sell RSU shares at conservative prices, or build a custom mix with optional wallet withdrawals — live feedback shows the gap closing.</p>
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
            <h3>Secure Family Sharing</h3>
            <p>Invite your partner by username. Get a combined household view with merged income, expenses, and health — while individual items stay private.</p>
          </motion.div>

          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <div className="feature-icon">
              <FaGlobe />
            </div>
            <h3>Multi-Currency & Live Forex</h3>
            <p>Set your home currency (INR, USD, EUR, GBP…). RSU stock prices auto-convert using live forex rates from market data.</p>
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
            <p>Military-grade encryption. Your data is encrypted before it leaves your device. 24-word recovery key as your safety net.</p>
          </motion.div>

          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
          >
            <div className="feature-icon community">
              <FaComments />
            </div>
            <h3>Community Lounge</h3>
            <p>Real-time chatroom to share planning tips, celebrate milestones, and shape the app's future with :BUG: and :FEATURE: tags.</p>
          </motion.div>

          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7 }}
          >
            <div className="feature-icon alerts">
              <FaBell />
            </div>
            <h3>Smart Notifications</h3>
            <p>Auto-alerts for unpaid dues, overspends, health drops, CC billing days, and bomb deadlines — fully configurable.</p>
          </motion.div>

          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
          >
            <div className="feature-icon">
              <FaPiggyBank />
            </div>
            <h3>SIP Accumulation</h3>
            <p>Turn yearly or quarterly bills into painless monthly installments. Track wallet progress, skip months when tight, and top up anytime.</p>
          </motion.div>

          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.9 }}
          >
            <div className="feature-icon">
              <FaFileExport />
            </div>
            <h3>Excel & CSV Export</h3>
            <p>Download your complete financial report as a spreadsheet anytime. Your data is always yours to take.</p>
          </motion.div>

          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 1.0 }}
          >
            <div className="feature-icon">
              <FaAdjust />
            </div>
            <h3>Dark & Light Themes</h3>
            <p>Full theme customization with smooth transitions. Choose the look that feels right for your eyes.</p>
          </motion.div>

          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 1.1 }}
          >
            <div className="feature-icon">
              <FaStar />
            </div>
            <h3>Overspend Risk Tracking</h3>
            <p>Adaptive spending intelligence. Overspend raises your constraint score; staying disciplined lets it decay. A mirror, not a punishment.</p>
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

      {/* Pricing (Free forever) */}
      <section className="pricing-section">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2>Free. Forever.</h2>
          <p>No trials, no paywalls, no ads. Current infra comfortably handles ~10,000 users at optimal performance; if we outgrow it, we may ask for donations to keep scaling.</p>
        </motion.div>
        <div className="pricing-grid">
          <div className="pricing-card competitor">
            <h3>Others</h3>
            <ul>
              <li><FaTimes className="icon-no" /> Paywalls after trial</li>
              <li><FaTimes className="icon-no" /> Data sold/used for ads</li>
              <li><FaTimes className="icon-no" /> Limited features</li>
            </ul>
          </div>
          <div className="pricing-card finflow">
            <div className="recommended-badge">Free Forever</div>
            <h3>FinFlow</h3>
            <ul>
              <li><FaCheckCircle className="icon-yes" /> ₹0 forever</li>
              <li><FaCheckCircle className="icon-yes" /> No ads, no upsells</li>
              <li><FaCheckCircle className="icon-yes" /> Full features unlocked</li>
            </ul>
          </div>
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
          <button className="cta-primary large" onClick={() => window.location.href = "/"}>
            Start Free — Forever <FaArrowRight />
          </button>
          <p className="cta-note">No credit card required • Your data stays yours</p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>Built with privacy in mind • v{VERSION.full} • © 2026 FinFlow</p>
      </footer>
    </div>
  );
}

