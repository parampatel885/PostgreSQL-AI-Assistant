import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/projects": "http://localhost:3000",
      "/query": "http://localhost:3000",
      "/health": "http://localhost:3000",
    },
  },
});
