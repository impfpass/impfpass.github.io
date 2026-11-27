import fixture from "@/test/fixtures/chatbot-answer.txt?raw";
import { T } from "@/texts";
import { ChatbotAnswerError, parseChatbotAnswer } from "./chatbot";

const ROW = {
  date: "05.12.2016",
  name: "Boostrix Polio",
  batch: "AC52B123AB",
  doctor: "Praxis Dr. Muster, Hamburg",
  diseases: [],
  unsure: [],
};
const CLEAN = JSON.stringify({ impfpass: "import", vaccinations: [ROW] });
const EXPECTED = {
  date: "05.12.2016",
  label: "Boostrix Polio",
  batch: "AC52B123AB",
  doctor: "Praxis Dr. Muster, Hamburg",
  diseases: [],
  unsure: [],
  hints: [],
};

function one(vaccination: object) {
  return parseChatbotAnswer(JSON.stringify({ vaccinations: [vaccination] }));
}

function errorOf(fn: () => unknown): ChatbotAnswerError {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ChatbotAnswerError);
    return e as ChatbotAnswerError;
  }
  throw new Error("expected ChatbotAnswerError");
}

describe("parseChatbotAnswer", () => {
  it("reads clean JSON and maps name to label", () => {
    expect(parseChatbotAnswer(CLEAN)).toEqual([EXPECTED]);
  });

  it("reads a code block with text around it", () => {
    const text = `Hier ist die Liste:\n\`\`\`json\n${CLEAN}\n\`\`\`\nViel Erfolg {mit} dem Rest.`;
    expect(parseChatbotAnswer(text)).toEqual([EXPECTED]);
  });

  it("reads the second block when the first has no vaccinations", () => {
    const text = `\`\`\`json\n{"hinweis":"x"}\n\`\`\`\n\`\`\`json\n${CLEAN}\n\`\`\``;
    expect(parseChatbotAnswer(text)).toEqual([EXPECTED]);
  });

  it("accepts a bare array and an object without the marker", () => {
    expect(parseChatbotAnswer(JSON.stringify([ROW]))).toEqual([EXPECTED]);
    expect(parseChatbotAnswer(JSON.stringify({ vaccinations: [ROW] }))).toEqual(
      [EXPECTED],
    );
  });

  it("skips bare arrays without entries before the real block", () => {
    const text = `Beispiel ["date"] [1] und [] dazu.
\`\`\`json
${CLEAN}
\`\`\``;
    expect(parseChatbotAnswer(text)).toEqual([EXPECTED]);
  });

  it("ignores braces inside strings", () => {
    const row = { ...ROW, doctor: "Praxis } {[ Muster" };
    const text = `Antwort: ${JSON.stringify({ vaccinations: [row] })} Ende`;
    expect(parseChatbotAnswer(text)[0]?.doctor).toBe("Praxis } {[ Muster");
  });

  it("maps unsure names and drops unknown fields and duplicates", () => {
    const [row] = one({ ...ROW, unsure: ["name", "date", "foo", "date"] });
    expect(row?.unsure).toEqual(["label", "date"]);
  });

  it("ignores names of Object.prototype in unsure", () => {
    const [row] = parseChatbotAnswer(
      `{"vaccinations":[{"date":"05.12.2016","name":"Boostrix Polio","unsure":["constructor","toString","__proto__","date"]}]}`,
    );
    expect(row?.unsure).toEqual(["date"]);
  });

  it("recognizes diseases, dedupes and flags unknown ones", () => {
    const [row] = one({
      ...ROW,
      name: "",
      diseases: ["Tetanus", "Wundstarrkrampf", "Tine-Test"],
    });
    expect(row?.diseases).toEqual(["tetanus"]);
    expect(row?.unsure).toContain("diseases");
    expect(row?.hints).toContain("Krankheit „Tine-Test“ nicht erkannt.");
  });

  it("orders diseases like DISEASE_IDS", () => {
    const [a] = one({ ...ROW, diseases: ["Diphtherie", "Tetanus"] });
    const [b] = one({ ...ROW, diseases: ["Tetanus", "Diphtherie"] });
    expect(a?.diseases).toEqual(b?.diseases);
  });

  it("turns numbers into text and drops empty entries", () => {
    const rows = parseChatbotAnswer(
      JSON.stringify({
        vaccinations: [
          { date: 2016, name: "Priorix", batch: 123, doctor: null },
          { date: "", name: "", batch: "", doctor: "", diseases: [] },
          {},
        ],
      }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      date: "2016",
      label: "Priorix",
      batch: "123",
      doctor: "",
    });
  });

  it("throws noJson for text without JSON", () => {
    const e = errorOf(() => parseChatbotAnswer("Leider nein."));
    expect(e.code).toBe("noJson");
    expect(e.message).toBe(T.pc.chatbotErrors.noJson);
  });

  it("throws noEntries for an empty list", () => {
    const e = errorOf(() => parseChatbotAnswer('{"vaccinations":[]}'));
    expect(e.code).toBe("noEntries");
    expect(e.message).toBe(T.pc.chatbotErrors.noEntries);
  });

  it("throws tooLong above 1 000 000 characters", () => {
    const e = errorOf(() => parseChatbotAnswer("x".repeat(1_000_001)));
    expect(e.code).toBe("tooLong");
    expect(e.message).toBe(T.pc.chatbotErrors.tooLong);
  });

  it("parses the example from the instructions as one row", () => {
    const line = T.pc.prompt
      .split("\n")
      .find((l) => l.startsWith('{"impfpass"'));
    expect(line).toBeDefined();
    expect(parseChatbotAnswer(line ?? "")).toEqual([EXPECTED]);
  });

  it("parses the fixture into twelve rows", () => {
    const rows = parseChatbotAnswer(fixture);
    expect(rows).toHaveLength(12);
    expect(rows.some((r) => r.label === "Bostrix Polio")).toBe(true);
    expect(rows.find((r) => r.label === "")?.diseases).toEqual([
      "tetanus",
      "diphtheria",
    ]);
    expect(rows.filter((r) => r.unsure.includes("date"))).toHaveLength(1);
  });
});
