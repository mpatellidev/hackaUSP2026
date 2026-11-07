/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Em desenvolvimento o Vite faz proxy de /api para a API (mesma origem: sem CORS).
// Em produção o FastAPI serve este build em "/clinica/" e a API em /api/v1.
const API = process.env.API_URL ?? "http://localhost:8000";

export default defineConfig({
  base: "/clinica/",
  plugins: [react()],
  server: { host: true, port: 5174, strictPort: true, proxy: { "/api": API } },
  preview: { host: true, port: 5174, strictPort: true, proxy: { "/api": API } },
  build: { outDir: "dist", sourcemap: false },
  test: { environment: "jsdom", globals: true, setupFiles: ["./src/setupTests.ts"], css: false },
});
