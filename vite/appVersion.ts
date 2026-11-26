import { readFileSync } from "node:fs";

/** Version aus package.json für `import.meta.env.VITE_APP_VERSION`. */
export function appVersionDefine(): Record<string, string> {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { version: string };
  return { "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version) };
}
