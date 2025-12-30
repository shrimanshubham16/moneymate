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
  minor: 0,
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
  releaseDate: "Dec 31, 2025",
  
  // Release notes
  releaseNotes: [
    "🚀 Major architecture upgrade - moved to Supabase",
    "⚡ Improved load times with optimized PostgreSQL functions",
    "🔐 E2E encryption infrastructure ready (activation coming soon)",
    "📱 PWA support - install as app on your phone",
    "🎨 Enhanced psychedelic loader animations",
    "📊 Overspend Risk tracking (replaces Financial Discipline)",
    "🔧 Health score consistency across all pages",
    "🏠 Health categories section with improved styling"
  ]
};

export default VERSION;

