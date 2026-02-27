import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBullseye, FaCheckCircle, FaExclamationTriangle,
  FaClipboardList, FaPalette, FaTheaterMasks, FaCodeBranch, FaHeart,
  FaShieldAlt, FaSun, FaCloudSunRain, FaCloudRain, FaBolt, FaArrowLeft,
  FaHandHoldingUsd, FaMoneyBillWave, FaChartBar, FaCreditCard, FaBomb,
  FaUsers, FaChevronDown
} from "react-icons/fa";
import { MdTrendingUp } from "react-icons/md";
import { HiChatBubbleLeftRight } from "react-icons/hi2";
import VERSION from "../version";
import "./AboutPage.css";

type GuideTab = "quick" | "full";

interface GuideSection {
  icon: React.ReactNode;
  title: string;
  teaser: string;
  content: React.ReactNode;
}

export function AboutPage() {
  const navigate = useNavigate();
  const [guideTab, setGuideTab] = useState<GuideTab>("quick");
  const [openSections, setOpenSections] = useState<Set<number>>(new Set());

  const toggleSection = (idx: number) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const quickSteps = [
    { title: "Add Your Income", desc: "Salary, freelance, RSU grants — add every source with its frequency. For RSUs, verify the ticker with live market prices and set your tax rate.", tip: "Toggle 'Include in Health' per source to control what counts" },
    { title: "Plan Fixed & Variable", desc: "Fixed: rent, EMIs, subscriptions. Variable: groceries, entertainment. Enable SIP on periodic bills to accumulate monthly instead of paying a lump sum.", tip: "Use categories — 'Loan' expenses auto-appear in the Loans widget" },
    { title: "Track Investments", desc: "Set monthly goals and mark critical ones as Priority — they're protected from pause suggestions during bomb defusal.", tip: "Pause non-critical investments temporarily when cash is tight" },
    { title: "Defuse Future Bombs", desc: "Big expense ahead? Pick Pause First, Sell RSU First, or build a Custom Mix with live feedback on the gap closing.", tip: "Start early — even 12 months out, a small monthly SIP is painless" },
    { title: "Monitor Health Daily", desc: "Your health score = income minus all obligations. Check it daily — it takes 5 seconds and keeps you on track.", tip: "Customize thresholds for Good / OK / Not Well / Worrisome" },
    { title: "Join the Community", desc: "Share finances with a companion for a combined view. Drop into the Lounge to share tips, ask questions, and help others.", tip: "Tag :BUG: or :FEATURE: in the Lounge to shape the app's future" },
  ];

  const guideSections: GuideSection[] = [
    {
      icon: <FaHandHoldingUsd size={18} />,
      title: "Start with Income",
      teaser: "Add every source of income — salary, freelance, RSU grants — and control what counts toward health.",
      content: (
        <>
          <p>Everything in FinFlow starts here. Your income determines how much room you have for obligations, so getting this right is critical.</p>
          <h5>Regular Income</h5>
          <p>Add salary, freelance, rental, or side-hustle income with the correct <strong>frequency</strong> (monthly, quarterly, yearly). FinFlow converts everything to a monthly equivalent for health calculations.</p>
          <h5>RSU Income</h5>
          <p>If you receive Restricted Stock Units, FinFlow handles the complexity for you:</p>
          <ul>
            <li>Enter your <strong>stock ticker</strong> and verify it with live Yahoo Finance pricing</li>
            <li>Set your <strong>tax withholding %</strong> — FinFlow calculates net shares after tax</li>
            <li>Set an <strong>expected decline buffer</strong> (default -20%) for conservative planning</li>
            <li>FinFlow auto-converts foreign-currency stocks using live forex rates</li>
          </ul>
          <p>The formula: <em>Net annual shares after tax x stock price x (1 - decline%) / 12 = monthly RSU income</em></p>
          <h5>Health Toggle</h5>
          <p>Each income source has an <strong>"Include in Health"</strong> toggle. If your RSU income is volatile or you don't want to rely on it, turn it off — your health score will only reflect stable income.</p>
          <div className="guide-callout">
            <FaBullseye size={14} />
            <span>RSU prices auto-refresh on your dashboard and health pages — you always plan with real market data.</span>
          </div>
        </>
      ),
    },
    {
      icon: <FaMoneyBillWave size={18} />,
      title: "Plan Fixed Expenses",
      teaser: "Rent, EMIs, insurance, subscriptions — the obligations that don't change. Learn about SIP accumulation.",
      content: (
        <>
          <p>Fixed expenses are the backbone of your budget — recurring payments you're committed to regardless of how the month goes.</p>
          <h5>What Counts as Fixed?</h5>
          <p>Rent, mortgage EMIs, insurance premiums, utility bills, subscriptions, loan repayments, school fees — anything with a predictable amount and schedule.</p>
          <h5>Categories Matter</h5>
          <p>Choose the right category (Housing, Utilities, Insurance, Loan, Education, Subscriptions, etc.). This isn't just for organization:</p>
          <ul>
            <li>Expenses marked <strong>"Loan"</strong> automatically appear in your <strong>Loans dashboard widget</strong></li>
            <li>Categories help you spot where your money goes in the health breakdown</li>
          </ul>
          <h5>Frequency & Periodic Expenses</h5>
          <p>Set frequency to <strong>monthly</strong>, <strong>quarterly</strong>, or <strong>yearly</strong>. Monthly expenses generate a due every billing cycle. Periodic expenses (quarterly/yearly) generate dues on their schedule.</p>
          <h5>SIP for Periodic Expenses</h5>
          <p>This is the star feature. Instead of scrambling for a large lump sum when your yearly insurance or quarterly tax is due, <strong>enable SIP</strong> to accumulate funds monthly:</p>
          <ul>
            <li>A yearly expense of 12,000 becomes ~1,000/month accumulated</li>
            <li>Track progress with the <strong>wallet icon</strong> on each SIP expense</li>
            <li>Top up accumulated funds anytime if you want to get ahead</li>
            <li>If cash is tight one month, you can <strong>skip the SIP</strong> — the obligation is removed from your health score that month (but funds freeze)</li>
          </ul>
          <h5>Start & End Dates</h5>
          <p>Use these for time-bound commitments — a 12-month subscription, a fixed-term loan, a seasonal expense. FinFlow will only include them in your obligations during the active period.</p>
          <div className="guide-callout">
            <FaBullseye size={14} />
            <span>Expenses categorized as "Loan" automatically appear in your Loans dashboard widget — no duplicate entry needed.</span>
          </div>
        </>
      ),
    },
    {
      icon: <FaChartBar size={18} />,
      title: "Variable Expenses & Budgets",
      teaser: "Set spending ceilings, log actuals, and understand how payment modes affect your health score.",
      content: (
        <>
          <p>Variable expenses are the money you spend differently every month — groceries, dining out, entertainment, shopping. They're where most financial leaks happen.</p>
          <h5>Plans as Ceilings</h5>
          <p>Create a <strong>plan</strong> (e.g., "Groceries — 8,000/month") to set your budget ceiling. Then log <strong>actual expenses</strong> under each plan as you spend. FinFlow shows you the running total vs. your plan.</p>
          <h5>Categories & Subcategories</h5>
          <p>Each plan has a category (Food, Transport, Entertainment, etc.) and you can create <strong>custom subcategories</strong> for personal tracking — "Coffee", "Uber", "Movies". This gives you granular visibility.</p>
          <h5>Payment Modes — This Is Important</h5>
          <p>The payment mode you choose directly affects your health score:</p>
          <ul>
            <li><strong>UPI / Cash</strong> — Deducted from available funds immediately. Reduces your health score.</li>
            <li><strong>Extra Cash</strong> — Tracked but does <em>not</em> reduce health. Use this for gifts received, reimbursements, or money that doesn't come from your regular income.</li>
            <li><strong>Credit Card</strong> — Deferred to the CC bill. Select which card. The amount shows up in your credit card dues instead.</li>
          </ul>
          <h5>Overspend Detection</h5>
          <p>If you spend over your plan, FinFlow detects the overspend and increases your <strong>constraint score</strong> (overspend risk). This affects your health. The constraint score decays gradually over time as you stay within budgets.</p>
          <h5>Start & End Dates</h5>
          <p>Useful for seasonal budgets — a "Holiday Shopping" plan in December, or a "Wedding Prep" plan that runs for 3 months.</p>
          <div className="guide-callout">
            <FaBullseye size={14} />
            <span>"Extra Cash" is for money that doesn't come from your regular income — gifts, refunds, reimbursements. It won't affect your health score.</span>
          </div>
        </>
      ),
    },
    {
      icon: <FaCreditCard size={18} />,
      title: "Credit Cards — Get the Dates Right",
      teaser: "Incorrect billing and due dates lead to wrong health scores. Here's how to set them correctly.",
      content: (
        <>
          <p>Credit cards are one of the trickiest parts of financial tracking. FinFlow needs two dates to get it right — and getting them wrong means your health score will be off.</p>
          <h5>Bill Date (Day of Month)</h5>
          <p>This is the day your bank <strong>generates your statement</strong>. It tells FinFlow which variable expenses (paid via this card) fall into which billing cycle. Check your bank statement for the exact day — it's usually printed at the top.</p>
          <h5>Due Date</h5>
          <p>This is the <strong>payment deadline</strong>. The Dues page shows your outstanding CC balance and when it's due. Missing this date means late fees and interest from your bank.</p>
          <h5>Bill Amount & Paid Amount</h5>
          <p>When your bill arrives, update the <strong>bill amount</strong>. As you make payments, update <strong>paid amount</strong>. FinFlow tracks the remaining balance and includes it in your health calculation as a CC due.</p>
          <h5>Billing Alerts</h5>
          <p>FinFlow sends notifications on billing day as a reminder to update your bill and plan the payment.</p>
          <div className="guide-callout">
            <FaExclamationTriangle size={14} />
            <span>Wrong billing date = wrong health score. Check your bank statement for the exact day your bill is generated.</span>
          </div>
        </>
      ),
    },
    {
      icon: <MdTrendingUp size={18} />,
      title: "Investments — Priority & Pause",
      teaser: "Set monthly goals, protect critical investments, and know when to pause.",
      content: (
        <>
          <p>Investments are your future — but sometimes the present needs attention too. FinFlow gives you control over what stays running and what can wait.</p>
          <h5>Monthly Goals</h5>
          <p>Each investment has a <strong>monthly amount</strong> (your SIP or contribution target) and <strong>accumulated funds</strong> (how much you've saved so far). Track your progress toward goals.</p>
          <h5>Critical / Priority Investments</h5>
          <p>Mark your most important investments as <strong>Critical</strong>. This does one key thing: they are <strong>never suggested for pausing</strong> during Future Bomb defusal. Use this for:</p>
          <ul>
            <li>Retirement funds (PPF, NPS, 401k)</li>
            <li>Child education funds</li>
            <li>Emergency fund contributions</li>
            <li>Any investment you refuse to interrupt</li>
          </ul>
          <h5>The Pause Option</h5>
          <p>When finances get tight — a Future Bomb lands, income drops, unexpected expense hits — you can <strong>pause</strong> non-critical investments temporarily. This frees up monthly cash flow and improves your health score. The app suggests which to pause during bomb defusal, but you can also do it manually.</p>
          <p>Paused investments don't count toward your monthly obligations. Resume them when you're back on track.</p>
          <div className="guide-callout">
            <FaBullseye size={14} />
            <span>Mark your most important investments as Critical first — they're your financial non-negotiables that never get paused.</span>
          </div>
        </>
      ),
    },
    {
      icon: <FaBomb size={18} />,
      title: "Future Bombs — Defuse Before They Explode",
      teaser: "Large upcoming expenses need a strategy. Three defusal paths to choose from.",
      content: (
        <>
          <p>A <strong>Future Bomb</strong> is a large upcoming expense — a wedding, a car down payment, an annual tax bill, major home repair. It's called a "bomb" because ignoring it means financial explosion when it's due.</p>
          <h5>Set Up a Bomb</h5>
          <p>Enter the <strong>total amount</strong> needed, how much you've <strong>already saved</strong>, and the <strong>due date</strong>. FinFlow calculates the monthly SIP needed to be ready on time. This SIP amount is factored into your health score as a "Bomb Defusal SIP".</p>
          <h5>3 Defusal Strategies</h5>
          <p>When a bomb needs faster defusal (or immediate funds), FinFlow offers three paths:</p>
          <ul>
            <li><strong>Pause First</strong> — Withdraw from investment wallets first. If still short, pause non-priority investments to free monthly cash. If still not enough, sell RSU shares as a last resort.</li>
            <li><strong>Sell First</strong> — Withdraw from investment wallets + sell vested RSU shares at conservative tax-adjusted prices. Only pause investments if selling isn't enough.</li>
            <li><strong>Custom Mix</strong> — You handpick: which investments to pause, how many RSU shares to sell from each source, and how much to withdraw from each wallet. Live feedback shows the remaining gap closing in real time.</li>
          </ul>
          <h5>RSU in Defusal</h5>
          <p>All RSU calculations in bomb defusal use <strong>conservative numbers</strong>: net shares after tax withholding, at the current stock price minus your decline buffer. No rosy assumptions.</p>
          <div className="guide-callout">
            <FaBullseye size={14} />
            <span>Start bombs early — even 12 months out, a small monthly SIP is painless. Waiting 3 months out makes it explosive.</span>
          </div>
        </>
      ),
    },
    {
      icon: <FaUsers size={18} />,
      title: "Sharing — Your Financial Companion",
      teaser: "Invite your partner or family. See the combined picture while keeping individual privacy.",
      content: (
        <>
          <p>Money works best when planned together. FinFlow lets you share financial visibility with a partner, spouse, or family member — without losing privacy.</p>
          <h5>How It Works</h5>
          <p>Invite a companion by their <strong>FinFlow username</strong>. Once they accept, both of you get a <strong>Combined View</strong> on the dashboard showing merged income, expenses, investments, and health.</p>
          <h5>Individual Neatness</h5>
          <p>In the Combined View, you see <strong>your own items in full detail</strong> plus the <strong>bigger picture</strong> of your companion's financial situation. Their individual encrypted items show as <em>[Private]</em> — you see their totals and aggregates, not the raw amounts. Each person retains full privacy over their individual data.</p>
          <h5>Why This Matters</h5>
          <p>Imagine: you know your household's total income, total obligations, and combined health score — but your partner's specific salary or that gift they're buying stays private. It's the best of both worlds.</p>
          <h5>Activity Comments</h5>
          <p>Comment on any shared activity in <strong>real-time</strong>. See a large expense your partner logged? Ask about it right there. Planning a joint purchase? Discuss it in context, not in a separate chat.</p>
          <div className="guide-callout">
            <FaBullseye size={14} />
            <span>Sharing isn't about surveillance — it's about seeing the full picture together. Each person contributes to a shared health score while keeping individual items private.</span>
          </div>
        </>
      ),
    },
    {
      icon: <FaSun size={18} />,
      title: "Your Daily Ritual — The Health Page",
      teaser: "Your financial pulse in 5 seconds. Income minus obligations = how you're doing.",
      content: (
        <>
          <p>The Health page is the heart of FinFlow. Think of it as a <strong>daily 5-second check</strong> — open the app, glance at your health, know exactly where you stand.</p>
          <h5>The Health Score</h5>
          <p><strong>Income - (Fixed + Variable + Investments + CC Dues + Bomb SIP) = Remaining.</strong> That remaining amount, as a percentage of income, determines your category:</p>
          <ul>
            <li><strong>Good</strong> — Healthy buffer. You're on track with room to spare.</li>
            <li><strong>OK</strong> — You'll make it, but not much cushion left.</li>
            <li><strong>Not Well</strong> — Expenses slightly exceed income. Time to re-evaluate.</li>
            <li><strong>Worrisome</strong> — Significant shortfall. Immediate action needed.</li>
          </ul>
          <h5>The Breakdown</h5>
          <p>Tap into Health Details for a full breakdown: each income source, each fixed expense, variable spending (prorated vs. actual — whichever is higher), active investments, CC dues, and bomb defusal SIP.</p>
          <h5>Configurable Thresholds</h5>
          <p>What "Good" means is personal. Adjust the threshold sliders to match your comfort level. If you're comfortable with a 10% buffer, set Good to 10%. If you need 30%, set it there.</p>
          <h5>Overspend Risk</h5>
          <p>Your <strong>constraint score</strong> tracks spending discipline. Overspending increases it; staying within budgets lets it decay. It's a gradual signal — not a punishment, but a mirror.</p>
          <h5>Skipped SIPs</h5>
          <p>If you skip a periodic SIP this month, the obligation is removed from health (giving you relief), but accumulated funds are frozen. You're trading short-term health improvement for a catch-up burden later.</p>
          <div className="guide-callout">
            <FaBullseye size={14} />
            <span>Check your health score daily — it takes 5 seconds and keeps you honest about where your money goes.</span>
          </div>
        </>
      ),
    },
    {
      icon: <FaClipboardList size={18} />,
      title: "Activity Feed — Your Financial Timeline",
      teaser: "Every action logged, pinnable, and commentable. Your spending journal.",
      content: (
        <>
          <p>The Activity Feed is your <strong>financial journal</strong>. Every income added, expense logged, payment marked, investment created — it's all here with timestamps.</p>
          <h5>Pin Important Moments</h5>
          <p>Salary arrived? Budget set for the month? Big purchase decision? <strong>Pin it</strong> to keep it at the top. Pinned activities become your monthly milestones.</p>
          <h5>Comments</h5>
          <p>Shared members can <strong>comment on any activity in real-time</strong>. This is powerful for companion accounts: see a large expense? Discuss it right there instead of switching to a chat app. Everything stays in context.</p>
          <h5>Filters & History</h5>
          <p>Filter by <strong>entity type</strong> (income, fixed, variable, investment, etc.) and <strong>date range</strong>. The History modal shows monthly trends — how your spending patterns evolve over time.</p>
          <div className="guide-callout">
            <FaBullseye size={14} />
            <span>Pin your monthly salary arrival and key budget decisions — they become your financial journal over time.</span>
          </div>
        </>
      ),
    },
    {
      icon: <HiChatBubbleLeftRight size={18} />,
      title: "Community Lounge — We're All in This Together",
      teaser: "Real-time chatroom for all FinFlow users. Tips, questions, and making the app better.",
      content: (
        <>
          <p>FinFlow is more than a personal tool — it's a <strong>community app</strong>. The Lounge is a real-time chatroom where all FinFlow users can connect.</p>
          <h5>What Happens in the Lounge</h5>
          <ul>
            <li>Share financial tips that worked for you</li>
            <li>Ask questions about features or financial planning strategies</li>
            <li>Celebrate milestones — paid off a loan, defused a bomb, hit a savings goal</li>
            <li>Help new users get started — your experience makes the community better</li>
          </ul>
          <h5>Tags That Matter</h5>
          <p>Type <strong>:BUG:</strong> to report something broken, or <strong>:FEATURE:</strong> to suggest an improvement. These get special attention. You're not just a user — you're shaping the app's future.</p>
          <h5>Privacy</h5>
          <p>Messages are <strong>cleared daily</strong> for privacy. Tap any message bubble to <strong>react</strong> with emoji. It's casual, helpful, and low-pressure.</p>
          <h5>The Bigger Picture</h5>
          <p>Every user who shares a tip, answers a question, or reports a bug makes FinFlow better for everyone. The best financial advice often comes from people in the same boat. The Lounge is where that collective wisdom lives.</p>
          <div className="guide-callout">
            <FaBullseye size={14} />
            <span>The best financial advice often comes from people in the same boat. Say hello in the Lounge.</span>
          </div>
        </>
      ),
    },
  ];

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
            <li><strong>RSU Income with Live Pricing:</strong> Enter stock ticker, verify with real-time price from market data. Tax withholding, expected decline buffer, and currency conversion are all built in.</li>
            <li><strong>Income Health Toggle:</strong> Choose which income sources count toward your health score — exclude volatile RSU income if you prefer</li>
            <li><strong>Credit Card & Loan Management:</strong> Keep track of bills, EMIs, and payment deadlines</li>
            <li><strong>Sharing & Collaboration:</strong> Share finances with partners for a combined financial picture</li>
            <li><strong>Activity Log:</strong> Pin important activities, comment in real-time — great for shared accounts</li>
            <li><strong>Smart Notifications:</strong> Auto-alerts for unpaid dues, overspends, health drops, and CC billing days</li>
            <li><strong>Community Lounge:</strong> Real-time chatroom to share financial tips, guide others, and make friends</li>
          </ul>
        </section>

        {/* ── Usage Guide ── */}
        <section className="about-section usage-guide-section">
          <div className="guide-header-row">
            <h2><FaPalette style={{ marginRight: 8, color: '#8b5cf6' }} /> Usage Guide</h2>
            <div className="guide-tab-toggle">
              <button
                className={`guide-tab-btn ${guideTab === 'quick' ? 'active' : ''}`}
                onClick={() => setGuideTab('quick')}
              >
                Quick Start
              </button>
              <button
                className={`guide-tab-btn ${guideTab === 'full' ? 'active' : ''}`}
                onClick={() => setGuideTab('full')}
              >
                Full Guide
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {guideTab === 'quick' ? (
              <motion.div
                key="quick"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="usage-steps-grid">
                  {quickSteps.map((step, i) => (
                    <div className="usage-step-card" key={i}>
                      <div className="usage-step-header">
                        <span className="usage-step-number">{i + 1}</span>
                        <h4 className="usage-step-title">{step.title}</h4>
                      </div>
                      <p className="usage-step-desc">{step.desc}</p>
                      <div className="usage-step-tip">
                        <FaBullseye size={14} />
                        <span>{step.tip}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="guide-accordion"
              >
                {guideSections.map((section, idx) => {
                  const isOpen = openSections.has(idx);
                  return (
                    <div className={`guide-acc-item ${isOpen ? 'open' : ''}`} key={idx}>
                      <button className="guide-acc-header" onClick={() => toggleSection(idx)}>
                        <span className="guide-acc-number">{idx + 1}</span>
                        <span className="guide-acc-icon">{section.icon}</span>
                        <div className="guide-acc-titles">
                          <span className="guide-acc-title">{section.title}</span>
                          {!isOpen && <span className="guide-acc-teaser">{section.teaser}</span>}
                        </div>
                        <FaChevronDown className={`guide-acc-chevron ${isOpen ? 'rotated' : ''}`} />
                      </button>
                      <div className={`guide-acc-body ${isOpen ? 'expanded' : ''}`}>
                        <div className="guide-acc-content">
                          {section.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
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
