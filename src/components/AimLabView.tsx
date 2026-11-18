import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, LogIn, Play, RotateCcw, Trash2 } from 'lucide-react';
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

    ctx.save();
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = '#0B0B0D';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#1B1B20';
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

    ctx.strokeStyle = '#29292F';
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    const now = performance.now();
    if (stateRef.current.flashColor && now < stateRef.current.flashUntil) {
      ctx.fillStyle =
        stateRef.current.flashColor === 'hit'
          ? 'rgba(255, 255, 255, 0.08)'
          : 'rgba(240, 38, 60, 0.14)';
      ctx.fillRect(0, 0, w, h);
    }

    const target = stateRef.current.target;
    if (target && stateRef.current.status === 'running') {
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius * 0.58, 0, Math.PI * 2);
      ctx.fillStyle = '#F0263C';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = '#0B0B0D';
      ctx.fill();
    }

    const ch = stateRef.current.crosshair;
    ctx.strokeStyle = '#F0263C';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ch.x, ch.y, 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#FFFFFF';
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
  };

  const totalShots = hits + misses;
  const accuracy = totalShots > 0 ? Math.round((hits / totalShots) * 100) : 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Sensitivity Flick Lab
        </h1>

        <div className="flex items-center gap-2">
          {status !== 'running' ? (
            <button
              key="start-drill"
              type="button"
              onClick={startDrill}
              className="min-h-[44px] px-5 rounded-xl bg-[#F0263C] hover:bg-[#B8172A] text-white text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Play className="w-4 h-4" />
              <span>{status === 'finished' ? 'Run Again (15s)' : 'Start 15s Drill'}</span>
            </button>
          ) : (
            <button
              key="stop-drill"
              type="button"
              onClick={resetDrill}
              className="min-h-[44px] px-4 rounded-xl bg-white hover:bg-[#E4E4E7] text-black text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Stop Drill</span>
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#141417] border border-[#29292F] rounded-xl p-3.5">
          <div className="text-xs text-[#A1A1AA]">Time Remaining</div>
          <div className="font-mono text-2xl font-bold text-white tabular-nums mt-0.5">
            {timeLeft}s
          </div>
        </div>
        <div className="bg-[#141417] border border-[#29292F] rounded-xl p-3.5">
          <div className="text-xs text-[#A1A1AA]">Targets Hit</div>
          <div className="font-mono text-2xl font-bold text-white tabular-nums mt-0.5">
            {hits}
          </div>
        </div>
        <div className="bg-[#141417] border border-[#29292F] rounded-xl p-3.5">
          <div className="text-xs text-[#A1A1AA]">Accuracy</div>
          <div className="font-mono text-2xl font-bold text-[#F0263C] tabular-nums mt-0.5">
            {accuracy}%
          </div>
        </div>
        <div className="bg-[#141417] border border-[#29292F] rounded-xl p-3.5">
          <div className="text-xs text-[#A1A1AA]">Avg Reaction</div>
          <div className="font-mono text-2xl font-bold text-white tabular-nums mt-0.5">
            {avgReactionMs !== null ? `${avgReactionMs}ms` : '—'}
          </div>
        </div>
      </div>

      {/* Interactive Canvas */}
      <div className="bg-[#141417] border border-[#29292F] rounded-xl p-3 sm:p-4 space-y-4">
        <div className="relative rounded-xl overflow-hidden border border-[#29292F]">
          <canvas
            ref={canvasRef}
            data-testid="aimlab-canvas"
            data-state={status}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
            onPointerLeave={() => {
              stateRef.current.lastPointer = null;
            }}
            className="w-full h-[260px] sm:h-[380px] block touch-none cursor-crosshair"
          />

          {status === 'idle' ? (
            <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center pointer-events-none">
              <Crosshair className="w-8 h-8 text-[#F0263C] mb-2" />
              <h2 className="font-display text-2xl font-bold text-white">
                Test Your Crosshair Speed
              </h2>
              <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-sm mt-1">
                Press Start 15s Drill, then flick and tap each white-red target as quickly as possible.
              </p>
            </div>
          ) : null}

          {status === 'finished' ? (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center pointer-events-none">
              <div className="text-xs font-semibold text-[#F0263C]">
                Drill Complete {isSignedIn ? '· Saved to Firestore' : ''}
              </div>
              <h2 className="font-display text-3xl font-extrabold text-white mt-1">
                {hits} Hits · {accuracy}% Accuracy
              </h2>
              <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1 font-mono tabular-nums">
                {avgReactionMs ? `Avg Reaction ${avgReactionMs}ms` : 'No hits recorded'} · Best Streak {streak}
              </p>
            </div>
          ) : null}
        </div>

        {/* Live Multiplier Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <label
            htmlFor="aimlab-scalar"
            className="text-xs font-semibold text-[#A1A1AA]"
          >
            Crosshair Speed ({primarySlider?.label ?? 'General'})
          </label>
          <div className="flex items-center gap-3 sm:w-64 shrink-0">
            <input
              id="aimlab-scalar"
              type="range"
              min={0.5}
              max={2.0}
              step={0.05}
              value={testScalar}
              onChange={(e) => setTestScalar(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, #F0263C 0%, #F0263C ${
                  ((testScalar - 0.5) / 1.5) * 100
                }%, #29292F ${((testScalar - 0.5) / 1.5) * 100}%, #29292F 100%)`,
              }}
              className="giq-slider"
            />
            <span className="font-mono text-sm font-bold text-white tabular-nums w-12 text-right">
              {testScalar.toFixed(2)}x
            </span>
          </div>
        </div>
      </div>

      {/* Firestore Drill History */}
      <section className="bg-[#141417] border border-[#29292F] rounded-xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-white">
            Cloud Drill History
          </h2>
          {!isSignedIn ? (
            <button
              type="button"
              onClick={onSignIn}
              className="min-h-[36px] px-3 rounded-lg bg-[#1B1B20] hover:bg-[#29292F] border border-[#29292F] text-xs font-semibold text-white inline-flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-[#F0263C]" />
              <span>Sign In to Save Runs</span>
            </button>
          ) : null}
        </div>

        {!isSignedIn ? (
          <p className="text-xs sm:text-sm text-[#A1A1AA]">
            Sign in with Google to record and compare your reaction times and accuracy across sessions in Firestore.
          </p>
        ) : aimLabRuns.length === 0 ? (
          <p className="text-xs sm:text-sm text-[#A1A1AA]">
            Complete a 15-second drill to record your first run in Firestore.
          </p>
        ) : (
          <div className="divide-y divide-[#29292F]">
            {aimLabRuns.map((run) => (
              <div
                key={run.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-white">
                    {run.game === 'free-fire' ? 'Free Fire' : 'BGMI'} · {run.hits} Hits ·{' '}
                    <span className="text-[#F0263C]">{run.accuracy}%</span>
                  </div>
                  <div className="text-xs text-[#A1A1AA] font-mono tabular-nums mt-0.5">
                    {typeof run.avgReactionMs === 'number'
                      ? `${run.avgReactionMs}ms avg`
                      : 'No reaction time'}{' '}
                    · Streak {run.bestStreak} · {run.scalar.toFixed(2)}x
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void onDeleteRun(run.id)}
                  aria-label="Delete drill run"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#71717A] hover:text-[#F0263C] hover:bg-[#111114] transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
