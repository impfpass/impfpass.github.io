import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatNotices,
  licenseFileKind,
  packageRootFromId,
  readPackageNotice,
  sortNotices,
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
