import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { BrandMark } from "@/components/giq/primitives";

// The app shell reads the signed-in session from browser storage, so it loads after hydration.
const GamingIQRoot = lazy(() => import("@/components/GamingIQRoot"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gaming IQ — Sensitivity for your exact phone" },
      {
        name: "description",
        content:
          "Pick your phone and game to get Free Fire, BGMI or PUBG Mobile sensitivity built from verified device specs.",
      },
      { property: "og:title", content: "Gaming IQ — Sensitivity for your exact phone" },
      {
        property: "og:description",
        content:
          "Pick your phone and game to get Free Fire, BGMI or PUBG Mobile sensitivity built from verified device specs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background text-foreground">
      <BrandMark />
      <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />
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
