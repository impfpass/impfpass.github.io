import { Route, Router, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import type { Repository } from "@/core/storage/repository";
import { AppDataProvider, useAppData } from "./data/AppData";
import { ListScreen } from "./list/ListScreen";
import { InfoScreen } from "./settings/InfoScreen";
import { SettingsScreen } from "./settings/SettingsScreen";
import { SetupScreen } from "./setup/SetupScreen";
import { Shell } from "./Shell";
import { StorageError } from "./StorageError";
import { T } from "./texts";

/** Platzhalter, bis die Bildschirme der folgenden Tasks da sind. */
function Placeholder({ title }: { title: string }) {
  return <h1 className="text-2xl font-semibold">{title}</h1>;
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
          <Placeholder title={T.overview.title} />
        </Route>
        <Route path="/impfungen">
          <ListScreen />
        </Route>
        <Route path="/impfungen/neu">
          <Placeholder title={T.entry.addTitle} />
        </Route>
        <Route path="/impfungen/:id/bearbeiten">
          <Placeholder title={T.entry.editTitle} />
        </Route>
        <Route path="/impfungen/:id">
          <Placeholder title={T.entry.detailTitle} />
        </Route>
        <Route path="/einstellungen">
          <SettingsScreen />
        </Route>
        <Route path="/einstellungen/info">
          <InfoScreen />
        </Route>
        <Route>
          <Placeholder title={T.overview.title} />
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
