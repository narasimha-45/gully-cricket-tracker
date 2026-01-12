import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import "dotenv/config"

const API_BASE = process.env.API_BASE_URL;


export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: API_BASE,
        changeOrigin: true
      }
    }
  }
});
