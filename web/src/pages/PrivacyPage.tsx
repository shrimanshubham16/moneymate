import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FaShieldAlt, FaLock, FaUserShield, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaKey, FaArrowLeft, FaMobileAlt, FaCloud } from "react-icons/fa";
import "./PrivacyPage.css";

export function PrivacyPage() {
    const navigate = useNavigate();
    
    return (
        <div className="privacy-page">
            <motion.div
                className="privacy-container"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <FaArrowLeft /> Back
                </button>
                
                <div className="privacy-header">
                    <div className="privacy-badge-hero">
                        <span className="version-badge">v2.1</span>
                        <FaShieldAlt className="privacy-icon" />
                    </div>
                    <h1>End-to-End Encrypted</h1>
                    <p className="privacy-tagline">Your financial data is encrypted on YOUR device. Only you can read it — not even us.</p>
                </div>

                <div className="privacy-content">
                    {/* E2E Encryption Hero */}
                    <section className="privacy-section e2e-hero">
                        <div className="e2e-visual">
                            <div className="encryption-flow">
                                <div className="flow-step">
                                    <div className="flow-icon"><FaMobileAlt /></div>
                                    <span>Your Device</span>
                                </div>
                                <div className="flow-arrow">
                                    <FaLock className="lock-icon" />
                                    <span>Encrypted</span>
                                </div>
                                <div className="flow-step">
                                    <div className="flow-icon"><FaCloud /></div>
                                    <span>Our Server</span>
                                </div>
                            </div>
                        </div>
                        <div className="e2e-explanation">
                            <h3>How It Works</h3>
                            <ol>
                                <li><strong>You enter data</strong> — income, expenses, investments</li>
                                <li><strong>Your device encrypts it</strong> — using AES-256 with your password</li>
                                <li><strong>Encrypted data sent to server</strong> — we only see scrambled text</li>
                                <li><strong>Only your device can decrypt</strong> — when you log in with your password</li>
                            </ol>
                        </div>
                    </section>

                    {/* What We Protect */}
                    <section className="privacy-section">
                        <h2>
                            <FaLock /> What's Protected
                        </h2>
                        <div className="protection-grid">
                            <div className="protection-card">
                                <FaKey className="card-icon" />
                                <h3>Your Financial Data</h3>
                                <p>Income, expenses, investments — all encrypted before leaving your device.</p>
                            </div>
                            <div className="protection-card">
                                <FaUserShield className="card-icon" />
                                <h3>Your Password</h3>
                                <p>Never stored. Used only to derive your encryption key on your device.</p>
                            </div>
                            <div className="protection-card">
                                <FaShieldAlt className="card-icon" />
                                <h3>Your Recovery Key</h3>
                                <p>24-word backup phrase. Only stored as a hash — we can't recreate it.</p>
                            </div>
                        </div>
                    </section>

                    {/* Zero Knowledge */}
                    <section className="privacy-section zero-knowledge">
                        <h2>
                            <FaTimesCircle /> Zero-Knowledge Architecture
                        </h2>
                        <div className="zk-box">
                            <div className="zk-item cannot">
                                <h3>What We CANNOT See</h3>
                                <ul>
                                    <li><FaTimesCircle /> Your income amounts</li>
                                    <li><FaTimesCircle /> Your expense details</li>
                                    <li><FaTimesCircle /> Your investment values</li>
                                    <li><FaTimesCircle /> Your credit card numbers</li>
                                    <li><FaTimesCircle /> Your password</li>
                                    <li><FaTimesCircle /> Your actual financial health</li>
                                </ul>
                            </div>
                            <div className="zk-item can">
                                <h3>What We CAN See</h3>
                                <ul>
                                    <li><FaCheckCircle /> Your username (for login)</li>
                                    <li><FaCheckCircle /> Your recovery key (for password reset)</li>
                                    <li><FaCheckCircle /> Encrypted blobs (meaningless data)</li>
                                    <li><FaCheckCircle /> Timestamps (when data was modified)</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Technical Details */}
                    <section className="privacy-section">
                        <h2>
                            <FaInfoCircle /> Technical Details
                        </h2>
                        <div className="tech-grid">
                            <div className="tech-card">
                                <h4>AES-256-GCM</h4>
                                <p>Military-grade encryption. Same standard used by banks and governments.</p>
                            </div>
                            <div className="tech-card">
                                <h4>PBKDF2</h4>
                                <p>Password-Based Key Derivation with 100,000 iterations. Resistant to brute-force.</p>
                            </div>
                            <div className="tech-card">
                                <h4>BIP39 Recovery</h4>
                                <p>24-word mnemonic phrase for account recovery. Industry standard (Bitcoin, Ethereum).</p>
                            </div>
                            <div className="tech-card">
                                <h4>Client-Side Only</h4>
                                <p>All encryption/decryption happens in your browser. Server never sees plaintext.</p>
                            </div>
                        </div>
                    </section>

                    {/* Comparison */}
                    <section className="privacy-section">
                        <h2>How We Compare</h2>
                        <div className="comparison-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Feature</th>
                                        <th>FinFlow v2.1</th>
                                        <th>Mint</th>
                                        <th>YNAB</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>End-to-End Encrypted</td>
                                        <td className="yes"><FaCheckCircle style={{ marginRight: 4, color: '#10b981' }} /> Yes</td>
                                        <td className="no"><FaTimesCircle style={{ marginRight: 4, color: '#ef4444' }} /> No</td>
                                        <td className="no"><FaTimesCircle style={{ marginRight: 4, color: '#ef4444' }} /> No</td>
                                    </tr>
                                    <tr>
                                        <td>Server Can Read Data</td>
                                        <td className="yes"><FaTimesCircle style={{ marginRight: 4, color: '#10b981' }} /> No</td>
                                        <td className="no"><FaCheckCircle style={{ marginRight: 4, color: '#ef4444' }} /> Yes</td>
                                        <td className="no"><FaCheckCircle style={{ marginRight: 4, color: '#ef4444' }} /> Yes</td>
                                    </tr>
                                    <tr>
                                        <td>Zero-Knowledge</td>
                                        <td className="yes"><FaCheckCircle style={{ marginRight: 4, color: '#10b981' }} /> Yes</td>
                                        <td className="no"><FaTimesCircle style={{ marginRight: 4, color: '#ef4444' }} /> No</td>
                                        <td className="no"><FaTimesCircle style={{ marginRight: 4, color: '#ef4444' }} /> No</td>
                                    </tr>
                                    <tr>
                                        <td>Recovery Key Backup</td>
                                        <td className="yes"><FaCheckCircle style={{ marginRight: 4, color: '#10b981' }} /> 24-word phrase</td>
                                        <td className="no"><FaTimesCircle style={{ marginRight: 4, color: '#ef4444' }} /> No</td>
                                        <td className="no"><FaTimesCircle style={{ marginRight: 4, color: '#ef4444' }} /> No</td>
                                    </tr>
                                    <tr>
                                        <td>Open Infrastructure</td>
                                        <td className="yes"><FaCheckCircle style={{ marginRight: 4, color: '#10b981' }} /> Supabase</td>
                                        <td className="no">Proprietary</td>
                                        <td className="no">Proprietary</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* What We Don't Do */}
                    <section className="privacy-section">
                        <h2>Our Promise</h2>
                        <div className="promise-grid">
                            <div className="promise-item">
                                <FaTimesCircle className="promise-icon" />
                                <span>We don't sell your data</span>
                            </div>
                            <div className="promise-item">
                                <FaTimesCircle className="promise-icon" />
                                <span>We don't share your data</span>
                            </div>
                            <div className="promise-item">
                                <FaTimesCircle className="promise-icon" />
                                <span>We can't read your data</span>
                            </div>
                            <div className="promise-item">
                                <FaTimesCircle className="promise-icon" />
                                <span>We don't track your behavior</span>
                            </div>
                            <div className="promise-item">
                                <FaTimesCircle className="promise-icon" />
                                <span>We don't show ads</span>
                            </div>
                            <div className="promise-item">
                                <FaTimesCircle className="promise-icon" />
                                <span>We don't monetize you</span>
                            </div>
                        </div>
                    </section>

                    {/* Contact */}
                    <section className="privacy-section">
                        <h2>Questions?</h2>
                        <div className="contact-box">
                            <p>If you have privacy concerns or questions about our encryption:</p>
                            <a href="mailto:shriman.shubham@gmail.com" className="contact-link">
                                <FaInfoCircle /> Contact Us
                            </a>
                        </div>
                    </section>
                </div>
            </motion.div>
        </div>
    );
}
