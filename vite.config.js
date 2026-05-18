import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    // File watching is flaky on Docker bind mounts (WSL2). Polling is reliable.
    watch: { usePolling: true, interval: 300 },
  },
});
