import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { execSync } from "child_process";

// Get commit ID from git or environment variable
function getCommitId(): string {
  // Vercel provides this automatically
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
  }
  // For local builds or CI, try to get from git
  // Try from current directory first, then parent (for Vercel builds)
  try {
    try {
      return execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: process.cwd() }).trim();
    } catch {
      // Try from parent directory (Vercel builds from repo root)
      return execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: process.cwd() + '/..' }).trim();
    }
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __COMMIT_ID__: JSON.stringify(getCommitId()),
  },
  build: {
    // Ensure service worker and manifest are included in build
    rollupOptions: {
      input: {
        main: './index.html',
      },
      output: {
        // Ensure proper MIME types for module scripts
        format: 'es',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
  },
  // Copy public assets (icons, manifest, sw.js) to dist
  publicDir: 'public',
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts", "./src/__tests__/setup.ts"]
  }
});
