import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaBullseye, FaCheckCircle, FaCircle, FaExclamationTriangle, FaTimesCircle,
  FaClipboardList, FaPalette, FaTheaterMasks, FaCodeBranch, FaHeart,
  FaShieldAlt, FaSun, FaCloudSunRain, FaCloudRain, FaBolt, FaArrowLeft
} from "react-icons/fa";
import VERSION from "../version";
import "./AboutPage.css";

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="about-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate("/settings")}>
          <FaArrowLeft style={{ marginRight: 6 }} /> Back
        </button>
        <h1>About FinFlow</h1>
      </div>

      <motion.div
        className="about-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* ── Purpose ── */}
        <section className="about-section">
          <h2><FaBullseye style={{ marginRight: 8, color: '#3b82f6' }} /> Purpose</h2>
          <p>
            FinFlow is your personal financial companion designed to help you plan, track, and optimize your finances.
            Whether you're managing monthly expenses, planning investments, or preparing for future liabilities,
            FinFlow provides intelligent insights and tools to keep your finances healthy.
          </p>
          <div className="about-note">
            <strong>Known OK caveats (free + privacy-first):</strong>
            <ul>
              <li>No server-side analytics; troubleshooting uses client logs only when you share them.</li>
              <li>E2E encryption can mean occasional re-entering credentials on new devices.</li>
              <li>Some heavy calculations happen client-side to keep data private; load times may vary.</li>
              <li>Notifications are best-effort; ensure in-app preferences are enabled.</li>
            </ul>
          </div>
        </section>

        {/* ── Key Features ── */}
        <section className="about-section">
          <h2><FaClipboardList style={{ marginRight: 8, color: '#3b82f6' }} /> Key Features</h2>
          <ul>
            <li><strong>Health-Based Insights:</strong> Visual indicators showing your financial health (Good, OK, Not Well, Worrisome) — updates live as you mark payments</li>
            <li><strong>Smart Planning:</strong> Plan fixed expenses, variable expenses, and investments with ease</li>
            <li><strong>SIP for Periodic Expenses:</strong> Accumulate funds with potential growth for non-monthly expenses</li>
            <li><strong>Smart Future Bomb Defusal — 3 Strategies:</strong> Large expense looming? Pick from three defusal paths:
              <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                <li><strong>Pause First:</strong> Pauses non-priority investments, then sells RSU shares if still short</li>
                <li><strong>Sell First:</strong> Sells vested RSU shares at conservative (tax-adjusted, decline-buffered) prices</li>
                <li><strong>Custom Mix:</strong> You choose exactly what to pause and how many shares to sell, with live feedback</li>
              </ul>
            </li>
            <li><strong>Investment Priority:</strong> Mark key investments as priority — they're never suggested for pausing during bomb defusal</li>
            <li><strong>RSU Income with Live Pricing:</strong> Enter stock ticker, verify with real-time price from market data. Tax withholding, expected decline buffer, and currency conversion are all built in. Auto-refreshes on dashboard and health pages.</li>
            <li><strong>Conservative Planning:</strong> RSU values use net shares after tax and a user-configurable decline buffer (default −20%). Future bomb defusal always uses these conservative numbers.</li>
            <li><strong>Income Health Toggle:</strong> Choose which income sources count toward your health score — exclude volatile RSU income if you prefer</li>
            <li><strong>Credit Card & Loan Management:</strong> Keep track of bills, EMIs, and payment deadlines</li>
            <li><strong>Sharing & Collaboration:</strong> Share finances with partners (owner, editor, viewer roles)</li>
            <li><strong>Activity Log:</strong> Pin important activities, comment in real-time — great for shared accounts</li>
            <li><strong>Smart Notifications:</strong> Auto-alerts for unpaid dues, overspends, health drops, and CC billing days</li>
            <li><strong>Overspend Risk Scoring:</strong> Gradual cooldown with adaptive decay — reflects your true planning habit</li>
            <li><strong>Community Lounge:</strong> Real-time chatroom to share financial tips, guide others, and make friends — cleared daily</li>
          </ul>
        </section>

        {/* ── Usage Guide ── */}
        <section className="about-section usage-guide-section">
          <h2><FaPalette style={{ marginRight: 8, color: '#8b5cf6' }} /> Usage Guide</h2>
          <div className="usage-steps-grid">
            {[
              { title: "Set Up Your Income", desc: "Add salary, freelance, and RSU grants with vesting schedules. For RSUs, verify the stock ticker with live market prices. Set tax rate & expected decline for conservative planning.", tip: "RSU prices auto-refresh on dashboard — you always plan with current data" },
              { title: "Plan Your Expenses", desc: "Add fixed expenses (rent, EMIs) and variable expense budgets (groceries, entertainment). Enable SIP for periodic expenses.", tip: "Use SIP for yearly/quarterly bills to accumulate funds" },
              { title: "Track Investments", desc: "Create investment goals with monthly contribution targets. Mark key ones as 'Priority' to protect them from pause suggestions.", tip: "Priority investments stay running even during tight months" },
              { title: "Defuse Future Bombs — 3 Ways", desc: "Large expense coming? Pick Pause First, Sell RSU First, or build a Custom Mix. All RSU calculations use tax-adjusted net shares at a conservative decline price.", tip: "Custom Mix lets you choose exactly what to pause and how many shares to sell" },
              { title: "Monitor Dashboard", desc: "Your dashboard shows real-time financial health, pending dues, RSU stock prices, and a summary of all obligations for the month.", tip: "RSU prices and conversion rates refresh automatically" },
              { title: "Stay on Track", desc: "Smart notifications alert you about unpaid dues, overspends, health drops, and upcoming CC billing days. Pin activities for quick access.", tip: "Comment on shared activities to collaborate with partners" },
            ].map((step, i) => (
              <div className="usage-step-card" key={i}>
                <div className="usage-step-header">
                  <span className="usage-step-number">{i + 1}</span>
                  <h4 className="usage-step-title">{step.title}</h4>
                </div>
                <p className="usage-step-desc">{step.desc}</p>
                <div className="usage-step-tip">
                  <FaBullseye size={14} />
                  Tip: {step.tip}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Health Categories ── */}
        <section className="about-section">
          <h2><FaTheaterMasks style={{ marginRight: 8, color: '#10b981' }} /> Health Categories</h2>
          <p style={{ marginBottom: 16 }}>
            Your financial health is determined by how much of your income remains after all obligations.
            Thresholds are customizable from the Health Details page.
          </p>
          <div className="health-categories">
            <div className="health-item good">
              <span className="icon"><FaSun size={28} color="#10b981" /></span>
              <div>
                <h4>Good</h4>
                <p>A healthy buffer remains — you're on track with room to spare</p>
              </div>
            </div>
            <div className="health-item ok">
              <span className="icon"><FaCloudSunRain size={28} color="#f59e0b" /></span>
              <div>
                <h4>OK</h4>
                <p>You'll make it through the month, but not much cushion left</p>
              </div>
            </div>
            <div className="health-item not-well">
              <span className="icon"><FaCloudRain size={28} color="#f97316" /></span>
              <div>
                <h4>Not Well</h4>
                <p>Expenses exceed income slightly — time to re-evaluate spending</p>
              </div>
            </div>
            <div className="health-item worrisome">
              <span className="icon"><FaBolt size={28} color="#ef4444" /></span>
              <div>
                <h4>Worrisome</h4>
                <p>Significant shortfall — immediate action needed to avoid debt</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Privacy & Encryption ── */}
        <section className="about-section privacy-hero">
          <h2><FaShieldAlt style={{ marginRight: 8, color: '#00e676' }} /> End-to-End Encryption</h2>
          <div className="privacy-summary">
            <div className="e2e-badge">
              <span className="badge-new">V{VERSION.full}</span>
              <h3>Your Data, Your Control</h3>
            </div>
            <p className="e2e-tagline">
              <strong>Your financial data is encrypted on your device.</strong> Only you can read it — not even us.
            </p>
            <div className="privacy-points">
              <div className="privacy-point">
                <FaCheckCircle style={{ color: '#00e676', marginRight: 8, flexShrink: 0 }} />
                <span><strong>Client-Side Encryption:</strong> Data encrypted before leaving your device</span>
              </div>
              <div className="privacy-point">
                <FaCheckCircle style={{ color: '#00e676', marginRight: 8, flexShrink: 0 }} />
                <span><strong>Zero-Knowledge:</strong> We can't see your income, expenses, or investments</span>
              </div>
              <div className="privacy-point">
                <FaCheckCircle style={{ color: '#00e676', marginRight: 8, flexShrink: 0 }} />
                <span><strong>24-Word Recovery Key:</strong> Your backup if you forget your password</span>
              </div>
              <div className="privacy-point">
                <FaCheckCircle style={{ color: '#00e676', marginRight: 8, flexShrink: 0 }} />
                <span><strong>AES-256 Encryption:</strong> Military-grade security standard</span>
              </div>
              <div className="privacy-point">
                <FaCheckCircle style={{ color: '#10b981', marginRight: 8, flexShrink: 0 }} />
                <span>HTTPS + Row-Level Security + SOC2 Infrastructure</span>
              </div>
            </div>
            <div className="privacy-comparison">
              <h4>How We Compare</h4>
              <table>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Most Apps</th>
                    <th>FinFlow</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Server can read your data</td>
                    <td style={{ color: '#ef4444' }}>Yes</td>
                    <td style={{ color: '#00e676' }}>No</td>
                  </tr>
                  <tr>
                    <td>Data encrypted at rest</td>
                    <td style={{ color: '#f59e0b' }}>Sometimes</td>
                    <td style={{ color: '#00e676' }}>Always</td>
                  </tr>
                  <tr>
                    <td>End-to-End encrypted</td>
                    <td style={{ color: '#ef4444' }}>No</td>
                    <td style={{ color: '#00e676' }}>Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button
              className="privacy-button"
              onClick={() => navigate('/settings/privacy')}
            >
              <FaShieldAlt style={{ marginRight: 8 }} />
              View Full Privacy Policy
            </button>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="about-section">
          <h2><FaCheckCircle style={{ marginRight: 8, color: '#10b981' }} /> Pricing</h2>
          <p>FinFlow is and always will be <strong>FREE</strong>. No ads, no paywalls, no upsells. Your data stays private and the tools stay open.</p>
        </section>

        {/* ── Version & Build ── */}
        <section className="about-section">
          <h2><FaCodeBranch style={{ marginRight: 8, color: '#a78bfa' }} /> Version & Build</h2>
          <div className="version-info">
            <div className="version-card">
              <h3>V{VERSION.full}{VERSION.codeName ? ` — ${VERSION.codeName}` : ''}</h3>
              <p className="build-number">Build {VERSION.build}</p>
              <p className="release-date">Released: {VERSION.releaseDate}</p>
            </div>

            <div className="release-notes">
              <h4>What's New in V{VERSION.full}:</h4>
              <ul>
                {VERSION.releaseNotes.map((note, index) => (
                  <li key={index}>
                    <FaCheckCircle style={{ marginRight: 8, color: '#10b981', fontSize: 14, flexShrink: 0 }} />
                    {note}
                  </li>
                ))}
              </ul>
            </div>

            <p className="built-with">
              Built with <FaHeart style={{ color: '#ef4444', fontSize: 16 }} /> for better financial planning
            </p>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
