import { createFileRoute } from "@tanstack/react-router";
import { LegalSection, StaticPage } from "@/components/giq/StaticPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Gaming IQ" },
      { name: "description", content: "What Gaming IQ stores about you and how your saved sensitivity results are used." },
      { property: "og:title", content: "Privacy Policy — Gaming IQ" },
      { property: "og:description", content: "What Gaming IQ stores about you and how your saved sensitivity results are used." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <StaticPage eyebrow="Legal" title="Privacy Policy" subtitle="Last updated 18 November 2026">
      <div className="space-y-6">
        <LegalSection title="What we store">
          <p>
            When you create an account we store your email address, and your name and profile picture if you sign in with
            Google. When you save a result, we store the phone, game and recommended values so you can see them in your
            history.
          </p>
        </LegalSection>
        <LegalSection title="What we don't collect">
          <p>
            You never type in hardware details, and Gaming IQ doesn't read anything from your phone. Generating settings
            works without an account.
          </p>
        </LegalSection>
        <LegalSection title="How it's used">
          <p>
            Your data is used only to sign you in and show your saved results. We don't sell it or share it for
            advertising.
          </p>
        </LegalSection>
        <LegalSection title="Deleting your data">
          <p>You can delete any saved result from your history at any time.</p>
        </LegalSection>
      </div>
    </StaticPage>
  );
}
