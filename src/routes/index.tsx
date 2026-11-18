import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Crosshair } from "lucide-react";

// The app shell reads the signed-in session from browser storage, so it loads after hydration.
const GamingIQRoot = lazy(() => import("@/components/GamingIQRoot"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gaming IQ — Perfect Sensitivity Calibrator" },
      {
        name: "description",
        content:
          "Get the optimal device-tuned sensitivity settings for Garena Free Fire and Krafton PUBG / BGMI.",
      },
      { property: "og:title", content: "Gaming IQ — Perfect Sensitivity Calibrator" },
      {
        property: "og:description",
        content:
          "Get the optimal device-tuned sensitivity settings for Garena Free Fire and Krafton PUBG / BGMI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background">
      <span className="relative grid size-14 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
        <span className="absolute inset-0 animate-ping-slow rounded-2xl bg-primary/40" />
        <Crosshair className="relative size-7 text-primary-foreground" strokeWidth={2.5} />
      </span>
      <span className="font-display text-2xl font-extrabold tracking-tight text-foreground">
        Gaming <span className="text-gradient-primary">IQ</span>
      </span>
    </div>
  );
}

function Index() {
  return (
    <ClientOnly fallback={<LoadingScreen />}>
      <Suspense fallback={<LoadingScreen />}>
        <GamingIQRoot />
      </Suspense>
    </ClientOnly>
  );
}
