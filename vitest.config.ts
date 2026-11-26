// Tests laufen immer mit deutscher Zeitzone, auch in der CI (dort ist UTC
// eingestellt). Sonst fallen die Tests zu Datum kurz nach Mitternacht nicht auf.
process.env.TZ = "Europe/Berlin";

import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
