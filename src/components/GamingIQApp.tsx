import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useBackend } from '../backend/BackendContext';
import { AppHeader, type NavTab } from './AppHeader';
import { GeneratorView } from './GeneratorView';
import { SavedView } from './SavedView';
import { BrandMark, Notice } from './giq/primitives';

export default function GamingIQApp() {
  const { user, authReady, authError, savedResults, requestSignIn, signOutUser, clearAuthError } = useBackend();
  const [tab, setTab] = useState<NavTab>('generate');

  const selectTab = (next: NavTab) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <AppHeader
        activeTab={tab}
        onSelectTab={selectTab}
        savedCount={savedResults.length}
        user={user}
        authReady={authReady}
        onSignIn={requestSignIn}
        onSignOut={() => void signOutUser()}
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
        {tab === 'saved' ? <SavedView onGoToGenerate={() => selectTab('generate')} /> : null}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:px-6">
          <BrandMark compact />
          <span>Recommendations are starting points based on verified device data.</span>
        </div>
      </footer>
    </div>
  );
}
