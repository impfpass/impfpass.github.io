import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import {
  combinedHash,
  extractMainText,
  findChanges,
  hashText,
  issueBody,
  issueTitle,
  watchedPages,
  type PageText,
  type WatchState,
} from "./watch.ts";

const USER_AGENT =
  "ImpfPass-STIKO-Waechter (+https://github.com/impfpass/impfpass.github.io)";
const PAUSE_MS = 30_000;
const STATE_FILE = new URL("./state.json", import.meta.url);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchAll(): Promise<PageText[]> {
  const result: PageText[] = [];
  const now = new Date();
  const pages = watchedPages(now.getFullYear(), now.getMonth() + 1);
  for (const [i, page] of pages.entries()) {
    if (i > 0) await sleep(PAUSE_MS);
    const res = await fetch(page.url, { headers: { "User-Agent": USER_AGENT } });
    let text = "";
    if (res.status === 404 && page.missingIsEmpty) {
      text = "";
    } else if (res.status !== 200) {
      throw new Error(`${page.url} antwortet mit Status ${res.status}`);
    } else {
      text = extractMainText(await res.text());
      if (page.lineFilter) {
        const filter = page.lineFilter;
        text = text
          .split("\n")
          .filter((l) => filter.test(l))
          .join("\n");
      }
    }
    console.log(`${page.id}: ${text.length} Zeichen`);
    result.push({ id: page.id, url: page.url, hash: hashText(text), text });
  }
  return result;
}

function output(line: string): void {
  const file = process.env.GITHUB_OUTPUT;
  if (file) appendFileSync(file, `${line}\n`);
  else console.log(line);
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  if (mode !== "check" && mode !== "accept") {
    throw new Error("Aufruf: main.ts check|accept");
  }
  const current = await fetchAll();
  if (mode === "accept") {
    const state: WatchState = { pages: current };
    writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
    console.log("state.json geschrieben");
    return;
  }
  const state = JSON.parse(readFileSync(STATE_FILE, "utf8")) as WatchState;
  const changes = findChanges(state, current);
  if (changes.length === 0) {
    output("changed=false");
    return;
  }
  output("changed=true");
  output(`title=${issueTitle(combinedHash(current))}`);
  output(`hash=${combinedHash(current)}`);
  writeFileSync("stiko-watch-issue.md", issueBody(changes));
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
