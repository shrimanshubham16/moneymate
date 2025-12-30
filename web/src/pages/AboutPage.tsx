import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaBullseye, FaCheckCircle, FaCircle, FaExclamationTriangle, FaTimesCircle, FaClipboardList, FaPalette, FaTheaterMasks, FaCodeBranch, FaHeart, FaShieldAlt } from "react-icons/fa";
import VERSION from "../version";
import "./AboutPage.css";

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="about-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/settings")}>← Back</button>
        <h1>About FinFlow</h1>
      </div>

      <motion.div
        className="about-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <section className="about-section">
          <h2><FaBullseye style={{ marginRight: '8px', color: '#3b82f6' }} /> Purpose</h2>
          <p>
            FinFlow is your personal financial companion designed to help you plan, track, and optimize your finances.
            Whether you're managing monthly expenses, planning investments, or preparing for future liabilities, 
            FinFlow provides intelligent insights and tools to keep your finances healthy.
          </p>
        </section>

        <section className="about-section">
          <h2><FaClipboardList style={{ marginRight: '8px', color: '#3b82f6' }} />Key Features</h2>
          <ul>
            <li><strong>Health-Based Insights:</strong> Visual indicators showing your financial health (Good, OK, Not Well, Worrisome)</li>
            <li><strong>Smart Planning:</strong> Plan fixed expenses, variable expenses, and investments with ease</li>
            <li><strong>SIP for Periodic Expenses:</strong> Accumulate funds with potential growth for non-monthly expenses</li>
            <li><strong>Future Bombs:</strong> Track and prepare for upcoming large liabilities</li>
            <li><strong>Credit Card & Loan Management:</strong> Keep track of bills, EMIs, and payment deadlines</li>
            <li><strong>Sharing & Collaboration:</strong> Share finances with partners (owner, editor, viewer roles)</li>
            <li><strong>Activity Log:</strong> Complete audit trail of all financial actions</li>
            <li><strong>Smart Alerts:</strong> Get notified about overspends, missed investments, and upcoming dues</li>
          </ul>
        </section>

        <section className="about-section">
          <h2><FaPalette style={{ marginRight: '8px', color: '#8b5cf6' }} />Usage Guide</h2>
          <div className="usage-steps">
            <div className="step">
              <span className="step-number">1</span>
              <div>
                <h4>Set Up Your Income</h4>
                <p>Go to Settings → Plan Finances → Income to add your income sources</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <div>
                <h4>Plan Your Expenses</h4>
                <p>Add fixed and variable expenses. Mark periodic expenses for SIP accumulation</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <div>
                <h4>Track Investments</h4>
                <p>Set investment goals and track monthly contributions</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">4</span>
              <div>
                <h4>Monitor Dashboard</h4>
                <p>Your dashboard shows financial health, dues, and upcoming liabilities</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">5</span>
              <div>
                <h4>Stay Alert</h4>
                <p>Check alerts for overspends and missed payments</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2><FaTheaterMasks style={{ marginRight: '8px', color: '#10b981' }} />Health Categories</h2>
          <div className="health-categories">
            <div className="health-item good">
              <span className="icon"><FaCheckCircle size={32} color="#10b981" /></span>
              <div>
                <h4>Good</h4>
                <p>You'll have &gt; ₹10,000 remaining after the month</p>
              </div>
            </div>
            <div className="health-item ok">
              <span className="icon"><FaCircle size={32} color="#f59e0b" /></span>
              <div>
                <h4>OK</h4>
                <p>You'll have ₹1,000 - ₹9,999 remaining</p>
              </div>
            </div>
            <div className="health-item not-well">
              <span className="icon"><FaExclamationTriangle size={32} color="#f97316" /></span>
              <div>
                <h4>Not Well</h4>
                <p>You'll be ₹1 - ₹3,000 short</p>
              </div>
            </div>
            <div className="health-item worrisome">
              <span className="icon"><FaTimesCircle size={32} color="#ef4444" /></span>
              <div>
                <h4>Worrisome</h4>
                <p>You'll be &gt; ₹3,000 short</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2><FaShieldAlt style={{ marginRight: '8px', color: '#667eea' }} />Privacy & Security</h2>
          <div className="privacy-summary">
            <p>
              <strong>Your privacy is our priority.</strong> FinFlow v2.0 runs on Supabase with enterprise-grade security.
            </p>
            <div className="privacy-points">
              <div className="privacy-point">
                <FaCheckCircle style={{ color: '#10b981', marginRight: '8px' }} />
                <span>Passwords are securely hashed (SHA-256)</span>
              </div>
              <div className="privacy-point">
                <FaCheckCircle style={{ color: '#10b981', marginRight: '8px' }} />
                <span>Row-Level Security: Only you can access your data</span>
              </div>
              <div className="privacy-point">
                <FaCheckCircle style={{ color: '#10b981', marginRight: '8px' }} />
                <span>HTTPS encryption for all connections</span>
              </div>
              <div className="privacy-point">
                <FaCheckCircle style={{ color: '#10b981', marginRight: '8px' }} />
                <span>Database hosted on Supabase (SOC2, HIPAA compliant)</span>
              </div>
              <div className="privacy-point">
                <FaCheckCircle style={{ color: '#10b981', marginRight: '8px' }} />
                <span>Same security level as Mint, YNAB, Personal Capital</span>
              </div>
            </div>
            <div className="privacy-coming-soon">
              <strong>🔐 Coming in v2.1:</strong> Full End-to-End Encryption — your data encrypted with your password before it leaves your device. Not even we can read it!
            </div>
            <button 
              className="privacy-button"
              onClick={() => navigate('/settings/privacy')}
            >
              <FaShieldAlt style={{ marginRight: '8px' }} />
              View Full Privacy Policy
            </button>
          </div>
        </section>

        <section className="about-section">
          <h2><FaCodeBranch style={{ marginRight: '8px', color: '#10b981' }} />Version & Build</h2>
          <div className="version-info">
            <div className="version-card">
              <h3>Version {VERSION.full}</h3>
              <p className="build-number">Build {VERSION.build}</p>
              <p className="release-date">Released: {VERSION.releaseDate}</p>
            </div>
            
            <div className="release-notes">
              <h4>What's New in This Release:</h4>
              <ul>
                {VERSION.releaseNotes.map((note, index) => (
                  <li key={index}>
                    <FaCheckCircle style={{ marginRight: '8px', color: '#10b981', fontSize: '14px' }} />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
            
            <p className="built-with">Built with <FaHeart style={{ color: '#ef4444', fontSize: '16px' }} /> for better financial planning</p>
          </div>
        </section>
      </motion.div>
    </div>
  );
}

