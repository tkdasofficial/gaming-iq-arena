import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaticPage } from "@/components/giq/StaticPage";

export const Route = createFileRoute("/upgrade")({
  head: () => ({
    meta: [
      { title: "Upgrade Plan — Gaming IQ" },
      { name: "description", content: "See your Gaming IQ plan and what's coming next for device-specific sensitivity." },
      { property: "og:title", content: "Upgrade Plan — Gaming IQ" },
      { property: "og:description", content: "See your Gaming IQ plan and what's coming next for device-specific sensitivity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UpgradePage,
});

const FREE_FEATURES = [
  "Sensitivity for Free Fire, BGMI and PUBG Mobile",
  "Built from your phone's verified specs",
  "Save results to your history",
  "Copy every value in one tap",
];

function UpgradePage() {
  return (
    <StaticPage eyebrow="Plans" title="Upgrade Plan" subtitle="Everything in Gaming IQ is free right now.">
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="surface rounded-xl p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold tracking-tight">Free</h2>
            <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Current plan</span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-foreground" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-dashed border-border p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold tracking-tight">Pro</h2>
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Clock className="size-3" /> Coming soon
            </span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Paid plans aren't available yet. Keep using every feature for free in the meantime.
          </p>
        </section>
      </div>

      <Button asChild className="w-full sm:w-auto">
        <Link to="/">Back to generator</Link>
      </Button>
    </StaticPage>
  );
}
