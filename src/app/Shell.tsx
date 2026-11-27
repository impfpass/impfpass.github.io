import type { ReactNode } from "react";
import { House, List, Plus, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { T } from "@/texts";

const ITEMS = [
  {
    href: "/",
    label: T.nav.overview,
    icon: House,
    match: (p: string) => p === "/",
  },
  {
    href: "/impfungen",
    label: T.nav.list,
    icon: List,
    match: (p: string) => p.startsWith("/impfungen") && p !== "/impfungen/neu",
  },
  {
    href: "/impfungen/neu",
    label: T.nav.add,
    icon: Plus,
    match: (p: string) => p === "/impfungen/neu",
  },
  {
    href: "/einstellungen",
    label: T.nav.settings,
    icon: Settings,
    match: (p: string) => p.startsWith("/einstellungen"),
  },
];

/**
 * Rahmen mit Kopf und unterer Navigation. `onReselect` meldet das Antippen
 * des Tabs, der schon gewählt ist.
 */
export function Shell({
  children,
  onReselect,
}: {
  children: ReactNode;
  onReselect?: (href: string) => void;
}) {
  const [location] = useLocation();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b px-4 pt-[env(safe-area-inset-top)]">
        <p className="mx-auto max-w-xl py-2 font-semibold">{T.app.name}</p>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-28">
        {children}
      </main>
      <nav
        aria-label={T.nav.label}
        className="fixed inset-x-0 bottom-0 border-t bg-background pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-4">
          {ITEMS.map(({ href, label, icon: Icon, match }) => {
            const active = match(location);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    if (active) onReselect?.(href);
                  }}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-sm",
                    active
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon aria-hidden="true" className="size-6" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
