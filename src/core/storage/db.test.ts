import { openDB, unwrap } from "idb";
import { DB_NAME, DB_VERSION, openDatabase } from "./db";

const timeout = (ms: number) =>
  new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), ms));

it("gibt die Verbindung frei, wenn eine neuere Version die Datenbank öffnen will", async () => {
  const onVersionChange = vi.fn();
  await openDatabase({ onVersionChange });

  const newer = openDB(DB_NAME, DB_VERSION + 1);
  const result = await Promise.race([newer, timeout(1000)]);

  expect(result).not.toBe("timeout");
  expect(onVersionChange).toHaveBeenCalledTimes(1);
  (await newer).close();
});

it("meldet, wenn der Browser die Verbindung abbricht", async () => {
  const onTerminated = vi.fn();
  const db = await openDatabase({ onTerminated });

  // Der Browser schickt dann "close" an die Verbindung. fake-indexeddb nimmt
  // nur Objekte in der Form seines eigenen FakeEvent an (nicht exportiert).
  const close = {
    type: "close",
    initialized: true,
    dispatched: false,
    bubbles: false,
    eventPath: [],
    NONE: 0,
    CAPTURING_PHASE: 1,
    AT_TARGET: 2,
    BUBBLING_PHASE: 3,
  };
  unwrap(db).dispatchEvent(close as unknown as Event);

  expect(onTerminated).toHaveBeenCalledTimes(1);
});
