/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Version aus package.json, per define in vite.config.ts gesetzt. */
  readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
