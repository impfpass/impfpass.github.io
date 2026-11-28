/**
 * Ordnet die Pakete im Build Projekten zu, für die Übersicht „Verwendete
 * Software“ in der App. Hilfspakete zählen zu dem Projekt, das sie mitbringt.
 *
 * Ein neues Paket im Build ohne Eintrag lässt den Build scheitern, ebenso ein
 * Projekt, zu dem kein Paket mehr gehört (siehe `summarizeNotices`).
 */
export type LicenseProject = {
  name: string;
  /** Exakte Paketnamen. */
  packages?: string[];
  /** Anfänge von Paketnamen, etwa `@radix-ui/`. */
  prefixes?: string[];
};

export const LICENSE_PROJECTS: LicenseProject[] = [
  {
    name: "React",
    packages: ["react", "react-dom", "scheduler", "use-sync-external-store"],
  },
  {
    name: "Radix UI",
    // radix-ui steht in dependencies, landet aber selbst nicht im Build.
    packages: [
      "radix-ui",
      "aria-hidden",
      "get-nonce",
      "react-remove-scroll",
      "react-remove-scroll-bar",
      "react-style-singleton",
      "tslib",
      "use-callback-ref",
      "use-sidecar",
    ],
    prefixes: ["@radix-ui/"],
  },
  {
    name: "shadcn/ui",
    packages: ["shadcn", "class-variance-authority", "clsx", "cn"],
  },
  { name: "Tailwind CSS", packages: ["tailwindcss", "tw-animate-css"] },
  { name: "Lucide", packages: ["lucide-react"] },
  { name: "wouter", packages: ["wouter", "regexparam"] },
  { name: "Zod", packages: ["zod"] },
  { name: "idb", packages: ["idb"] },
  { name: "jsQR", packages: ["jsqr"] },
  { name: "qrcode", packages: ["qrcode", "dijkstrajs"] },
  { name: "fflate", packages: ["fflate"] },
  { name: "Workbox", prefixes: ["workbox-"] },
];
