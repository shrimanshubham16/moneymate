import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaBullseye, FaCheckCircle, FaCircle, FaExclamationTriangle, FaTimesCircle } from "react-icons/fa";
import "./AboutPage.css";

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="about-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/settings")}>← Back</button>
        <h1>About MoneyMate</h1>
      </div>

      <motion.div
        className="about-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <section className="about-section">
          <h2><FaBullseye style={{ marginRight: '8px', color: '#3b82f6' }} /> Purpose</h2>
          <p>
            MoneyMate is your personal financial companion designed to help you plan, track, and optimize your finances.
            Whether you're managing monthly expenses, planning investments, or preparing for future liabilities, 
            MoneyMate provides intelligent insights and tools to keep your finances healthy.
          </p>
        </section>

        <section className="about-section">
          <h2>📋 Key Features</h2>
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
          <h2>🎨 Usage Guide</h2>
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
          <h2>🎭 Health Categories</h2>
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
          <h2>📜 Version</h2>
          <p>MoneyMate v1.1.1 (Dec 28, 2024) — Built with ❤️ for better financial planning</p>
        </section>
      </motion.div>
    </div>
  );
}

