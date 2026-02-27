import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { execSync } from "child_process";

function gitExec(cmd: string): string {
  try {
    try {
      return execSync(cmd, { encoding: 'utf-8', cwd: process.cwd() }).trim();
    } catch {
      return execSync(cmd, { encoding: 'utf-8', cwd: process.cwd() + '/..' }).trim();
    }
  } catch {
    return '';
  }
}

function getCommitId(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
  }
  return gitExec('git rev-parse --short HEAD') || 'dev';
}

function getPatchVersion(): number {
  const count = gitExec('git rev-list --count HEAD');
  return count ? parseInt(count, 10) : 0;
}

export default defineConfig({
  plugins: [react()],
  define: {
    __COMMIT_ID__: JSON.stringify(getCommitId()),
    __PATCH_VERSION__: getPatchVersion(),
  },
  build: {
    // Ensure service worker and manifest are included in build
    rollupOptions: {
      input: {
        main: './index.html',
      },
      output: {
        format: 'es',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-recharts': ['recharts'],
        }
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
