import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Ensure service worker and manifest are included in build
    rollupOptions: {
      input: {
        main: './index.html',
      },
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
