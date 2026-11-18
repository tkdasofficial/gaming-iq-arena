import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { checkEmailHasAccount } from "@/backend/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Gaming IQ" },
      {
        name: "description",
        content: "Log in or create your Gaming IQ account to save sensitivity setups, presets and Aim Lab runs.",
      },
      { property: "og:title", content: "Sign in — Gaming IQ" },
      {
        property: "og:description",
        content: "Log in or create your Gaming IQ account to sync your sensitivity setups across devices.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup";
type Step = "email" | "password" | "check-email";

function GoogleLogo() {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const checkEmail = useServerFn(checkEmailHasAccount);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("email");
  const [mode, setMode] = useState<Mode>("login");
  const [accountFound, setAccountFound] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Go straight back to the app.
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) void navigate({ to: "/", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (step === "password") passwordRef.current?.focus();
  }, [step]);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const { exists } = await checkEmail({ data: { email: clean } });
      setEmail(clean);
      setAccountFound(exists);
      setMode(exists ? "login" : "signup");
      setPassword("");
      setStep("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to check this email right now.");
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        void navigate({ to: "/", replace: true });
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          void navigate({ to: "/", replace: true });
        } else {
          setStep("check-email");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Try again.";
      setError(
        message === "Invalid login credentials" ? "Wrong password for this email. Try again." : message,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleBusy(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (oauthError) {
      setError(oauthError.message);
      setGoogleBusy(false);
    }
  };

  const resetToEmail = () => {
    setStep("email");
    setPassword("");
    setError(null);
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-5 py-4 md:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to app
        </Link>
      </header>

      <div className="flex-1 flex items-start md:items-center justify-center px-5 pb-12 pt-4">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <span className="font-display text-3xl font-bold uppercase tracking-wide">
              Gaming <span className="text-primary">IQ</span>
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-none">
              {step === "check-email"
                ? "Check your inbox"
                : step === "password"
                  ? mode === "login"
                    ? "Welcome back"
                    : "Create your account"
                  : "Sign in or sign up"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {step === "check-email"
                ? `We sent a confirmation link to ${email}. Open it to activate your account.`
                : "Save setups, publish presets and track Aim Lab runs across devices."}
            </p>
          </div>

          {step === "check-email" ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <MailCheck className="size-8 text-primary" aria-hidden="true" />
              <p className="mt-3 text-sm text-card-foreground">
                After confirming, come back here and log in with your email and password.
              </p>
              <Button variant="outline" className="mt-5 w-full h-11 rounded-xl" onClick={resetToEmail}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <form
                onSubmit={step === "email" ? handleEmailSubmit : handlePasswordSubmit}
                className="space-y-4"
                noValidate
              >
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  {step === "email" ? (
                    <Input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoFocus
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 rounded-xl bg-card"
                    />
                  ) : (
                    <div className="flex h-11 items-center justify-between gap-3 rounded-xl border border-border bg-card px-3">
                      <span className="truncate text-sm">{email}</span>
                      <button
                        type="button"
                        onClick={resetToEmail}
                        className="shrink-0 text-xs font-semibold text-primary hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>

                {step === "password" ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div
                      role="tablist"
                      aria-label="Account action"
                      className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1"
                    >
                      {(["login", "signup"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          role="tab"
                          aria-selected={mode === m}
                          onClick={() => {
                            setMode(m);
                            setError(null);
                          }}
                          className={cn(
                            "h-9 rounded-lg text-sm font-semibold transition-colors",
                            mode === m
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {m === "login" ? "Log in" : "Sign up"}
                        </button>
                      ))}
                    </div>

                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                      {accountFound
                        ? "We found your account — enter your password to log in."
                        : "No account with this email yet — choose a password to sign up."}
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        ref={passwordRef}
                        type="password"
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        placeholder={mode === "login" ? "Your password" : "At least 6 characters"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 rounded-xl bg-card"
                      />
                    </div>
                  </div>
                ) : null}

                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}

                <Button type="submit" disabled={busy} className="w-full h-11 rounded-xl font-semibold">
                  {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                  {step === "email" ? (
                    <>
                      Continue
                      {!busy ? <ArrowRight aria-hidden="true" /> : null}
                    </>
                  ) : mode === "login" ? (
                    "Log in"
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="google"
                size="google"
                className="w-full"
                disabled={googleBusy}
                onClick={() => void handleGoogle()}
              >
                <GoogleLogo />
                Continue with Google
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
