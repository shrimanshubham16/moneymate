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
  minor: 1,
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
  
  // Release date
  releaseDate: "Jan 6, 2026",
  
  // Release notes
  releaseNotes: [
    "End-to-End Encryption — Your data encrypted on YOUR device",
    "Zero-Knowledge Privacy — We can't see your financial data",
    "24-Word Recovery Key — Backup your encryption key",
    "Email Verification — Secure account recovery",
    "Password Reset with Recovery Key",
    "AES-256 Military-grade encryption",
    "Privacy-first architecture",
    "PWA support — install as app on your phone"
  ]
};

export default VERSION;

