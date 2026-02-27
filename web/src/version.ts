/**
 * FinFlow Version Information
 * 
 * Versioning follows Semantic Versioning (https://semver.org/)
 * Format: MAJOR.MINOR.PATCH
 * 
 * - MAJOR: Breaking changes, major feature releases
 * - MINOR: New features, non-breaking changes
 * - PATCH: Auto-incremented from git commit count on each build
 * 
 * Build ID is the Git commit short SHA, injected at build time.
 */

declare const __COMMIT_ID__: string;
declare const __PATCH_VERSION__: number;
const commitId = typeof __COMMIT_ID__ !== 'undefined' ? __COMMIT_ID__ : 'dev';
const patchFromBuild = typeof __PATCH_VERSION__ !== 'undefined' ? __PATCH_VERSION__ : 0;

export const VERSION = {
  major: 2,
  minor: 7,
  patch: patchFromBuild,
  build: commitId,
  
  get full(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  },
  
  get fullWithBuild(): string {
    return `${this.major}.${this.minor}.${this.patch}+${this.build}`;
  },
  
  codeName: "Performance & Polish",

  releaseDate: "Feb 27, 2026",
  
  // Release notes
  releaseNotes: [
    "End-to-End Encryption — AES-256 military-grade encryption on device",
    "Zero-Knowledge Privacy — We can't read your financial data",
    "24-Word Recovery Key — Secure account backup & password reset",
    "Premium Dark Theme — Ultra-polished UI across all pages",
    "Simplified Health Thresholds — Intuitive 2-slider configuration",
    "Overspend Risk Tracking — Gradual cooldown with adaptive decay",
    "Premium Credit Cards Page — Usage bars, billing cycle details",
    "Enhanced Activities Log — Expandable details & entity filters",
    "Skip Monthly SIP — Skip periodic SIP payments with health score relief",
    "Unified App Modals — Consistent popups replacing browser dialogs",
    "Dashboard Cache Invalidation — Instant data refresh after changes",
    "PWA Support — Install as a native app on your device",
    "Community Lounge — Real-time chatroom to share tips & make friends",
    "Activity Pins & Comments — Pin activities, inline real-time comments for shared accounts",
    "Smart Notifications — Auto-alerts for unpaid dues, overspends, health drops, CC billing",
    "Investment Priority — Mark investments as priority to protect from pause suggestions",
    "3-Path Future Bomb Defusal — Pause investments, sell RSU shares, or custom mix with live feedback",
    "RSU Live Pricing — Verify stock tickers with real-time market data, auto-refresh on dashboard",
    "Conservative RSU Planning — Net shares after tax withholding + configurable decline buffer",
    "Currency Conversion — Automatic forex rate for RSU stocks in different currencies",
    "Income Health Toggle — Choose which income sources count toward health score",
    "Bill Start Date Reset — Properly resets billing cycle when start day changes",
    "Account Page Redesign — Premium dark theme with profile hero & detail sections",
    "Avatar Upload — Upload your profile picture via Supabase Storage",
    "Tooltip & Modal Fixes — Forced dark context for text visibility across all themes",
    "Auto Versioning — Patch version auto-increments with each build from git history",
    "Performance Boost — Parallelized backend queries, code-split routes, memoized computations"
  ]
};

export default VERSION;
