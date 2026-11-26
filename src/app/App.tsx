import { useState } from "react";
import { Route, Router, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import type { Repository } from "@/core/storage/repository";
import { AppDataProvider, useAppData } from "./data/AppData";
import { EntryDetail } from "./entry/EntryDetail";
import { EntryForm } from "./entry/EntryForm";
import { ListScreen } from "./list/ListScreen";
import { OverviewScreen } from "./overview/OverviewScreen";
import { InfoScreen } from "./settings/InfoScreen";
import { SettingsScreen } from "./settings/SettingsScreen";
import { SetupScreen } from "./setup/SetupScreen";
import { Shell } from "./Shell";
import { StorageError } from "./StorageError";
import { T } from "./texts";

function NewEntry() {
  // Neuer Schlüssel = leeres Formular für die nächste Impfung
  const [round, setRound] = useState(0);
  return <EntryForm key={round} onAddAnother={() => setRound((n) => n + 1)} />;
}

function EditEntry({ id }: { id: string }) {
  const { vaccinations } = useAppData();
  const existing = vaccinations.find((v) => v.id === id);
  if (!existing) return <EntryDetail id={id} />;
  return <EntryForm key={id} existing={existing} />;
}

function Screens() {
  const { status, person } = useAppData();

  if (status === "loading") {
    return (
      <p className="p-6 text-muted-foreground" role="status">
        {T.app.loading}
      </p>
    );
  }
  if (status === "unavailable") return <StorageError />;
  if (!person) return <SetupScreen />;

  return (
    <Shell>
      <Switch>
        <Route path="/">
          <OverviewScreen />
        </Route>
        <Route path="/impfungen">
          <ListScreen />
        </Route>
        <Route path="/impfungen/neu">
          <NewEntry />
        </Route>
        <Route path="/impfungen/:id/bearbeiten">
          {(params) => <EditEntry id={params.id} />}
        </Route>
        <Route path="/impfungen/:id">
          {(params) => <EntryDetail key={params.id} id={params.id} />}
        </Route>
        <Route path="/einstellungen">
          <SettingsScreen />
        </Route>
        <Route path="/einstellungen/info">
          <InfoScreen />
        </Route>
        <Route>
          <OverviewScreen />
        </Route>
      </Switch>
    </Shell>
  );
}

export function App({ open }: { open?: () => Promise<Repository> }) {
  return (
    <AppDataProvider open={open}>
      <Router hook={useHashLocation}>
        <Screens />
      </Router>
    </AppDataProvider>
  );
}
