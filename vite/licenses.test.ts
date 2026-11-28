import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LICENSE_PROJECTS, type LicenseProject } from "./licenseProjects";
import {
  addFallbackTexts,
  EXTRA_PACKAGES,
  formatNotices,
  licenseFileKind,
  licensesPlugin,
  noticesWithoutText,
  type PackageNotice,
  packageRootFromId,
  projectsOf,
  readPackageNotice,
  sortNotices,
  summarizeNotices,
  unexplainedLicenses,
} from "./licenses";

describe("packageRootFromId", () => {
  it("findet die Wurzel eines einfachen Pakets", () => {
    expect(
      packageRootFromId("/app/node_modules/react/cjs/react.production.js"),
    ).toBe("/app/node_modules/react");
  });

  it("nimmt bei Paketen mit Scope zwei Pfadteile", () => {
    expect(
      packageRootFromId("/app/node_modules/@radix-ui/react-dialog/dist/x.mjs"),
    ).toBe("/app/node_modules/@radix-ui/react-dialog");
  });

  it("nimmt bei verschachtelten node_modules das innerste Paket", () => {
    expect(
      packageRootFromId("/app/node_modules/a/node_modules/b/lib/index.js"),
    ).toBe("/app/node_modules/a/node_modules/b");
    expect(
      packageRootFromId("/app/node_modules/a/node_modules/@s/b/index.js"),
    ).toBe("/app/node_modules/a/node_modules/@s/b");
  });

  it("versteht Windows-Pfade, Abfragen und Rollup-Präfixe", () => {
    expect(
      packageRootFromId(
        String.raw`C:\Dev\app\node_modules\zod\v4\index.js?x=1`,
      ),
    ).toBe("C:/Dev/app/node_modules/zod");
    expect(packageRootFromId("\0/app/node_modules/idb/build/index.js")).toBe(
      "/app/node_modules/idb",
    );
  });

  it("gibt für eigene Dateien und virtuelle Module null zurück", () => {
    expect(packageRootFromId("/app/src/main.tsx")).toBeNull();
    expect(packageRootFromId("\0vite/preload-helper.js")).toBeNull();
    expect(packageRootFromId("/app/node_modules/")).toBeNull();
    expect(packageRootFromId("/app/node_modules/@scope")).toBeNull();
  });
});

describe("licenseFileKind", () => {
  it.each([
    "LICENSE",
    "license",
    "LICENSE.md",
    "License.txt",
    "LICENCE",
    "LICENCE.MIT",
    "LICENSE-MIT",
    "LICENSE.APACHE2",
    "COPYING",
    "COPYING.LESSER",
  ])("%s ist eine Lizenzdatei", (name) => {
    expect(licenseFileKind(name)).toBe("license");
  });

  it.each(["NOTICE", "notice.txt", "NOTICE.md"])(
    "%s ist eine Hinweisdatei",
    (name) => {
      expect(licenseFileKind(name)).toBe("notice");
    },
  );

  it.each([
    "package.json",
    "README.md",
    "licenses.json",
    "licensed.js",
    "noticeboard.js",
    "index.js",
  ])("%s ist keins von beiden", (name) => {
    expect(licenseFileKind(name)).toBeNull();
  });
});

describe("formatNotices", () => {
  const mit = {
    name: "alpha",
    version: "1.0.0",
    license: "MIT",
    texts: [{ file: "LICENSE", text: "MIT text\n" }],
  };

  it("schreibt Name, Version, Lizenz und Text je Paket", () => {
    const out = formatNotices([mit]);
    expect(out).toContain("alpha 1.0.0");
    expect(out).toContain("Lizenz: MIT");
    expect(out).toContain("MIT text");
  });

  it("nennt bei mehreren Dateien jeden Dateinamen", () => {
    const out = formatNotices([
      {
        ...mit,
        texts: [
          { file: "LICENSE", text: "L" },
          { file: "NOTICE", text: "N" },
        ],
      },
    ]);
    expect(out).toContain("LICENSE");
    expect(out).toContain("NOTICE");
  });

  it("vermerkt ein Paket ohne Lizenzdatei mit seiner Lizenzangabe", () => {
    const out = formatNotices([{ ...mit, name: "beta", texts: [] }]);
    expect(out).toMatch(/beta 1\.0\.0/);
    expect(out).toMatch(/Keine Lizenzdatei im Paket/);
    expect(out).toContain("Lizenz: MIT");
  });

  it("endet mit genau einem Zeilenumbruch und nutzt nur LF", () => {
    const out = formatNotices([mit]);
    expect(out.endsWith("\n")).toBe(true);
    expect(out.endsWith("\n\n")).toBe(false);
    expect(out).not.toContain("\r");
  });

  it("wandelt CRLF in den Lizenztexten in LF", () => {
    const out = formatNotices([
      { ...mit, texts: [{ file: "LICENSE", text: "a\r\nb\r\n" }] },
    ]);
    expect(out).not.toContain("\r");
  });
});

describe("sortNotices", () => {
  it("sortiert nach Name, dann Version", () => {
    const n = (name: string, version: string) => ({
      name,
      version,
      license: "MIT",
      texts: [],
    });
    expect(
      sortNotices([n("b", "1"), n("@x/a", "2"), n("a", "2"), n("a", "1")]).map(
        (p) => `${p.name}@${p.version}`,
      ),
    ).toEqual(["@x/a@2", "a@1", "a@2", "b@1"]);
  });
});

describe("readPackageNotice", () => {
  it("liest Name, Version, Lizenz und Lizenztext aus node_modules", () => {
    const notice = readPackageNotice(path.resolve("node_modules/idb"));
    expect(notice?.name).toBe("idb");
    expect(notice?.license).toBe("ISC");
    expect(notice?.texts.length).toBeGreaterThan(0);
    expect(notice?.texts[0].text).toMatch(/ISC|Permission/i);
  });

  it("gibt null zurück, wenn es das Paket nicht gibt", () => {
    expect(readPackageNotice(path.resolve("node_modules/gibt-es-nicht"))).toBe(
      null,
    );
  });
});

const notice = (
  name: string,
  license = "MIT",
  version = "1.0.0",
): PackageNotice => ({ name, version, license, texts: [] });
const PROJECTS: LicenseProject[] = [
  { name: "React", packages: ["react", "react-dom"] },
  { name: "Radix UI", packages: ["tslib"], prefixes: ["@radix-ui/"] },
];

describe("summarizeNotices", () => {
  it("fasst Pakete zu Projekten zusammen und sammelt deren Lizenzen", () => {
    expect(
      summarizeNotices(
        [
          notice("react"),
          notice("react-dom"),
          notice("@radix-ui/react-dialog"),
          notice("tslib", "0BSD"),
        ],
        PROJECTS,
      ),
    ).toEqual({
      packages: 4,
      projects: [
        { name: "Radix UI", licenses: ["0BSD", "MIT"] },
        { name: "React", licenses: ["MIT"] },
      ],
    });
  });

  it("zählt ein Paket in zwei Versionen doppelt, ohne es als doppelt zugeordnet zu melden", () => {
    const summary = summarizeNotices(
      [
        notice("react", "MIT", "18.3.1"),
        notice("react", "MIT", "19.0.0"),
        notice("tslib", "0BSD"),
      ],
      PROJECTS,
    );
    expect(summary.packages).toBe(3);
  });

  it("meldet ein Paket ohne Projekt", () => {
    expect(() =>
      summarizeNotices(
        [notice("react"), notice("tslib"), notice("zod")],
        PROJECTS,
      ),
    ).toThrow("Paket ohne Projekt in der Lizenzübersicht: zod");
  });

  it("meldet ein Paket ohne Projekt in zwei Versionen nur einmal", () => {
    expect(() =>
      summarizeNotices(
        [
          notice("react"),
          notice("tslib"),
          notice("zod", "MIT", "3.25.0"),
          notice("zod", "MIT", "4.0.0"),
        ],
        PROJECTS,
      ),
    ).toThrow(/^Paket ohne Projekt in der Lizenzübersicht: zod$/);
  });

  it("meldet ein Paket in mehreren Projekten", () => {
    const projects = [
      { name: "A", packages: ["x"] },
      { name: "B", prefixes: ["x"] },
    ];
    expect(() => summarizeNotices([notice("x")], projects)).toThrow(
      "Paket in mehreren Projekten der Lizenzübersicht: x (A, B)",
    );
  });

  it("meldet ein Projekt ohne Paket im Build", () => {
    expect(() => summarizeNotices([notice("react")], PROJECTS)).toThrow(
      "Projekt ohne Paket im Build: Radix UI",
    );
  });

  it("nennt alle Probleme auf einmal, je eines pro Zeile", () => {
    expect(() => summarizeNotices([notice("zod")], PROJECTS)).toThrow(
      /Paket ohne Projekt in der Lizenzübersicht: zod\n(.|\n)*Projekt ohne Paket im Build: R/,
    );
  });
});

describe("Pakete ohne Lizenzdatei", () => {
  it("bekommen den Lizenztext aus vite/license-fallbacks, falls es einen gibt", () => {
    const [bar, own] = addFallbackTexts(
      [
        notice("react-remove-scroll-bar"),
        {
          ...notice("react"),
          texts: [{ file: "LICENSE", text: "eigener Text" }],
        },
      ],
      path.resolve("vite/license-fallbacks"),
    );
    expect(bar.texts).toHaveLength(1);
    expect(bar.texts[0].file).toBe("LICENSE (aus dem Repository des Pakets)");
    expect(bar.texts[0].text).toMatch(/Copyright \(c\) .*Anton Korzunov/);
    expect(own.texts).toEqual([{ file: "LICENSE", text: "eigener Text" }]);
  });

  it("ohne Lizenztext werden gemeldet, außer ihre Lizenz verlangt keinen", () => {
    expect(
      noticesWithoutText([
        notice("ohne", "MIT"),
        notice("frei", "Unlicense"),
        notice("null", "0BSD"),
        { ...notice("mit"), texts: [{ file: "LICENSE", text: "MIT" }] },
      ]),
    ).toEqual(["ohne 1.0.0 (MIT)"]);
  });

  it("die Lizenztexte in vite/license-fallbacks sind noch nötig", () => {
    // Bringt ein Paket inzwischen selbst eine Lizenzdatei mit, kann der
    // Ersatz weg.
    for (const file of readdirSync("vite/license-fallbacks")) {
      const name = file.replace(/\.txt$/, "").replace("__", "/");
      const own = readPackageNotice(path.resolve("node_modules", name));
      expect(own, `${name} ist nicht mehr installiert`).not.toBeNull();
      expect(own!.texts, `${name} bringt jetzt eine Lizenzdatei mit`).toEqual(
        [],
      );
    }
  });
});

describe("unexplainedLicenses", () => {
  it("ist leer, wenn jede vorkommende Lizenz erklärt ist", () => {
    const summary = {
      packages: 2,
      projects: [{ name: "React", licenses: ["MIT"] }],
    };
    expect(unexplainedLicenses(summary, ["MIT", "ISC"])).toEqual([]);
  });

  it("nennt jede Lizenz ohne Erklärung einmal, sortiert", () => {
    const summary = {
      packages: 3,
      projects: [
        { name: "A", licenses: ["MIT", "WTFPL"] },
        { name: "B", licenses: ["GPL-3.0", "WTFPL"] },
      ],
    };
    expect(unexplainedLicenses(summary, ["MIT"])).toEqual(["GPL-3.0", "WTFPL"]);
  });
});

/**
 * Lässt das Plugin auf einem nachgebauten Bundle laufen, dessen Module in den
 * echten Paketen unter node_modules liegen, und gibt die ausgegebenen Dateien
 * zurück.
 */
function runPlugin(packages: string[]): Map<string, string> {
  const plugin = licensesPlugin();
  const emitted = new Map<string, string>();
  const context = {
    emitFile(file: { fileName: string; source: string }) {
      emitted.set(file.fileName, file.source);
      return file.fileName;
    },
    error(message: string): never {
      throw new Error(message);
    },
  };
  const modules = Object.fromEntries(
    packages.map((name) => [
      path.resolve("node_modules", name, "index.js"),
      {},
    ]),
  );
  (plugin.configResolved as (config: { root: string }) => void)({
    root: process.cwd(),
  });
  (
    plugin.generateBundle as (
      this: typeof context,
      options: unknown,
      bundle: unknown,
    ) => void
  ).call(context, {}, { "main.js": { type: "chunk", modules } });
  return emitted;
}

// Je ein Paket für jedes Projekt, das nicht schon über EXTRA_PACKAGES kommt.
const ONE_PER_PROJECT = [
  "react",
  "@radix-ui/react-dialog",
  "lucide-react",
  "wouter",
  "zod",
  "idb",
  "jsqr",
  "qrcode",
  "fflate",
  // MIT ohne eigene Lizenzdatei
  "react-remove-scroll-bar",
];

describe("licensesPlugin", () => {
  it("legt Lizenztexte und Übersicht als Dateien ab", () => {
    const emitted = runPlugin(ONE_PER_PROJECT);
    expect(emitted.get("third-party-licenses.txt")).toMatch(/^react \d/m);
    // Ohne eigene Lizenzdatei, Text aus vite/license-fallbacks.
    expect(emitted.get("third-party-licenses.txt")).toMatch(
      /^react-remove-scroll-bar \d[^=]*Anton Korzunov/m,
    );
    const json = emitted.get("third-party-licenses.json")!;
    expect(json.endsWith("}\n")).toBe(true);
    const summary = JSON.parse(json) as {
      packages: number;
      projects: { name: string; licenses: string[] }[];
    };
    expect(summary.packages).toBe(
      ONE_PER_PROJECT.length + EXTRA_PACKAGES.length,
    );
    expect(summary.projects.map((p) => p.name)).toEqual([
      "fflate",
      "idb",
      "jsQR",
      "Lucide",
      "qrcode",
      "Radix UI",
      "React",
      "shadcn/ui",
      "Tailwind CSS",
      "Workbox",
      "wouter",
      "Zod",
    ]);
    expect(summary.projects).toContainEqual({
      name: "jsQR",
      licenses: ["Apache-2.0"],
    });
  });

  it("bricht ab, wenn die Projektliste nicht zum Build passt, und nennt die Datei", () => {
    expect(() =>
      runPlugin(ONE_PER_PROJECT.filter((name) => name !== "zod")),
    ).toThrow(
      "vite/licenseProjects.ts passt nicht zu den Paketen im Build:\nProjekt ohne Paket im Build: Zod",
    );
  });
});

/** Alle Quelldateien unter src/ (ohne Tests, die importieren Hilfspakete). */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry) ? [full] : [];
  });
}

function packageName(specifier: string): string | null {
  if (specifier.startsWith(".") || specifier.startsWith("@/")) return null;
  if (specifier.startsWith("node:")) return null;
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

describe("Abhängigkeiten", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf-8")) as {
    dependencies: Record<string, string>;
  };
  const dependencies = Object.keys(pkg.dependencies);
  const used = new Set<string>();
  for (const file of sourceFiles("src")) {
    if (/\.test\.tsx?$/.test(file)) continue;
    const source = readFileSync(file, "utf-8");
    for (const m of source.matchAll(/from\s+["']([^"']+)["']/g)) {
      const name = packageName(m[1]);
      if (name) used.add(name);
    }
  }

  it("jedes Paket aus dependencies und EXTRA_PACKAGES gehört zu genau einem Projekt", () => {
    for (const name of [...dependencies, ...EXTRA_PACKAGES]) {
      expect(
        projectsOf(name, LICENSE_PROJECTS).map((p) => p.name),
        name,
      ).toHaveLength(1);
    }
  });

  it("die Suche nach importierten Paketen findet die bekannten", () => {
    expect([...used]).toEqual(
      expect.arrayContaining(["react", "zod", "jsqr", "qrcode"]),
    );
  });

  // Pakete ohne Lizenzdatei, bewusst hingenommen. wouter steht unter der
  // Unlicense (gemeinfrei), die einen Hinweis nicht verlangt; die Datei nennt
  // dann die Lizenzangabe aus package.json. Neue Einträge nur nach Prüfung.
  const WITHOUT_LICENSE_FILE = ["wouter"];

  it("die Ausnahmen ohne Lizenzdatei sind noch nötig", () => {
    for (const name of WITHOUT_LICENSE_FILE) {
      const notice = readPackageNotice(path.resolve("node_modules", name));
      expect(
        notice?.texts,
        `${name} bringt jetzt eine Lizenzdatei mit`,
      ).toEqual([]);
    }
  });

  it("jedes in src/ importierte Paket aus dependencies hat einen Lizenztext", () => {
    // Schlägt fehl, wenn eine neue Abhängigkeit keine Lizenzdatei mitbringt:
    // dann prüfen, ob ihre Lizenz einen Text verlangt.
    const missing = dependencies
      .filter((name) => used.has(name))
      .filter((name) => !WITHOUT_LICENSE_FILE.includes(name))
      .filter((name) => {
        const dir = path.resolve("node_modules", name);
        if (!existsSync(dir)) return true;
        const notice = readPackageNotice(dir);
        return !notice || notice.texts.every((t) => t.text.trim() === "");
      });
    expect(missing).toEqual([]);
  });
});
