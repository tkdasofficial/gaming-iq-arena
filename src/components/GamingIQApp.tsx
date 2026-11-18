import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useBackend } from '../backend/BackendContext';
import { Link } from '@tanstack/react-router';
import { AppHeader } from './AppHeader';
import { GeneratorView } from './GeneratorView';
import { SavedView } from './SavedView';
import { BrandMark, Notice } from './giq/primitives';

type View = 'generate' | 'history';

export default function GamingIQApp() {
  const { user, authReady, authError, savedResults, requestSignIn, signOutUser, clearAuthError } = useBackend();
  const [tab, setTab] = useState<View>('generate');

  const selectTab = (next: View) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <AppHeader
        user={user}
        authReady={authReady}
        savedCount={savedResults.length}
        onHome={() => selectTab('generate')}
        onOpenHistory={() => selectTab('history')}
        onGetStarted={requestSignIn}
        onSignOut={() => {
          selectTab('generate');
          void signOutUser();
        }}
      />

      {authError ? (
        <div className="mx-auto w-full max-w-6xl px-4 pt-3 sm:px-6">
          <Notice
            tone="danger"
            icon={AlertTriangle}
            action={
              <button type="button" onClick={clearAuthError} className="text-xs font-medium underline">
                Dismiss
              </button>
            }
          >
            {authError}
          </Notice>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-6 sm:px-6 sm:pt-10">
        {/* Keep the generator mounted so a result survives switching tabs. */}
        <div hidden={tab !== 'generate'}>
          <GeneratorView />
        </div>
        {tab === 'history' ? <SavedView onGoToGenerate={() => selectTab('generate')} /> : null}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:px-6">
          <BrandMark compact />
          <span>Recommendations are starting points based on verified device data.</span>
          <nav aria-label="Legal" className="flex w-full items-center gap-4 sm:w-auto">
            <Link to="/terms" className="transition-colors hover:text-foreground">Terms of Service</Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy Policy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
