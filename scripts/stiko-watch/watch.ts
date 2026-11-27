import { createHash } from "node:crypto";

export interface WatchedPage {
  id: string;
  url: string;
  lineFilter?: RegExp;
  missingIsEmpty?: boolean;
}

export interface PageText {
  id: string;
  url: string;
  hash: string;
  text: string;
}

export interface WatchState {
  pages: PageText[];
}

export interface PageChange {
  id: string;
  url: string;
  added: string[];
  removed: string[];
}

const BASE = "https://www.rki.de/DE";
const STIKO = `${BASE}/Themen/Infektionskrankheiten/Impfen/Staendige-Impfkommission/Empfehlungen-der-STIKO`;

export function watchedPages(year: number): WatchedPage[] {
  return [
    {
      id: "stiko-empfehlungen",
      url: `${STIKO}/Empfehlungen/empfehlungen-node.html`,
    },
    {
      id: "stiko-begruendungen",
      url: `${STIKO}/Begruendungen/begruendungen-node.html`,
    },
    {
      id: "stiko-mitteilungen",
      url: `${STIKO}/Mitteilungen/mitteilungen-node.html`,
    },
    {
      id: `epid-bull-${year}`,
      url: `${BASE}/Aktuelles/Publikationen/Epidemiologisches-Bulletin/${year}/EB-${year}-node.html`,
      lineFilter: /STIKO/i,
      missingIsEmpty: true,
    },
  ];
}

const ENTITIES: Record<string, string> = {
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  shy: "­",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&(lt|gt|quot|apos|nbsp|shy);/g, (_, n: string) => ENTITIES[n])
    .replace(/&amp;/g, "&");
}

export function extractMainText(html: string): string {
  const main = /<main\b[^>]*>([^]*?)<\/main>/i.exec(html);
  const body = /<body\b[^>]*>([^]*?)<\/body>/i.exec(html);
  let s = main ? main[1] : body ? body[1] : html;
  for (const tag of ["script", "style", "nav", "header", "footer", "form", "noscript"]) {
    s = s.replace(new RegExp(`<${tag}\\b[^>]*>[^]*?</${tag}>`, "gi"), "");
  }
  s = s.replace(
    /<a\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([^]*?)<\/a>/gi,
    (all, dq: string | undefined, sq: string | undefined, inner: string) => {
      const href = dq ?? sq ?? "";
      return href.includes(".pdf") ? `${inner} (${href})` : all;
    },
  );
  s = s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-6]|tr|div)>/gi, "\n")
    .replace(/<[^>]*>/g, "");
  s = decodeEntities(s).replace(/­/g, "");
  return s
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line !== "")
    .join("\n");
}

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

const lines = (text: string): string[] => (text === "" ? [] : text.split("\n"));

export function findChanges(state: WatchState, current: PageText[]): PageChange[] {
  const changes: PageChange[] = [];
  for (const page of current) {
    const old = state.pages.find((p) => p.id === page.id);
    if (!old) {
      if (page.text === "") continue;
      changes.push({ id: page.id, url: page.url, added: lines(page.text), removed: [] });
      continue;
    }
    if (old.hash === page.hash) continue;
    const before = lines(old.text);
    const after = lines(page.text);
    const beforeSet = new Set(before);
    const afterSet = new Set(after);
    changes.push({
      id: page.id,
      url: page.url,
      added: after.filter((l) => !beforeSet.has(l)),
      removed: before.filter((l) => !afterSet.has(l)),
    });
  }
  return changes;
}

export function combinedHash(current: PageText[]): string {
  return hashText(current.map((p) => p.hash).join("")).slice(0, 12);
}

export function issueTitle(hash: string): string {
  return `STIKO-Seiten geändert (${hash})`;
}

const MAX_LINES = 40;

export function issueBody(changes: PageChange[]): string {
  const parts = changes.map((c) => {
    const diff = [
      ...c.added.slice(0, MAX_LINES).map((l) => `+ ${l}`),
      ...c.removed.slice(0, MAX_LINES).map((l) => `- ${l}`),
    ];
    return `${c.url}\n\n\`\`\`\n${diff.join("\n")}\n\`\`\``;
  });
  return `${parts.join("\n\n")}\n\nAblauf: siehe Abschnitt „Regeln aktualisieren“ in \`CLAUDE.md\`.\n`;
}
