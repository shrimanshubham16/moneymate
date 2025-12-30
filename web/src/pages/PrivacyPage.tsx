import { motion } from "framer-motion";
import { FaShieldAlt, FaLock, FaUserShield, FaCheckCircle, FaTimesCircle, FaInfoCircle } from "react-icons/fa";
import "./PrivacyPage.css";

export function PrivacyPage() {
    return (
        <div className="privacy-page">
            <motion.div
                className="privacy-container"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="privacy-header">
                    <FaShieldAlt className="privacy-icon" />
                    <h1>Your Privacy Matters</h1>
                    <p>Transparency about how we protect your financial data</p>
                </div>

                <div className="privacy-content">
                    {/* What We Protect */}
                    <section className="privacy-section">
                        <h2>
                            <FaLock /> What We Protect
                        </h2>
                        <div className="protection-grid">
                            <div className="protection-card">
                                <FaUserShield className="card-icon" />
                                <h3>Your Password</h3>
                                <p>Never stored in plain text. Hashed using SHA-256 before storage.</p>
                            </div>
                            <div className="protection-card">
                                <FaLock className="card-icon" />
                                <h3>Your Data</h3>
                                <p>Completely isolated per user. Only you can access your financial information.</p>
                            </div>
                            <div className="protection-card">
                                <FaShieldAlt className="card-icon" />
                                <h3>Your Connection</h3>
                                <p>HTTPS encryption protects all data in transit between your device and our server.</p>
                            </div>
                        </div>
                    </section>

                    {/* Transparency */}
                    <section className="privacy-section">
                        <h2>
                            <FaInfoCircle /> Transparency
                        </h2>
                        <div className="transparency-box">
                            <h3>v2.0 Privacy Level: Enterprise-Grade</h3>
                            <p>
                                <strong>Powered by Supabase with Row-Level Security</strong>
                            </p>
                            <p>
                                Your data is hosted on Supabase (SOC2, HIPAA compliant). Here's how we protect it:
                            </p>
                            <ul className="transparency-list">
                                <li>
                                    <FaCheckCircle className="check-icon" />
                                    <strong>Row-Level Security (RLS)</strong> - Database enforces that you can ONLY access YOUR data
                                </li>
                                <li>
                                    <FaCheckCircle className="check-icon" />
                                    <strong>No direct database access</strong> - Even developers access data through secure APIs
                                </li>
                                <li>
                                    <FaCheckCircle className="check-icon" />
                                    <strong>Data is isolated</strong> - Your data is tied to your unique user ID, completely separate from others
                                </li>
                                <li>
                                    <FaCheckCircle className="check-icon" />
                                    <strong>Passwords are hashed</strong> - SHA-256 encryption, impossible to reverse
                                </li>
                                <li>
                                    <FaCheckCircle className="check-icon" />
                                    <strong>E2E encryption ready</strong> - Infrastructure in place, activation coming in v2.1
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* What We See */}
                    <section className="privacy-section">
                        <h2>What We Actually See</h2>
                        <div className="see-grid">
                            <div className="see-card see-yes">
                                <FaCheckCircle className="card-icon" />
                                <h3>We See</h3>
                                <ul>
                                    <li>Server logs (for debugging - no financial details)</li>
                                    <li>Error messages (if something breaks)</li>
                                    <li>Usage statistics (how many users, not who)</li>
                                </ul>
                            </div>
                            <div className="see-card see-no">
                                <FaTimesCircle className="card-icon" />
                                <h3>We DON'T See</h3>
                                <ul>
                                    <li>Your actual financial numbers (unless we specifically access the data file)</li>
                                    <li>Your passwords (they're hashed)</li>
                                    <li>Your login activity (not logged)</li>
                                    <li>Your spending patterns</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Future Enhancements */}
                    <section className="privacy-section">
                        <h2>Privacy Roadmap</h2>
                        <div className="roadmap-grid">
                            <div className="roadmap-card completed">
                                <div className="roadmap-badge">v2.0 ✓</div>
                                <h3>Supabase Migration</h3>
                                <p>Enterprise-grade database with Row-Level Security. Your data is cryptographically isolated.</p>
                            </div>
                            <div className="roadmap-card">
                                <div className="roadmap-badge">v2.1</div>
                                <h3>End-to-End Encryption</h3>
                                <p>Encrypt data on your device before sending. Even we (developers) cannot read your data.</p>
                                <small>🔐 Infrastructure ready, activation coming soon!</small>
                            </div>
                        </div>
                    </section>

                    {/* Comparison */}
                    <section className="privacy-section">
                        <h2>Privacy Comparison</h2>
                        <div className="comparison-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Feature</th>
                                        <th>FinFlow v2.0</th>
                                        <th>Mint</th>
                                        <th>YNAB</th>
                                        <th>1Password</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Row-Level Security</td>
                                        <td>✅ Yes</td>
                                        <td>✅ Yes</td>
                                        <td>✅ Yes</td>
                                        <td>✅ Yes</td>
                                    </tr>
                                    <tr>
                                        <td>Encrypted in transit</td>
                                        <td>✅ Yes</td>
                                        <td>✅ Yes</td>
                                        <td>✅ Yes</td>
                                        <td>✅ Yes</td>
                                    </tr>
                                    <tr>
                                        <td>Encrypted at rest</td>
                                        <td>✅ Yes (Supabase)</td>
                                        <td>✅ Yes</td>
                                        <td>✅ Yes</td>
                                        <td>✅ Yes</td>
                                    </tr>
                                    <tr>
                                        <td>End-to-end encryption</td>
                                        <td>🔜 v2.1</td>
                                        <td>❌ No</td>
                                        <td>❌ No</td>
                                        <td>✅ Yes</td>
                                    </tr>
                                    <tr>
                                        <td>SOC2/HIPAA Compliant</td>
                                        <td>✅ Yes (Supabase)</td>
                                        <td>✅ Yes</td>
                                        <td>✅ Yes</td>
                                        <td>✅ Yes</td>
                                    </tr>
                                </tbody>
                            </table>
                            <p className="table-note">
                                FinFlow v2.0 now matches enterprise security standards. E2E encryption coming in v2.1!
                            </p>
                        </div>
                    </section>

                    {/* What We Don't Do */}
                    <section className="privacy-section">
                        <h2>What We DON'T Do</h2>
                        <div className="dont-do-grid">
                            <div className="dont-do-item">
                                <FaTimesCircle className="dont-icon" />
                                <span>We don't sell your data</span>
                            </div>
                            <div className="dont-do-item">
                                <FaTimesCircle className="dont-icon" />
                                <span>We don't share your data</span>
                            </div>
                            <div className="dont-do-item">
                                <FaTimesCircle className="dont-icon" />
                                <span>We don't access your financial information</span>
                            </div>
                            <div className="dont-do-item">
                                <FaTimesCircle className="dont-icon" />
                                <span>We don't track your spending patterns</span>
                            </div>
                        </div>
                    </section>

                    {/* Contact */}
                    <section className="privacy-section">
                        <h2>Questions?</h2>
                        <div className="contact-box">
                            <p>If you have privacy concerns or questions:</p>
                            <a href="mailto:shriman.shubham@gmail.com" className="contact-link">
                                <FaInfoCircle /> Contact Us
                            </a>
                            <p className="contact-note">
                                We're happy to explain our security measures and open to implementing additional privacy features.
                            </p>
                        </div>
                    </section>
                </div>
            </motion.div>
        </div>
    );
}


