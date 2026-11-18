import { createFileRoute } from "@tanstack/react-router";
import { LegalSection, StaticPage } from "@/components/giq/StaticPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Gaming IQ" },
      { name: "description", content: "The terms for using Gaming IQ's device-specific sensitivity generator." },
      { property: "og:title", content: "Terms of Service — Gaming IQ" },
      { property: "og:description", content: "The terms for using Gaming IQ's device-specific sensitivity generator." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <StaticPage eyebrow="Legal" title="Terms of Service" subtitle="Last updated 18 November 2026">
      <div className="space-y-6">
        <LegalSection title="Using Gaming IQ">
          <p>
            Gaming IQ suggests in-game sensitivity settings based on the phone and game you choose. By using the app you
            agree to these terms.
          </p>
        </LegalSection>
        <LegalSection title="Recommendations">
          <p>
            Values are starting points calculated from stored device specs. They are not official settings from any game
            publisher, and results in a match can vary. Fine-tune them to suit how you play.
          </p>
        </LegalSection>
        <LegalSection title="Your account">
          <p>
            You are responsible for keeping your sign-in details safe. You can stop using Gaming IQ at any time.
          </p>
        </LegalSection>
        <LegalSection title="Games and trademarks">
          <p>
            Free Fire, BGMI and PUBG Mobile belong to their respective owners. Gaming IQ is not affiliated with or endorsed
            by them.
          </p>
        </LegalSection>
        <LegalSection title="Changes">
          <p>We may update these terms. The date at the top shows when they last changed.</p>
        </LegalSection>
      </div>
    </StaticPage>
  );
}
