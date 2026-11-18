import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { AlertTriangle, ArrowRight, Gauge, Layers, RotateCcw, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { catalogKeys, fetchBrands, fetchDevice, fetchGames, fetchModels, TIER_LABELS, TIER_ORDER } from '../backend/catalog';
import { generateRecommendation } from '../backend/recommend.functions';
import { saveResult } from '../backend/services';
import { useBackend } from '../backend/BackendContext';
import { deviceSupportIssue, type Recommendation } from '../engine/recommend';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DeviceSpecs } from './DeviceSpecs';
import { ResultsView } from './ResultsView';
import { Eyebrow, Notice, Spinner, StepLabel } from './giq/primitives';

const LAST_KEY = 'giq:last-result';
const triggerCls = 'h-11 rounded-lg bg-card px-3 text-sm shadow-none';

export function GeneratorView() {
  const { user, authReady, requestSignIn } = useBackend();
  const generate = useServerFn(generateRecommendation);

  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [gameId, setGameId] = useState('');
  const [result, setResult] = useState<Recommendation | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const brands = useQuery({ queryKey: catalogKeys.brands, queryFn: fetchBrands, staleTime: 5 * 60_000 });
  const models = useQuery({ queryKey: catalogKeys.models(brandId), queryFn: () => fetchModels(brandId), enabled: Boolean(brandId), staleTime: 5 * 60_000 });
  const device = useQuery({ queryKey: catalogKeys.device(modelId), queryFn: () => fetchDevice(modelId), enabled: Boolean(modelId), staleTime: 5 * 60_000 });
  const games = useQuery({ queryKey: catalogKeys.games, queryFn: fetchGames, staleTime: 5 * 60_000 });

  // Restore the last result (e.g. after signing in to save it).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LAST_KEY);
      if (!raw) return;
      const last = JSON.parse(raw) as Recommendation;
      if (last?.device?.id && last.gameId) {
        setBrandId(last.device.brandId);
        setModelId(last.device.id);
        setGameId(last.gameId);
        setResult(last);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const supportIssue = device.data ? deviceSupportIssue(device.data) : null;
  const canGenerate = Boolean(brandId && modelId && gameId && device.data && !supportIssue && !generating);
  const hint = !brandId
    ? 'Select your phone’s brand to begin.'
    : !modelId
      ? 'Select your phone model.'
      : !gameId
        ? 'Select the game you play.'
        : device.isLoading
          ? 'Loading phone specifications…'
          : supportIssue;

  const clearResult = () => {
    setResult(null);
    setGenError(null);
    setSaveState('idle');
    setSaveError(null);
    sessionStorage.removeItem(LAST_KEY);
  };

  // Radix Select can emit '' while its options are still loading; ignore it.
  const onBrand = (id: string) => {
    if (!id || id === brandId) return;
    setBrandId(id);
    setModelId('');
    clearResult();
  };
  const onModel = (id: string) => {
    if (!id || id === modelId) return;
    setModelId(id);
    clearResult();
  };
  const onGame = (id: string) => {
    if (id === gameId) return;
    setGameId(id);
    clearResult();
  };

  const onGenerate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setGenError(null);
    setSaveState('idle');
    setSaveError(null);
    try {
      const res = await generate({ data: { deviceId: modelId, gameId } });
      if (!res.ok) {
        setGenError(res.error);
        setResult(null);
        return;
      }
      setResult(res.recommendation);
      sessionStorage.setItem(LAST_KEY, JSON.stringify(res.recommendation));
      window.setTimeout(() => {
        if (window.matchMedia('(max-width: 1023px)').matches) {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Could not generate settings. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const onSave = async () => {
    if (!result) return;
    if (!user) {
      requestSignIn();
      return;
    }
    setSaveState('saving');
    setSaveError(null);
    try {
      await saveResult(user.uid, `${result.device.fullName} · ${result.gameShortName}`, result);
      setSaveState('saved');
    } catch {
      setSaveState('idle');
      setSaveError('Could not save this result. Please try again.');
    }
  };

  const selectedGame = games.data?.find((g) => g.id === gameId);

  return (
    <div className="space-y-14 sm:space-y-20">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-10">
        {/* Left: intro + form */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div>
            <Eyebrow>Device-specific sensitivity</Eyebrow>
            <h1 className="mt-2 text-[26px] font-semibold leading-[1.15] tracking-tight sm:text-4xl">
              Sensitivity settings built for your exact phone.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              Pick your phone and game. We read its verified display and touch specs and calculate where to start.
            </p>
          </div>

          <form
            className="surface space-y-4 rounded-xl p-4 sm:p-5"
            onSubmit={(e) => {
              e.preventDefault();
              void onGenerate();
            }}
          >
            {/* 1. Brand */}
            <div>
              <StepLabel step={1} htmlFor="brand">Brand</StepLabel>
              {brands.isError ? (
                <Notice tone="danger" icon={AlertTriangle} action={<button type="button" className="text-xs font-medium underline" onClick={() => void brands.refetch()}>Retry</button>}>
                  Couldn’t load brands.
                </Notice>
              ) : (
                <Select value={brandId} onValueChange={onBrand} disabled={brands.isLoading}>
                  <SelectTrigger id="brand" className={triggerCls} aria-label="Smartphone brand">
                    <SelectValue placeholder={brands.isLoading ? 'Loading brands…' : 'Select brand'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(brands.data ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {brands.data && brands.data.length === 0 ? <p className="mt-1.5 text-xs text-muted-foreground">No phones in the catalog yet.</p> : null}
            </div>

            {/* 2. Model */}
            <div>
              <StepLabel step={2} htmlFor="model" aside={models.isFetching ? <Spinner className="size-3.5 text-muted-foreground" /> : null}>
                Model
              </StepLabel>
              {models.isError ? (
                <Notice tone="danger" icon={AlertTriangle} action={<button type="button" className="text-xs font-medium underline" onClick={() => void models.refetch()}>Retry</button>}>
                  Couldn’t load models.
                </Notice>
              ) : (
                <Select value={modelId} onValueChange={onModel} disabled={!brandId || models.isLoading}>
                  <SelectTrigger id="model" className={triggerCls} aria-label="Smartphone model">
                    <SelectValue placeholder={!brandId ? 'Select a brand first' : models.isLoading ? 'Loading models…' : 'Select model'} />
                  </SelectTrigger>
                  <SelectContent>
                    {TIER_ORDER.map((tier) => {
                      const list = (models.data ?? []).filter((m) => m.tier === tier);
                      if (!list.length) return null;
                      return (
                        <SelectGroup key={tier}>
                          <SelectLabel className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{TIER_LABELS[tier]}</SelectLabel>
                          {list.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                              {m.releaseYear ? <span className="ml-1.5 text-xs text-muted-foreground">{m.releaseYear}</span> : null}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              {brandId && models.data && models.data.length === 0 ? <p className="mt-1.5 text-xs text-muted-foreground">No models listed for this brand yet.</p> : null}
            </div>

            {/* Device preview */}
            {modelId ? (
              <div className="rounded-lg border border-border bg-secondary/50 p-3" aria-live="polite">
                {device.isLoading ? (
                  <div className="space-y-2">
                    <div className="skeleton h-4 w-1/2 rounded" />
                    <div className="skeleton h-12 rounded" />
                  </div>
                ) : device.isError ? (
                  <p className="text-xs text-destructive">Couldn’t load this phone’s specifications.</p>
                ) : device.data ? (
                  <>
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold">{device.data.fullName}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                        <ShieldCheck className="size-3.5" />
                        {device.data.verification === 'verified' ? 'Verified specs' : 'Partially verified'}
                      </span>
                    </div>
                    <DeviceSpecs device={device.data} className="sm:grid-cols-2" />
                  </>
                ) : null}
              </div>
            ) : null}

            {/* 3. Game */}
            <div>
              <StepLabel step={3}>Game</StepLabel>
              {games.isError ? (
                <Notice tone="danger" icon={AlertTriangle} action={<button type="button" className="text-xs font-medium underline" onClick={() => void games.refetch()}>Retry</button>}>
                  Couldn’t load games.
                </Notice>
              ) : (
                <div role="radiogroup" aria-label="Game" className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {games.isLoading
                    ? [0, 1, 2].map((i) => <div key={i} className="skeleton h-11 rounded-lg" />)
                    : (games.data ?? []).map((g) => {
                        const active = g.id === gameId;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => onGame(g.id)}
                            className={cn(
                              'h-11 min-w-0 truncate rounded-lg border px-1 text-[13px] font-medium tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              active ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card text-foreground hover:bg-accent'
                            )}
                          >
                            {g.shortName}
                          </button>
                        );
                      })}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <Button type="submit" size="xl" className="w-full" disabled={!canGenerate}>
                {generating ? <Spinner /> : null}
                {generating ? 'Generating…' : 'Generate sensitivity'}
                {!generating ? <ArrowRight /> : null}
              </Button>
              {hint && !result ? <p className="text-center text-xs text-muted-foreground">{hint}</p> : null}
              {genError ? (
                <Notice tone="danger" icon={AlertTriangle}>
                  {genError}
                </Notice>
              ) : null}
            </div>
          </form>
        </div>

        {/* Right: results */}
        <div ref={resultsRef} className="scroll-mt-20 min-w-0">
          {result ? (
            <div className="space-y-3">
              <ResultsView
                key={`${result.device.id}-${result.gameId}-${result.generatedAt}`}
                rec={result}
                saveState={!authReady ? 'hidden' : !user ? 'signed-out' : saveState}
                onSave={() => void onSave()}
                saveError={saveError}
              />
              <Button variant="ghost" size="sm" onClick={clearResult} className="text-muted-foreground">
                <RotateCcw /> Start over
              </Button>
            </div>
          ) : (
            <div className="hidden h-full min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-border-strong p-8 text-center lg:flex">
              <SlidersHorizontal className="size-6 text-subtle" />
              <p className="mt-3 text-sm font-medium">Your settings appear here</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                {selectedGame && device.data
                  ? `Ready: ${device.data.fullName} · ${selectedGame.shortName}. Tap Generate.`
                  : 'Choose a brand, model and game, then generate.'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Benefits */}
      <section aria-labelledby="why-title" className="border-t border-border pt-10">
        <Eyebrow>Why device-specific</Eyebrow>
        <h2 id="why-title" className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Settings that start from facts, not guesses.</h2>
        <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: 'Verified specifications', body: 'Display size, refresh rate and touch sampling come from the phone catalog. Anything unconfirmed is marked, never estimated.' },
            { icon: Layers, title: 'Logic for each game', body: 'Free Fire, BGMI and PUBG Mobile each use their own setting layout and values. Nothing is copied between games.' },
            { icon: Gauge, title: 'Fewer inputs', body: 'Three choices are all it takes. No typing processor names, RAM or screen sizes.' },
          ].map((b) => (
            <div key={b.title} className="bg-card p-5">
              <b.icon className="size-5 text-foreground/80" />
              <h3 className="mt-3 text-sm font-semibold">{b.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Supported games */}
      <section aria-labelledby="games-title" className="pb-4">
        <Eyebrow>Supported games</Eyebrow>
        <h2 id="games-title" className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Built for the games you play.</h2>
        <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
          {games.isLoading
            ? [0, 1, 2].map((i) => (
                <li key={i} className="p-4">
                  <div className="skeleton h-5 w-1/3 rounded" />
                </li>
              ))
            : (games.data ?? []).map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{g.name}</div>
                    <div className="text-xs text-muted-foreground">{g.publisher}</div>
                  </div>
                  <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground">
                    {g.supportsGyro ? 'Touch + gyroscope' : 'Touch'}
                  </span>
                </li>
              ))}
        </ul>
      </section>
    </div>
  );
}
