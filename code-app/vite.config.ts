import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { powerApps } from "@microsoft/power-apps-vite/plugin";

export default defineConfig({
  plugins: [react(), powerApps()],
  // Fluent UI is a single ~600 kB chunk; the app is loaded once per session.
  build: { chunkSizeWarningLimit: 1024 },
});
