import { useState } from "react";
import { Route, Router, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import type { Repository } from "@/core/storage/repository";
import { AppDataProvider, useAppData } from "./data/AppData";
import { EntryDetail } from "./entry/EntryDetail";
import { EntryForm } from "./entry/EntryForm";
import { ListScreen } from "./list/ListScreen";
import { OverviewScreen } from "./overview/OverviewScreen";
import { RecommendationDetail } from "./recommendation/RecommendationDetail";
import { InfoScreen } from "./settings/InfoScreen";
import { LicensesScreen } from "./settings/LicensesScreen";
import { LicenseTextsScreen } from "./settings/LicenseTextsScreen";
import { SettingsScreen } from "./settings/SettingsScreen";
import { SetupScreen } from "./setup/SetupScreen";
import { Shell } from "./Shell";
import { StorageError } from "./StorageError";
import { TransferScreen } from "./transfer/TransferScreen";
import { T } from "@/texts";

/**
 * Formular für eine neue Impfung. `reselect` zählt, wie oft der Tab
 * „Neue Impfung“ erneut angetippt wurde: Nach dem Speichern öffnet das ein
 * leeres Formular, während der Eingabe bleibt alles stehen.
 */
function NewEntry({ reselect }: { reselect: number }) {
  // Neuer Schlüssel = leeres Formular für die nächste Impfung
  const [round, setRound] = useState(0);
  const [saved, setSaved] = useState(false);
  const [seenReselect, setSeenReselect] = useState(reselect);
  const next = () => {
    setRound((n) => n + 1);
    setSaved(false);
  };
  if (reselect !== seenReselect) {
    setSeenReselect(reselect);
    if (saved) next();
  }
  return (
    <EntryForm key={round} onAddAnother={next} onSaved={() => setSaved(true)} />
  );
}

function EditEntry({ id }: { id: string }) {
  const { vaccinations } = useAppData();
  const existing = vaccinations.find((v) => v.id === id);
  if (!existing) return <EntryDetail id={id} />;
  return <EntryForm key={id} existing={existing} />;
}

function Screens() {
  const { status, person } = useAppData();
  const [reselectNew, setReselectNew] = useState(0);

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
    <Shell
      onReselect={(href) => {
        if (href === "/impfungen/neu") setReselectNew((n) => n + 1);
      }}
    >
      <Switch>
        <Route path="/">
          <OverviewScreen />
        </Route>
        <Route path="/impfungen">
          <ListScreen />
        </Route>
        <Route path="/impfungen/neu">
          <NewEntry reselect={reselectNew} />
        </Route>
        <Route path="/impfungen/:id/bearbeiten">
          {(params) => <EditEntry id={params.id} />}
        </Route>
        <Route path="/impfungen/:id">
          {(params) => <EntryDetail key={params.id} id={params.id} />}
        </Route>
        <Route path="/empfehlungen/:id">
          {(params) => <RecommendationDetail key={params.id} id={params.id} />}
        </Route>
        <Route path="/einstellungen">
          <SettingsScreen />
        </Route>
        <Route path="/einstellungen/info">
          <InfoScreen />
        </Route>
        <Route path="/einstellungen/info/lizenzen">
          <LicensesScreen />
        </Route>
        <Route path="/einstellungen/info/lizenzen/texte">
          <LicenseTextsScreen />
        </Route>
        <Route path="/uebernehmen">
          <TransferScreen />
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
