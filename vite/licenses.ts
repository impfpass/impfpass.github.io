import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import {
  LICENSES_SUMMARY_FILE,
  LICENSES_TEXT_FILE,
  type LicenseSummary,
} from "../src/core/licenses.ts";
import { LICENSE_PROJECTS, type LicenseProject } from "./licenseProjects.ts";

/**
 * Pakete, die im Build-Ergebnis stecken, aber nicht als Modul in einem Chunk
 * auftauchen:
 * - Service Worker: vite-plugin-pwa baut `sw.js` und `workbox-*.js` erst nach
 *   dem Bundle in einem eigenen Lauf, das Plugin sieht diese Module nicht.
 *   Enthalten sind laut `dist/workbox-*.js` core, precaching, routing und
 *   strategies.
 * - CSS: Tailwind, tw-animate-css und shadcn/tailwind.css werden per @import
 *   in das Stylesheet übernommen, nicht als JavaScript-Modul.
 */
export const EXTRA_PACKAGES = [
  "workbox-core",
  "workbox-precaching",
  "workbox-routing",
  "workbox-strategies",
  "tailwindcss",
  "tw-animate-css",
  "shadcn",
] as const;

export type PackageNotice = {
  name: string;
  version: string;
  license: string;
  texts: { file: string; text: string }[];
};

/**
 * Wurzelordner des Pakets, zu dem eine Modul-Kennung gehört, oder null für
 * eigene Dateien und virtuelle Module. Zählt das innerste `node_modules`, damit
 * verschachtelte Pakete und Pakete mit Scope stimmen.
 */
export function packageRootFromId(id: string): string | null {
  const clean = id
    .replace(/^\0/, "")
    .replace(/\?.*$/, "")
    .replaceAll("\\", "/");
  const marker = "/node_modules/";
  const at = clean.lastIndexOf(marker);
  if (at === -1) return null;
  const parts = clean.slice(at + marker.length).split("/");
  const length = parts[0].startsWith("@") ? 2 : 1;
  if (parts.length < length || parts.slice(0, length).some((p) => p === "")) {
    return null;
  }
  return clean.slice(0, at + marker.length) + parts.slice(0, length).join("/");
}

/** Ist der Dateiname eine Lizenz- oder Hinweisdatei (ohne Beachtung der Schreibweise)? */
export function licenseFileKind(name: string): "license" | "notice" | null {
  if (/^(licen[sc]e|copying)([-._].*)?$/i.test(name)) return "license";
  if (/^notice(\..*)?$/i.test(name)) return "notice";
  return null;
}

function licenseField(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "type" in value) {
    return String((value as { type: unknown }).type);
  }
  return "unbekannt";
}

/** Liest package.json und Lizenzdateien eines Pakets, null wenn es fehlt. */
export function readPackageNotice(root: string): PackageNotice | null {
  const manifest = path.join(root, "package.json");
  if (!existsSync(manifest)) return null;
  const pkg = JSON.parse(readFileSync(manifest, "utf-8")) as {
    name?: string;
    version?: string;
    license?: unknown;
    licenses?: unknown;
  };
  const files = readdirSync(root)
    .filter((f) => licenseFileKind(f) !== null)
    .filter((f) => statSync(path.join(root, f)).isFile())
    // Lizenzdateien vor Hinweisdateien, sonst alphabetisch
    .sort((a, b) => {
      const ka = licenseFileKind(a) === "license" ? 0 : 1;
      const kb = licenseFileKind(b) === "license" ? 0 : 1;
      return ka - kb || a.localeCompare(b);
    });
  return {
    name: pkg.name ?? path.basename(root),
    version: pkg.version ?? "",
    license: licenseField(pkg.license ?? pkg.licenses),
    texts: files.map((file) => ({
      file,
      text: readFileSync(path.join(root, file), "utf-8"),
    })),
  };
}

export function sortNotices(notices: PackageNotice[]): PackageNotice[] {
  return [...notices].sort(
    (a, b) =>
      (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) ||
      a.version.localeCompare(b.version, "en", { numeric: true }),
  );
}

const RULE = "=".repeat(72);

/** Der Text der Datei: Kopf, dann je Paket Name, Lizenz und Lizenztexte. */
export function formatNotices(notices: PackageNotice[]): string {
  const blocks = notices.map((n) => {
    const lines = [
      RULE,
      `${n.name} ${n.version}`.trim(),
      `Lizenz: ${n.license}`,
    ];
    if (n.texts.length === 0) {
      lines.push(
        "",
        "Keine Lizenzdatei im Paket. Es gilt die oben genannte Lizenz.",
      );
    }
    for (const t of n.texts) {
      lines.push(
        "",
        `--- ${t.file} ---`,
        t.text.replaceAll("\r\n", "\n").trim(),
      );
    }
    return lines.join("\n");
  });
  const head = [
    "Lizenztexte der Software von Dritten in ImpfPass",
    "Diese Datei wird beim Build aus den Paketen erzeugt, die im Ergebnis stecken.",
  ].join("\n");
  return `${head}\n\n${blocks.join("\n\n")}\n`;
}

/** Alle Projekte, zu denen ein Paketname gehört. */
export function projectsOf(
  name: string,
  projects: LicenseProject[],
): LicenseProject[] {
  return projects.filter(
    (p) =>
      (p.packages ?? []).includes(name) ||
      (p.prefixes ?? []).some((prefix) => name.startsWith(prefix)),
  );
}

/**
 * Fasst die Pakete zu Projekten zusammen. Wirft einen Fehler, der jedes
 * Problem in einer eigenen Zeile nennt: Paket ohne Projekt, Paket in mehreren
 * Projekten, Projekt ohne Paket im Build.
 */
export function summarizeNotices(
  notices: PackageNotice[],
  projects: LicenseProject[],
): LicenseSummary {
  const problems: string[] = [];
  const licenses = new Map<LicenseProject, Set<string>>(
    projects.map((p) => [p, new Set<string>()]),
  );
  const used = new Set<LicenseProject>();
  // Ein Paket in mehreren Versionen wird nur einmal gemeldet.
  const reported = new Set<string>();
  for (const n of notices) {
    const found = projectsOf(n.name, projects);
    for (const p of found) used.add(p);
    if (found.length === 1) {
      licenses.get(found[0])!.add(n.license);
      continue;
    }
    if (reported.has(n.name)) continue;
    reported.add(n.name);
    problems.push(
      found.length === 0
        ? `Paket ohne Projekt in der Lizenzübersicht: ${n.name}`
        : `Paket in mehreren Projekten der Lizenzübersicht: ${n.name} (${found.map((p) => p.name).join(", ")})`,
    );
  }
  for (const p of projects) {
    if (!used.has(p)) problems.push(`Projekt ohne Paket im Build: ${p.name}`);
  }
  if (problems.length > 0) throw new Error(problems.join("\n"));
  return {
    packages: notices.length,
    projects: projects
      .map((p) => ({ name: p.name, licenses: [...licenses.get(p)!].sort() }))
      .sort((a, b) => a.name.localeCompare(b.name, "de")),
  };
}

/**
 * Erzeugt beim Build `third-party-licenses.txt` aus den Paketen, deren Module
 * in einem Chunk stecken, plus EXTRA_PACKAGES, und daraus die Übersicht
 * `third-party-licenses.json` nach LICENSE_PROJECTS.
 */
export function licensesPlugin(): Plugin {
  let root = process.cwd();
  return {
    name: "impfpass-licenses",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    generateBundle(_options, bundle) {
      const roots = new Set<string>();
      for (const item of Object.values(bundle)) {
        if (item.type !== "chunk") continue;
        for (const id of Object.keys(item.modules)) {
          const pkgRoot = packageRootFromId(id);
          if (pkgRoot) roots.add(pkgRoot);
        }
      }
      for (const name of EXTRA_PACKAGES) {
        roots.add(path.join(root, "node_modules", name).replaceAll("\\", "/"));
      }
      const notices: PackageNotice[] = [];
      for (const dir of roots) {
        const notice = readPackageNotice(dir);
        if (!notice) {
          this.error(`Paket ohne package.json im Build: ${dir}`);
        }
        notices.push(notice);
      }
      const sorted = sortNotices(notices);
      let summary: LicenseSummary;
      try {
        summary = summarizeNotices(sorted, LICENSE_PROJECTS);
      } catch (e) {
        this.error(
          `vite/licenseProjects.ts passt nicht zu den Paketen im Build:\n${(e as Error).message}`,
        );
      }
      this.emitFile({
        type: "asset",
        fileName: LICENSES_TEXT_FILE,
        source: formatNotices(sorted),
      });
      this.emitFile({
        type: "asset",
        fileName: LICENSES_SUMMARY_FILE,
        source: `${JSON.stringify(summary, null, 2)}\n`,
      });
    },
  };
}
