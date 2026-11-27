import { act, render, waitFor } from "@testing-library/react";
import { openDB } from "idb";
import { DB_NAME, DB_VERSION } from "@/core/storage/db";
import { openRepository, type DatabaseEvents } from "@/core/storage/repository";
import { AppDataProvider, useAppData, type AppData } from "./AppData";

function renderProvider(props: {
  open?: (events?: DatabaseEvents) => ReturnType<typeof openRepository>;
  reload?: () => void;
}) {
  let latest: AppData | null = null;
  function Probe() {
    latest = useAppData();
    return null;
  }
  render(
    <AppDataProvider {...props}>
      <Probe />
    </AppDataProvider>,
  );
  return () => latest!;
}

it("lädt neu, wenn eine neuere Version die Datenbank öffnen will", async () => {
  const reload = vi.fn();
  const data = renderProvider({ reload });
  await waitFor(() => expect(data().status).toBe("ready"));

  const newer = await openDB(DB_NAME, DB_VERSION + 1);
  newer.close();

  expect(reload).toHaveBeenCalledTimes(1);
});

it("verbindet sich nach einem Abbruch der Datenbank neu", async () => {
  let events: DatabaseEvents | undefined;
  const open = vi.fn((e?: DatabaseEvents) => {
    events = e;
    return openRepository(e);
  });
  const data = renderProvider({ open });
  await waitFor(() => expect(data().status).toBe("ready"));

  act(() => events?.onTerminated?.());

  await waitFor(() => expect(open).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(data().status).toBe("ready"));
});
