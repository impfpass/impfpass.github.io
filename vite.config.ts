import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { appVersionDefine } from "./vite/appVersion.ts";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: appVersionDefine(),
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
});
