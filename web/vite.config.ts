import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // strictPort: se a 5173 estiver ocupada, falha em vez de trocar de porta
  // (o backend só libera CORS para as origens de CORS_ORIGINS, que inclui a 5173).
  server: { port: 5173, strictPort: true },
});
