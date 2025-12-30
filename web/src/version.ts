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
  major: 1,
  minor: 2,
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
  releaseDate: "Dec 30, 2025",
  
  // Release notes
  releaseNotes: [
    "Fixed missing routes and imports",
    "Replaced all emoji icons with professional React Icons",
    "Added BETA badge to Sharing feature",
    "Comprehensive Playwright test suite (53.8% passing)",
    "Health calculation improvements",
    "Payment tracking system",
    "Custom billing cycle support"
  ]
};

export default VERSION;

