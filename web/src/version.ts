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
  minor: 8,
  patch: patchFromBuild,
  build: commitId,
  
  get full(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  },
  
  get fullWithBuild(): string {
    return `${this.major}.${this.minor}.${this.patch}+${this.build}`;
  },
  
  codeName: "Companion Awareness",

  releaseDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  
  releaseNotes: [
    "Companion Activity Alerts — Get notified when your shared partner adds expenses, pays bills, or skips SIPs",
    "Rich Activity Logging — Every action now captures full context: frequency, category, billing period, card names",
    "Recovery Phrase Fix — Generate/Regenerate recovery phrase now works correctly for all encrypted users",
    "Security & Profile Activities — Password changes and encryption enablement are now logged",
    "End-to-End Encryption — AES-256 military-grade encryption on device",
    "Zero-Knowledge Privacy — We can't read your financial data",
    "24-Word Recovery Key — Secure account backup & password reset",
    "Key Wrapping — Data survives account recovery and password changes",
    "Display Names — Set a display name shown in Lounge, activities, and sharing",
    "Delete Account — Permanently delete your account and all data",
    "Overspend Risk Tracking — Gradual cooldown with adaptive decay",
    "Skip Monthly SIP — Skip periodic SIP payments with health score relief",
    "CC Dues Payment — Clear credit card dues directly from the Dues page",
    "Smart Notifications — Auto-alerts for unpaid dues, overspends, health drops, CC billing",
    "Community Lounge — Real-time chatroom to share tips & make friends",
    "Activity Pins & Comments — Pin activities, inline real-time comments for shared accounts",
    "PWA Support — Install as a native app on your device",
    "Auto Versioning — Patch version auto-increments with each build from git history",
    "Performance Boost — Parallelized backend queries, code-split routes, memoized computations"
  ]
};

export default VERSION;
