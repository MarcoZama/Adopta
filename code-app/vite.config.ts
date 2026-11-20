import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { powerApps } from "@microsoft/power-apps-vite/plugin";
import { getEdition } from "../shared/edition";

export default defineConfig(({ mode }) => {
  if (mode !== "it" && mode !== "en") throw new Error("Build with --mode it or --mode en.");
  const profile = getEdition(mode);
  return {
  define: { __ADOPTA_EDITION__: JSON.stringify(mode) },
  resolve: { dedupe: ["@microsoft/power-apps"] },
  plugins: [react(), powerApps(), {
    name: "adopta-edition",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "edition.json", source: JSON.stringify({ edition: mode, schema: profile.apps.communications.schema }) });
    },
  }],
  // Fluent UI is a single ~600 kB chunk; the app is loaded once per session.
  build: { chunkSizeWarningLimit: 1024, outDir: `dist-${mode}` },
  };
});
