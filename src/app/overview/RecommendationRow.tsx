import {
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Clock,
} from "lucide-react";
import { Link } from "wouter";
import type { Recommendation } from "@/core/rules/types";
import { cn } from "@/lib/utils";
import { T } from "@/texts";
import type { Light } from "./lights";
import { statusText } from "./statusText";

const STYLE = {
  red: {
    Icon: CircleAlert,
    color: "text-red-600 dark:text-red-400",
    border: "border-l-red-600 dark:border-l-red-400",
  },
  yellow: {
    Icon: Clock,
    color: "text-yellow-500 dark:text-yellow-400",
    border: "border-l-yellow-500 dark:border-l-yellow-400",
  },
  green: {
    Icon: CircleCheck,
    color: "text-green-600 dark:text-green-400",
    border: "border-l-green-600 dark:border-l-green-400",
  },
  grey: {
    Icon: CircleDashed,
    color: "text-muted-foreground",
    border: "border-l-muted-foreground",
  },
} as const;

export function RecommendationRow(props: {
  rec: Recommendation;
  light: Light;
}) {
  const { rec, light } = props;
  const { Icon, color, border } = STYLE[light];
  return (
    <li>
      <Link
        href={`/empfehlungen/${rec.id}`}
        data-light={light}
        className={cn(
          "flex min-h-14 items-center gap-3 rounded-md border-l-4 px-3 py-2 hover:bg-accent",
          border,
        )}
      >
        <Icon aria-hidden="true" className={cn("size-6 shrink-0", color)} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">{T.rec.names[rec.id] ?? rec.id}</span>
          <span className="text-muted-foreground">{statusText(rec)}</span>
          {light === "yellow" && rec.timing !== "season" && (
            <span className="text-muted-foreground">
              {T.overview.makeAppointment}
            </span>
          )}
        </span>
        <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
      </Link>
    </li>
  );
}
