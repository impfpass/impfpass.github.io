import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

beforeEach(() => {
  // Jeder Test beginnt mit leerer Datenbank und auf der Startseite.
  globalThis.indexedDB = new IDBFactory();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
});
