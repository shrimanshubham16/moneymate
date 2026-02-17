/**
 * FinFlow Version Information
 * 
 * Versioning follows Semantic Versioning (https://semver.org/)
 * Format: MAJOR.MINOR.PATCH
 * 
 * - MAJOR: Breaking changes, major feature releases
 * - MINOR: New features, non-breaking changes
 * - PATCH: Bug fixes, minor improvements
 * 
 * Build number is the Git commit ID (short SHA)
 */

// Get commit ID injected at build time
declare const __COMMIT_ID__: string;
const commitId = typeof __COMMIT_ID__ !== 'undefined' ? __COMMIT_ID__ : 'dev';

export const VERSION = {
  major: 2,
  minor: 5,
  patch: 0,
  build: commitId, // Git commit ID (short SHA)
  
  // Formatted version string
  get full(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  },
  
  // Full version with build
  get fullWithBuild(): string {
    return `${this.major}.${this.minor}.${this.patch} (Build ${this.build})`;
  },
  
  // Code name for this release
  codeName: "Smart Features Upgrade",

  // Release date
  releaseDate: "Feb 18, 2026",
  
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
    "Multi-Step Onboarding — Guided setup for new users",
    "Unified App Modals — Consistent popups replacing browser dialogs",
    "Dashboard Cache Invalidation — Instant data refresh after changes",
    "PWA Support — Install as a native app on your device",
    "Community Lounge — Real-time chatroom to share tips & make friends",
    "Activity Pins & Comments — Pin activities, inline real-time comments for shared accounts",
    "Smart Notifications — Auto-alerts for unpaid dues, overspends, health drops, CC billing",
    "Investment Priority — Mark investments as priority to protect from pause suggestions",
    "Smart Future Bomb Defusal — Monthly SIP calculation with investment pause suggestions",
    "RSU Income Support — Track vesting RSUs with live stock price lookup",
    "Income Health Toggle — Choose which income sources count toward health score",
    "Bill Start Date Reset — Properly resets billing cycle when start day changes"
  ]
};

export default VERSION;
