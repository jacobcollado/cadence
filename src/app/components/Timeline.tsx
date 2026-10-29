import { useEffect, useMemo, useRef, useState } from "react";
import type { Run } from "../../shared/run";
import { FREEZE, frameAt, fpsAround, LAYOUT, missed, tier, type RunStats } from "../../shared/stats";
import { DUR, easeOut, reducedMotion } from "../../shared/motion";
import { token, useTheme } from "../theme";

const LABELS = 24;
const PLOT = 160;
const LANE = 12;
const AXIS = 20;
/** Room for the frame time labels on the left. */
const GUTTER = 44;
/** The scale stops here unless most of the run was slower. */
const MAX_CEILING = 150;
/** Closest two frame time labels may sit. */
const TICK_GAP = 14;
/** Narrowest the plot gets per second of run; past that, it scrolls sideways. */
const PX_PER_S = 140;

// Colors come from the theme tokens, read when drawing. Per tier: on time,
// late, freeze; the dim set is for frames outside a highlighted section.
function palette() {
  return {
    fill: [token("--data"), token("--warn"), token("--bad")],
    fillDim: [token("--data-dim"), token("--warn-dim"), token("--bad-dim")],
    task: token("--ink-2"),
    taskDim: token("--data-dim"),
    grid: token("--grid"),
    budget: token("--budget"),
    ink: token("--ink"),
    ink3: token("--ink-3"),
  };
}

interface Span {
  index: number;
  start: number;
  end: number;
}

interface Hover {
  /** Across the plot, which may be wider than the screen. */
  x: number;
  t: number;
  /** Across the visible chart, for placing the card. */
  at: number;
}

/**
 * Frame time scale: tall enough for the worst frame, within reason. A run
 * that was slow throughout stretches it to fit most frames; the rest run off
 * the top, with a break to show it.
 */
export function ceilingFor(stats: RunStats): number {
  const target = Math.min(stats.worst, Math.max(MAX_CEILING, stats.p95 * 1.1));
  const step = target > 100 ? 50 : 25;
  return Math.max(stats.interval * 4, FREEZE * 1.2, Math.ceil(target / step) * step);
}

/**
 * Every frame of the run, left to right. Height is how long the frame took:
 * past the budget line it missed a refresh, past 50 ms it froze. Sections run
 * along the top, slow scripts along the bottom.
 */
export function Timeline({ run, stats, highlight }: { run: Run; stats: RunStats; highlight: number | null }) {
  const wrap = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const axis = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<Hover | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const [progress, setProgress] = useState(reducedMotion() ? 1 : 0);
  const [fontsReady, setFontsReady] = useState(false);
  const theme = useTheme();
  const lane = run.support.loaf && run.tasks.length > 0;
  const height = LABELS + PLOT + (lane ? LANE + 4 : 0) + AXIS;

  const spans = useMemo(() => sectionSpans(run, stats.times), [run, stats.times]);
  // The plot keeps a readable width per second; on narrow screens it scrolls
  // under the frame time labels, which stay put.
  const view = Math.max(0, width - GUTTER);
  const plot = Math.max(view, Math.round((stats.time / 1000) * PX_PER_S));

  useEffect(() => {
    const el = wrap.current!;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    document.fonts.ready.then(() => setFontsReady(true));
    return () => ro.disconnect();
  }, []);

  // Bars grow from zero once, when the report opens.
  useEffect(() => {
    if (progress >= 1) return;
    const start = performance.now();
    let id = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / (DUR.count * 1.2));
      setProgress(easeOut(t));
      if (t < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cv = canvas.current, ax = axis.current;
    if (!cv || !ax || !width) return;
    const dpr = devicePixelRatio || 1;
    cv.width = Math.round(plot * dpr);
    cv.height = Math.round(height * dpr);
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx, { run, stats, spans, width: plot, height, dpr, progress, highlight, hover, lane });
    ax.width = Math.round(GUTTER * dpr);
    ax.height = Math.round(height * dpr);
    const actx = ax.getContext("2d")!;
    actx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawAxis(actx, stats, height);
  }, [run, stats, spans, width, plot, height, progress, highlight, hover, lane, fontsReady, theme]);

  // Fades mark the sides with more of the run past them.
  const measure = () => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft > 1, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 });
  };
  useEffect(measure, [plot, view]);

  // Hovering a section in the table brings its frames into view.
  useEffect(() => {
    const el = scroller.current;
    const span = highlight === null ? undefined : spans.find((s) => s.index === highlight);
    if (!el || !span || plot <= view) return;
    const x0 = (span.start / (stats.time || 1)) * plot, x1 = (span.end / (stats.time || 1)) * plot;
    if (x0 >= el.scrollLeft && x1 <= el.scrollLeft + el.clientWidth) return;
    el.scrollTo({ left: Math.max(0, x0 - 16), behavior: reducedMotion() ? "auto" : "smooth" });
  }, [highlight]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    const w = wrap.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(plot, e.clientX - r.left));
    setHover({ x, t: (x / plot) * stats.time, at: Math.max(GUTTER, Math.min(w.width, e.clientX - w.left)) });
  };

  return (
    <div ref={wrap} className="timeline" style={{ height }}>
      <canvas ref={axis} className="timeline-axis" style={{ width: GUTTER, height }} aria-hidden="true" />
      <div
        ref={scroller}
        className="timeline-scroll"
        data-start={edges.start || undefined}
        data-end={edges.end || undefined}
        onScroll={() => { measure(); setHover(null); }}
        onPointerMove={move}
        onPointerDown={move}
        onPointerLeave={() => setHover(null)}
      >
        <canvas ref={canvas} style={{ width: plot, height }} role="img" aria-label={`Frame timeline: ${stats.sentence}`} />
      </div>
      {hover && width > 0 && <Tip run={run} stats={stats} spans={spans} hover={hover} width={width} />}
    </div>
  );
}

function Tip({ run, stats, spans, hover, width }: { run: Run; stats: RunStats; spans: Span[]; hover: Hover; width: number }) {
  const { t } = hover;
  const span = spans.find((s) => t >= s.start && t <= s.end);
  const a = frameAt(stats.times, t - 250);
  const b = frameAt(stats.times, t + 250);
  let longest = 0, dropped = 0;
  for (let i = a; i <= b; i++) {
    const d = run.frames[i] / 10;
    longest = Math.max(longest, d);
    dropped += missed(d, stats.interval);
  }
  const task = run.tasks
    .filter((k) => k.t + k.d >= t - 250 && k.t <= t + 250)
    .reduce<Run["tasks"][number] | undefined>((x, k) => (!x || k.d > x.d ? k : x), undefined);
  const left = Math.max(0, hover.at > width - 220 ? hover.at - 200 : hover.at + 12);
  return (
    <div className="tooltip" style={{ left, top: LABELS }}>
      <div className="tooltip-title">
        <span className="num">{(t / 1000).toFixed(1)} s</span>
        {span && <span className="muted">{run.sections[span.index]?.label}</span>}
      </div>
      <div className="tooltip-row"><span>Frame rate</span><span className="num">{Math.round(fpsAround(run, stats.times, t))} fps</span></div>
      <div className="tooltip-row"><span>Longest frame</span><span className="num">{Math.round(longest)} ms</span></div>
      <div className="tooltip-row"><span>Dropped frames</span><span className="num">{dropped}</span></div>
      {task && (
        <div className="tooltip-row">
          <span>Busy with</span>
          <span className="tooltip-clip">{task.fn || task.src || task.inv || LAYOUT}</span>
        </div>
      )}
    </div>
  );
}

function sectionSpans(run: Run, times: Float64Array): Span[] {
  const spans: Span[] = [];
  let cur = -2, start = 0;
  for (let i = 0; i < run.seg.length; i++) {
    const s = run.seg[i];
    const t0 = i ? times[i - 1] : 0;
    if (s !== cur) {
      if (cur >= 0) spans.push({ index: cur, start, end: t0 });
      cur = s;
      start = t0;
    }
  }
  if (cur >= 0) spans.push({ index: cur, start, end: times[times.length - 1] ?? 0 });
  return spans;
}

interface DrawArgs {
  run: Run;
  stats: RunStats;
  spans: Span[];
  width: number;
  height: number;
  dpr: number;
  progress: number;
  highlight: number | null;
  hover: Hover | null;
  lane: boolean;
}

function draw(ctx: CanvasRenderingContext2D, a: DrawArgs) {
  const { run, stats, spans, width: W, dpr, progress, highlight, hover, lane } = a;
  const total = stats.time || 1;
  const PW = W;
  const x = (t: number) => (t / total) * PW;
  const plotBottom = LABELS + PLOT;
  const ceiling = ceilingFor(stats);
  const y = (ms: number) => plotBottom - (ms / ceiling) * PLOT;
  const px = 1 / dpr;
  const snap = (v: number) => Math.round(v * dpr) / dpr;
  const C = palette();
  ctx.clearRect(0, 0, W, a.height);
  ctx.textBaseline = "middle";

  // Sections: a hairline where each begins, its name above.
  ctx.font = `500 12px Satoshi, system-ui, sans-serif`;
  for (const s of spans) {
    const x0 = x(s.start), x1 = x(s.end);
    if (s.start > 0) {
      ctx.fillStyle = C.grid;
      ctx.fillRect(snap(x0), 0, px, plotBottom);
    }
    const label = run.sections[s.index]?.label ?? "";
    const room = x1 - x0 - 12;
    const fit = fitText(ctx, label, room);
    if (fit) {
      ctx.fillStyle = highlight === null || highlight === s.index ? (highlight === s.index ? C.ink : C.ink3) : C.grid;
      ctx.fillText(fit, x0 + (s.start > 0 ? 8 : 0), LABELS / 2 - 2);
    }
  }

  // Frame time scale lines; their labels sit in the fixed axis beside the plot.
  for (const v of ticksFor(stats, ceiling)) {
    ctx.fillStyle = v === stats.interval ? C.budget : C.grid;
    ctx.fillRect(0, snap(y(v)), PW, px);
  }

  // Frames. Wide enough ones get their own bar; dense runs collapse to one
  // device-pixel column each, keeping the longest frame in the column.
  const cols = Math.ceil(W * dpr);
  const colMax = new Float32Array(cols);
  const colDim = new Uint8Array(cols).fill(1);
  const n = run.frames.length;
  const bar = (x0: number, w: number, d: number, dim: boolean) => {
    const level = tier(d, stats.interval);
    const h = Math.max(px, Math.min(1, d / ceiling) * PLOT * progress);
    ctx.fillStyle = (dim ? C.fillDim : C.fill)[level];
    ctx.fillRect(x0, plotBottom - h, w, h);
    // Past the top of the scale: a break near the end says it ran further.
    if (d > ceiling && progress >= 1) ctx.clearRect(x0, LABELS + 4, w, 2);
  };
  for (let i = 0; i < n; i++) {
    const d = run.frames[i] / 10;
    const t0 = i ? stats.times[i - 1] : 0;
    const c0 = Math.floor(x(t0) * dpr), c1 = Math.floor(x(stats.times[i]) * dpr);
    const dim = highlight !== null && run.seg[i] !== highlight;
    if (c1 - c0 >= 3) {
      bar(c0 / dpr, (c1 - c0 - 1) / dpr, d, dim);
    } else {
      const c = Math.min(cols - 1, c1);
      if (d > colMax[c]) colMax[c] = d;
      if (!dim) colDim[c] = 0;
    }
  }
  for (let c = 0; c < cols; c++) {
    if (colMax[c] > 0) bar(c / dpr, px, colMax[c], !!colDim[c]);
  }

  // Slow scripts, where the browser reports them.
  let axisTop = plotBottom;
  if (lane) {
    const laneTop = plotBottom + 4;
    for (const t of run.tasks) {
      const dim = highlight !== null && run.seg[frameAt(stats.times, t.t)] !== highlight;
      ctx.fillStyle = dim ? C.taskDim : C.task;
      ctx.fillRect(x(t.t), laneTop + 2, Math.max(2, (t.d / total) * PW), LANE - 4);
    }
    axisTop = laneTop + LANE;
  }

  // Time axis.
  ctx.fillStyle = C.ink3;
  const step = niceStep(total / 1000, Math.max(3, Math.floor(PW / 64)));
  for (let s = 0; s * 1000 <= total; s += step) {
    const tx = x(s * 1000);
    ctx.textAlign = s === 0 ? "left" : tx > W - 20 ? "right" : "center";
    ctx.fillText(`${+s.toFixed(1)} s`, tx, axisTop + AXIS / 2 + 2);
  }
  ctx.textAlign = "left";

  if (hover) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(snap(hover.x), LABELS, px, axisTop - LABELS);
  }
}

/** The frame times worth labeling: the budget, the freeze line, then round steps. */
function ticksFor(stats: RunStats, ceiling: number): number[] {
  const ticks: number[] = [];
  for (const v of [stats.interval, FREEZE, 100, 200, 500, 1000]) {
    if (v > ceiling) break;
    const prev = ticks[ticks.length - 1];
    if (prev === undefined || ((v - prev) / ceiling) * PLOT >= TICK_GAP) ticks.push(v);
  }
  return ticks;
}

/** The frame time labels, drawn apart from the plot so they stay when it scrolls. */
function drawAxis(ctx: CanvasRenderingContext2D, stats: RunStats, height: number) {
  const ceiling = ceilingFor(stats);
  ctx.clearRect(0, 0, GUTTER, height);
  ctx.font = `400 12px Satoshi, system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = token("--ink-3");
  for (const v of ticksFor(stats, ceiling)) ctx.fillText(`${Math.round(v)} ms`, GUTTER - 8, LABELS + PLOT - (v / ceiling) * PLOT);
}

function niceStep(seconds: number, maxTicks: number): number {
  for (const s of [0.5, 1, 2, 5, 10, 15, 30, 60]) if (seconds / s <= maxTicks) return s;
  return 120;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, room: number): string {
  if (room < 24) return "";
  if (ctx.measureText(text).width <= room) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > room) s = s.slice(0, -1);
  return s.length > 2 ? `${s}…` : "";
}
