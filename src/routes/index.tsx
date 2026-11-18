import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// Firebase (auth + Firestore) runs only in the browser, so the app is loaded after hydration.
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
    <div className="flex min-h-screen items-center justify-center bg-background">
      <span className="font-display text-2xl font-bold uppercase tracking-widest text-foreground">
        Gaming <span className="text-primary">IQ</span>
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
