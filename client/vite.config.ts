import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        chunkFileNames: "assets/chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("react-router-dom")) {
            return "react-vendor";
          }
          if (id.includes("i18next")) {
            return "i18n-vendor";
          }
          if (id.includes("three/examples")) {
            return "three-extras";
          }
          if (id.includes("node_modules/three")) {
            return "three-core";
          }
          return undefined;
        },
      },
    },
  },
});
