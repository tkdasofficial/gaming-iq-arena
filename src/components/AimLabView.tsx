import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, History, LogIn, Play, RotateCcw, Square, Target as TargetIcon, Timer, Trash2, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PageHeader, RangeSlider } from './giq/primitives';
import type { AimLabRun, CalibrationResult, GameId } from '../engine/types';

interface AimLabViewProps {
  result: CalibrationResult;
  isSignedIn: boolean;
  aimLabRuns: AimLabRun[];
  onSaveRun: (run: {
    game: GameId;
    hits: number;
    misses: number;
    accuracy: number;
    avgReactionMs: number | null;
    bestStreak: number;
    scalar: number;
  }) => Promise<void>;
  onDeleteRun: (runId: string) => Promise<void>;
  onSignIn: () => void;
}

interface Target {
  x: number;
  y: number;
  radius: number;
  spawnedAt: number;
}

export function AimLabView({
  result,
  isSignedIn,
  aimLabRuns,
  onSaveRun,
  onDeleteRun,
  onSignIn,
}: AimLabViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'finished'>('idle');
  const [timeLeft, setTimeLeft] = useState(15);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [avgReactionMs, setAvgReactionMs] = useState<number | null>(null);

  const primarySlider = result.sliders[0];
  const baseSensitivityScalar = useMemo(() => {
    if (!primarySlider) return 1.0;
    return Number((primarySlider.value / (result.game === 'free-fire' ? 170 : 120)).toFixed(2));
  }, [primarySlider, result.game]);

  const [testScalar, setTestScalar] = useState(baseSensitivityScalar);

  useEffect(() => {
    setTestScalar(baseSensitivityScalar);
  }, [baseSensitivityScalar]);

  const stateRef = useRef({
    status: 'idle' as 'idle' | 'running' | 'finished',
    target: null as Target | null,
    crosshair: { x: 200, y: 170 },
    lastPointer: null as { x: number; y: number } | null,
    reactions: [] as number[],
    hits: 0,
    misses: 0,
    streak: 0,
    bestStreak: 0,
    flashColor: null as 'hit' | 'miss' | null,
    flashUntil: 0,
    scalar: baseSensitivityScalar,
  });

  stateRef.current.scalar = testScalar;

  const spawnTarget = useCallback((width: number, height: number) => {
    const pad = 42;
    const radius = Math.max(20, Math.min(28, width * 0.055));
    const x = pad + Math.random() * Math.max(40, width - pad * 2);
    const y = pad + Math.random() * Math.max(40, height - pad * 2);
    stateRef.current.target = {
      x,
      y,
      radius,
      spawnedAt: performance.now(),
    };
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.floor(rect.width * dpr);
    const targetH = Math.floor(rect.height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const css = getComputedStyle(canvas);
    const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const c = {
      bg: token('--background', '#0B0B0D'),
      grid: token('--secondary', '#1B1B20'),
      axis: token('--surface-3', '#29292F'),
      fg: token('--foreground', '#FFFFFF'),
      primary: token('--primary', '#F0263C'),
    };

    ctx.save();
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = c.grid;
    ctx.lineWidth = 1;
    const step = 36;
    for (let x = step; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = step; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.strokeStyle = c.axis;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    const now = performance.now();
    if (stateRef.current.flashColor && now < stateRef.current.flashUntil) {
      ctx.globalAlpha = stateRef.current.flashColor === 'hit' ? 0.08 : 0.16;
      ctx.fillStyle = stateRef.current.flashColor === 'hit' ? c.fg : c.primary;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    const target = stateRef.current.target;
    if (target && stateRef.current.status === 'running') {
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
      ctx.shadowColor = c.primary;
      ctx.shadowBlur = 24;
      ctx.fillStyle = c.fg;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius * 0.58, 0, Math.PI * 2);
      ctx.fillStyle = c.primary;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = c.bg;
      ctx.fill();
    }

    const ch = stateRef.current.crosshair;
    ctx.strokeStyle = c.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ch.x, ch.y, 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = c.fg;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ch.x - 18, ch.y);
    ctx.lineTo(ch.x - 6, ch.y);
    ctx.moveTo(ch.x + 6, ch.y);
    ctx.lineTo(ch.x + 18, ch.y);
    ctx.moveTo(ch.x, ch.y - 18);
    ctx.lineTo(ch.x, ch.y - 6);
    ctx.moveTo(ch.x, ch.y + 6);
    ctx.lineTo(ch.x, ch.y + 18);
    ctx.stroke();

    ctx.restore();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      stateRef.current.crosshair = { x: rect.width / 2, y: rect.height / 2 };
    }
    drawCanvas();

    const handleResize = () => drawCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawCanvas]);

  useEffect(() => {
    if (status !== 'running') return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stateRef.current.status = 'finished';
          setStatus('finished');
          drawCanvas();

          if (isSignedIn) {
            const total = stateRef.current.hits + stateRef.current.misses;
            const acc = total > 0 ? Math.round((stateRef.current.hits / total) * 100) : 100;
            const avg =
              stateRef.current.reactions.length > 0
                ? Math.round(
                    stateRef.current.reactions.reduce((a, b) => a + b, 0) /
                      stateRef.current.reactions.length
                  )
                : null;
            void onSaveRun({
              game: result.game,
              hits: stateRef.current.hits,
              misses: stateRef.current.misses,
              accuracy: acc,
              avgReactionMs: avg,
              bestStreak: stateRef.current.bestStreak,
              scalar: stateRef.current.scalar,
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status, drawCanvas, isSignedIn, onSaveRun, result.game]);

  const startDrill = () => {
    const canvas = canvasRef.current;
    const rect = canvas ? canvas.getBoundingClientRect() : { width: 340, height: 320 };
    stateRef.current.status = 'running';
    stateRef.current.reactions = [];
    stateRef.current.hits = 0;
    stateRef.current.misses = 0;
    stateRef.current.streak = 0;
    stateRef.current.bestStreak = 0;
    stateRef.current.crosshair = { x: rect.width / 2, y: rect.height / 2 };
    spawnTarget(rect.width, rect.height);
    setHits(0);
    setMisses(0);
    setStreak(0);
    setAvgReactionMs(null);
    setTimeLeft(15);
    setStatus('running');
    drawCanvas();
  };

  const resetDrill = () => {
    stateRef.current.status = 'idle';
    stateRef.current.target = null;
    stateRef.current.hits = 0;
    stateRef.current.misses = 0;
    stateRef.current.streak = 0;
    stateRef.current.bestStreak = 0;
    setStatus('idle');
    setTimeLeft(15);
    setHits(0);
    setMisses(0);
    setStreak(0);
    setAvgReactionMs(null);
    drawCanvas();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (stateRef.current.lastPointer) {
      const dx = (px - stateRef.current.lastPointer.x) * stateRef.current.scalar;
      const dy = (py - stateRef.current.lastPointer.y) * stateRef.current.scalar;
      const nx = Math.max(16, Math.min(rect.width - 16, stateRef.current.crosshair.x + dx));
      const ny = Math.max(16, Math.min(rect.height - 16, stateRef.current.crosshair.y + dy));
      stateRef.current.crosshair = { x: nx, y: ny };
    } else {
      stateRef.current.crosshair = { x: px, y: py };
    }

    stateRef.current.lastPointer = { x: px, y: py };
    drawCanvas();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    stateRef.current.lastPointer = { x: px, y: py };

    if (stateRef.current.status !== 'running' || !stateRef.current.target) {
      return;
    }

    const target = stateRef.current.target;
    const distTap = Math.hypot(px - target.x, py - target.y);
    const ch = stateRef.current.crosshair;
    const distCrosshair = Math.hypot(ch.x - target.x, ch.y - target.y);

    if (distTap <= target.radius + 8 || distCrosshair <= target.radius + 8) {
      const reaction = Math.round(performance.now() - target.spawnedAt);
      stateRef.current.reactions.push(reaction);
      const avg = Math.round(
        stateRef.current.reactions.reduce((a, b) => a + b, 0) /
          stateRef.current.reactions.length
      );
      stateRef.current.hits += 1;
      stateRef.current.streak += 1;
      stateRef.current.bestStreak = Math.max(
        stateRef.current.bestStreak,
        stateRef.current.streak
      );
      setAvgReactionMs(avg);
      setHits(stateRef.current.hits);
      setStreak(stateRef.current.streak);
      stateRef.current.flashColor = 'hit';
      stateRef.current.flashUntil = performance.now() + 120;
      spawnTarget(rect.width, rect.height);
    } else {
      stateRef.current.misses += 1;
      stateRef.current.streak = 0;
      setMisses(stateRef.current.misses);
      setStreak(0);
      stateRef.current.flashColor = 'miss';
      stateRef.current.flashUntil = performance.now() + 120;
    }

    drawCanvas();
    window.setTimeout(drawCanvas, 140);
  };

  const totalShots = hits + misses;
  const accuracy = totalShots > 0 ? Math.round((hits / totalShots) * 100) : 100;
  const timePct = (timeLeft / 15) * 100;

  const hud = [
    { label: 'Time', value: `${timeLeft}s`, icon: Timer },
    { label: 'Hits', value: hits, icon: TargetIcon },
    { label: 'Acc', value: `${accuracy}%`, icon: Crosshair, accent: true },
    { label: 'React', value: avgReactionMs !== null ? `${avgReactionMs}` : '—', unit: avgReactionMs !== null ? 'ms' : '', icon: Zap },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Training"
        title="Flick lab"
        subtitle="15-second drill. Drag to move the crosshair, tap targets as fast as you can."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-3">
          {/* Arena */}
          <div className="surface relative overflow-hidden rounded-3xl p-1.5">
            <div className="relative overflow-hidden rounded-[20px]">
              <canvas
                ref={canvasRef}
                data-testid="aimlab-canvas"
                data-state={status}
                onPointerMove={handlePointerMove}
                onPointerDown={handlePointerDown}
                onPointerLeave={() => {
                  stateRef.current.lastPointer = null;
                }}
                className="block h-[min(58dvh,440px)] w-full cursor-crosshair touch-none"
              />

              {/* HUD */}
              <div className="pointer-events-none absolute inset-x-2 top-2 grid grid-cols-4 gap-1.5">
                {hud.map(({ label, value, unit, icon: Icon, accent }) => (
                  <div key={label} className="glass rounded-xl border border-border px-2 py-1.5">
                    <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-subtle">
                      <Icon className="size-3" />
                      {label}
                    </div>
                    <div className={cn('font-mono text-base font-bold leading-tight tabular-nums', accent && 'text-primary')}>
                      {value}
                      {unit ? <span className="text-[10px] text-muted-foreground">{unit}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-surface-3/60">
                <div className="h-full bg-gradient-primary transition-[width] duration-1000 ease-linear" style={{ width: `${timePct}%` }} />
              </div>

              <AnimatePresence>
                {status === 'idle' ? (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-background/70 p-6 text-center backdrop-blur-[2px]"
                  >
                    <div className="relative grid size-16 place-items-center">
                      <span className="absolute inset-0 animate-ping-slow rounded-full border-2 border-primary/50" />
                      <Crosshair className="size-8 text-primary" />
                    </div>
                    <h2 className="mt-3 font-display text-2xl font-bold">Ready to flick?</h2>
                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">Tap Start, then hit each target as fast as you can.</p>
                  </motion.div>
                ) : null}
                {status === 'finished' ? (
                  <motion.div
                    key="finished"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-background/80 p-6 text-center backdrop-blur-sm"
                  >
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                      Drill complete{isSignedIn ? ' · saved' : ''}
                    </div>
                    <div className="mt-2 font-display text-6xl font-extrabold leading-none tabular-nums">{hits}</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">targets hit</div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {[
                        { k: 'Accuracy', v: `${accuracy}%` },
                        { k: 'Reaction', v: avgReactionMs ? `${avgReactionMs}ms` : '—' },
                        { k: 'Streak', v: streak },
                      ].map((m) => (
                        <div key={m.k} className="rounded-xl border border-border bg-secondary px-3 py-2">
                          <div className="font-mono text-sm font-bold tabular-nums">{m.v}</div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-subtle">{m.k}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
            {status !== 'running' ? (
              <Button key="start-drill" variant="glow" size="xl" onClick={startDrill} className="sm:min-w-52">
                {status === 'finished' ? <RotateCcw /> : <Play />}
                {status === 'finished' ? 'Run again' : 'Start drill'}
              </Button>
            ) : (
              <Button key="stop-drill" variant="surface" size="xl" onClick={resetDrill} className="sm:min-w-52">
                <Square /> Stop drill
              </Button>
            )}
            <div className="surface flex h-14 items-center gap-3 rounded-2xl px-4">
              <label htmlFor="aimlab-scalar" className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Speed
              </label>
              <RangeSlider id="aimlab-scalar" min={0.5} max={2.0} step={0.05} value={testScalar} onChange={setTestScalar} />
              <span className="w-12 shrink-0 text-right font-mono text-sm font-bold tabular-nums">{testScalar.toFixed(2)}x</span>
            </div>
          </div>
          <p className="px-1 text-xs text-subtle">Speed starts from your {primarySlider?.label ?? 'general'} value.</p>
        </div>

        {/* History */}
        <section className="surface rounded-3xl p-4 sm:p-5">
          <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-secondary text-primary">
                <History className="size-4" />
              </span>
              <h2 className="truncate font-display text-xl font-bold tracking-tight">Run history</h2>
            </div>
            {isSignedIn && aimLabRuns.length > 0 ? (
              <span className="font-mono text-xs font-semibold text-muted-foreground">{aimLabRuns.length} runs</span>
            ) : null}
          </div>

          {!isSignedIn ? (
            <div className="space-y-3 rounded-2xl border border-dashed border-border-strong p-4 text-center">
              <p className="text-sm text-muted-foreground">Sign in to keep your runs and track progress.</p>
              <Button variant="surface" size="md" onClick={onSignIn} className="w-full">
                <LogIn /> Sign in
              </Button>
            </div>
          ) : aimLabRuns.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border-strong p-4 text-center text-sm text-muted-foreground">
              Finish a drill to log your first run.
            </p>
          ) : (
            <ul className="space-y-2">
              {aimLabRuns.map((run) => (
                <li
                  key={run.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-secondary/60 p-2.5"
                >
                  <div className="grid size-11 place-items-center rounded-xl bg-background/60 font-mono text-sm font-bold text-primary tabular-nums">
                    {run.accuracy}%
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {run.hits} hits · {run.game === 'free-fire' ? 'Free Fire' : 'BGMI'}
                    </div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground tabular-nums">
                      {typeof run.avgReactionMs === 'number' ? `${run.avgReactionMs}ms` : '—'} · streak {run.bestStreak} ·{' '}
                      {run.scalar.toFixed(2)}x
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onDeleteRun(run.id)}
                    aria-label="Delete drill run"
                    className="grid size-9 place-items-center rounded-xl text-subtle transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
