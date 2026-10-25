import type { Run } from "./run";

// Everything the report says is derived here, so the overlay on the device and
// the full report in the app can never disagree.

const RATES = [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 180, 240];

/** Snap a measured frame interval to the refresh rate it most likely is. */
export function snapHz(interval: number): number {
  const raw = 1000 / interval;
  let best = RATES[0];
  for (const r of RATES) if (Math.abs(r - raw) < Math.abs(best - raw)) best = r;
  return Math.abs(best - raw) / best < 0.08 ? best : Math.round(raw);
}

/**
 * Refresh rate from a set of frame durations: the fast end of the spread.
 * Below 60 only counts when the cadence is steady, the way Low Power Mode
 * holds Safari to an even 30. An uneven slow cadence is a slow page on a
 * screen whose real rate never showed, so it reads as 60.
 */
export function estimateHz(durations: ArrayLike<number>): number {
  const n = durations.length;
  if (n < 30) return 0;
  const sorted = Array.from(durations).sort((a, b) => a - b);
  const fast = sorted[Math.floor(n * 0.2)];
  const slow = sorted[Math.floor(n * 0.8)];
  const hz = snapHz(fast);
  if (hz >= 60) return hz;
  return slow / fast < 1.1 ? hz : 60;
}

/** Frames the display showed again because this one ran long. */
export function missed(duration: number, interval: number): number {
  return Math.max(0, Math.round(duration / interval) - 1);
}

/**
 * A frame this long is a freeze: the page visibly stops and jumps, whatever
 * the refresh rate. It's also where browsers start reporting slow scripts.
 */
export const FREEZE = 50;

/** How a frame landed: 0 on time, 1 late, 2 a freeze. */
export function tier(duration: number, interval: number): 0 | 1 | 2 {
  if (duration >= FREEZE) return 2;
  return missed(duration, interval) > 0 ? 1 : 0;
}

export type Rating = "smooth" | "uneven" | "choppy";

export const RATING_LABEL: Record<Rating, string> = {
  smooth: "Smooth",
  uneven: "Uneven",
  choppy: "Choppy",
};

/**
 * Smooth holds the refresh rate with nothing frozen. Choppy falls under three
 * quarters of 60 fps (or of the screen, when it's slower than 60), the point
 * where scrolling stops looking continuous. Uneven is everything between.
 */
export function rate(fps: number, onTime: number, worst: number, hz: number): Rating {
  if (fps >= hz * 0.92 && onTime >= 0.95 && worst < FREEZE) return "smooth";
  // Judged on the number people see, so a run shown as 45 is never called under 45.
  if (Math.round(fps) < choppyBelow(hz)) return "choppy";
  return "uneven";
}

export function choppyBelow(hz: number): number {
  return Math.round(Math.min(hz, 60) * 0.75);
}

export interface SectionStats {
  index: number;
  label: string;
  /** Time on screen, ms. */
  time: number;
  frames: number;
  fps: number;
  dropped: number;
  /** Frames that missed their refresh. */
  late: number;
  /** Frames of FREEZE ms or more. */
  freezes: number;
  worst: number;
  tasks: number;
  rating: Rating;
}

export interface RunStats {
  hz: number;
  interval: number;
  time: number;
  frames: number;
  fps: number;
  dropped: number;
  worst: number;
  p95: number;
  /** Share of frames that landed on the next refresh. */
  onTime: number;
  late: number;
  freezes: number;
  rating: Rating;
  sections: SectionStats[];
  /** Sections on screen long enough to judge. */
  judged: SectionStats[];
  worstSection?: SectionStats;
  sentence: string;
  /** Frame end times, ms from start, one per frame. */
  times: Float64Array;
}

export const MIN_SECTION_TIME = 250;

export function computeStats(run: Run): RunStats {
  const hz = run.hz;
  const interval = 1000 / hz;
  const n = run.frames.length;
  const times = new Float64Array(n);
  const durations = new Float64Array(n);

  const per = run.sections.map((s, index) => ({
    index, label: s.label, time: 0, frames: 0, dropped: 0, worst: 0, tasks: 0, late: 0, freezes: 0,
  }));

  let time = 0, dropped = 0, worst = 0, late = 0, freezes = 0;
  for (let i = 0; i < n; i++) {
    const d = run.frames[i] / 10;
    durations[i] = d;
    time += d;
    times[i] = time;
    const m = missed(d, interval);
    const frozen = d >= FREEZE;
    dropped += m;
    if (m > 0) late++;
    if (frozen) freezes++;
    if (d > worst) worst = d;
    const s = per[run.seg[i]];
    if (s) {
      s.time += d;
      s.frames++;
      s.dropped += m;
      if (m > 0) s.late++;
      if (frozen) s.freezes++;
      if (d > s.worst) s.worst = d;
    }
  }

  for (const t of run.tasks) {
    const s = per[run.seg[frameAt(times, t.t)]];
    if (s) s.tasks++;
  }

  const sorted = Array.from(durations).sort((a, b) => a - b);
  const p95 = sorted[Math.floor(n * 0.95)] ?? 0;
  const fps = time > 0 ? Math.min(hz, (n / time) * 1000) : 0;
  const onTime = n ? 1 - late / n : 1;

  const sections: SectionStats[] = per.map((s) => {
    const fps = s.time > 0 ? Math.min(hz, (s.frames / s.time) * 1000) : 0;
    const onTime = s.frames ? 1 - s.late / s.frames : 1;
    return {
      index: s.index, label: s.label, time: s.time, frames: s.frames, fps, dropped: s.dropped,
      late: s.late, freezes: s.freezes, worst: s.worst, tasks: s.tasks, rating: rate(fps, onTime, s.worst, hz),
    };
  });

  const judged = sections.filter((s) => s.time >= MIN_SECTION_TIME);
  const worstSection = judged.length
    ? judged.reduce((a, b) => (b.fps < a.fps ? b : a))
    : undefined;

  // A run is only as smooth as its roughest section: one that wasn't smooth
  // makes the run uneven, though never choppy on its own.
  let rating = rate(fps, onTime, worst, hz);
  if (rating === "smooth" && judged.some((s) => s.rating !== "smooth")) rating = "uneven";

  const stats: RunStats = {
    hz, interval, time, frames: n, fps, dropped, worst, p95, onTime, late, freezes,
    rating, sections, judged, worstSection, sentence: "", times,
  };
  stats.sentence = sentence(stats);
  return stats;
}

function sentence(s: RunStats): string {
  const fps = (v: number) => `${Math.round(v)} fps`;
  const frames = (v: number) => `${v} dropped frame${v === 1 ? "" : "s"}`;
  const full = (x: { fps: number }) => x.fps >= s.hz * 0.92;

  if (s.judged.length <= 1) {
    const where = s.judged[0] ? ` on ${s.judged[0].label}` : "";
    if (s.rating === "smooth") return `Held the full ${s.hz} Hz${where}, ${frames(s.dropped)}.`;
    if (full(s)) return `Held ${s.hz} Hz${where}, but froze for ${Math.round(s.worst)} ms.`;
    return `Averaged ${fps(s.fps)}${where}, ${frames(s.dropped)}.`;
  }

  const smooth = s.judged.filter((x) => x.rating === "smooth").length;
  if (smooth === s.judged.length) {
    return `Smooth through all ${s.judged.length} sections at the full ${s.hz} Hz.`;
  }
  // The section to look at first: the slowest of the ones that weren't smooth.
  const w = s.judged.filter((x) => x.rating !== "smooth").reduce((a, b) => (b.fps < a.fps ? b : a));
  const what = full(w) ? `${w.label} froze for ${Math.round(w.worst)} ms` : `${w.label} dropped to ${fps(w.fps)}`;
  if (smooth === 0) {
    return full(w) ? `No section ran smoothly. ${what}.` : `No section held ${s.hz} fps. ${w.label} was the slowest at ${fps(w.fps)}.`;
  }
  return `Smooth through ${smooth} of ${s.judged.length} sections. ${what}.`;
}

export interface Culprit {
  /** Function name, the script itself when the browser gave no name, or LAYOUT. */
  name: string;
  /** The script file, when the name is a function in it. */
  file?: string;
  count: number;
  total: number;
  longest: number;
  sections: string[];
}

/** What held frames up most: the kind of work a fix should start with. */
export type CauseKind = "script" | "layout" | "drawing" | "steady" | "unknown";

export interface Cause {
  /** Freezes that happened while a slow script was running. */
  scripted: number;
  /** Freezes with no script, but the browser busy with style and layout. */
  laidOut: number;
  /** Freezes with the main thread idle, so the time went to drawing. */
  drawn: number;
  /**
   * Freezes too close to FREEZE for the browser to have reported: the work
   * behind them can be just under 50 ms, so no report doesn't mean drawing.
   */
  untraced: number;
  /** The main cause, or null when nothing ran late. */
  kind: CauseKind | null;
  culprits: Culprit[];
  /** One plain sentence on why frames ran late, empty when none did. */
  text: string;
}

/** What a long frame with no script in it was spent on. */
export const LAYOUT = "Style and layout";

/**
 * Why frames ran late. A long frame report with a script in it was held up by
 * JavaScript; one with no script was the browser working out style and
 * layout. A freeze with no report at all means the main thread had finished,
 * so the time went to drawing. Late frames under FREEZE can't be split this way.
 */
export function diagnose(run: Run, s: RunStats): Cause {
  const tasks = run.tasks;
  const hasScript = (t: Run["tasks"][number]) => !!(t.src || t.fn || t.inv);
  let scripted = 0, laidOut = 0, drawn = 0, untraced = 0, tracedDrops = 0;
  for (let i = 0; i < run.frames.length; i++) {
    const d = run.frames[i] / 10;
    if (d < FREEZE) continue;
    const end = s.times[i], start = end - d;
    const during = tasks.filter((t) => t.t < end && t.t + t.d > start);
    // A frame shows on screen at the next refresh, so one measured at 50 ms
    // may hold under 50 ms of work, which browsers don't report. Only a frame
    // a full refresh past that with no report can be put down to drawing.
    if (!during.length && d < FREEZE + s.interval) {
      untraced++;
      continue;
    }
    tracedDrops += missed(d, s.interval);
    if (during.some(hasScript)) scripted++;
    else if (during.length) laidOut++;
    else drawn++;
  }

  const groups = new Map<string, Culprit>();
  for (const t of tasks) {
    const name = t.fn || t.src || t.inv || LAYOUT;
    const file = t.fn ? t.src : undefined;
    const key = `${name} ${file ?? ""}`;
    const g = groups.get(key) ?? { name, file, count: 0, total: 0, longest: 0, sections: [] };
    g.count++;
    g.total += t.d;
    g.longest = Math.max(g.longest, t.d);
    const label = run.sections[run.seg[frameAt(s.times, t.t)]]?.label;
    if (label && !g.sections.includes(label)) g.sections.push(label);
    groups.set(key, g);
  }
  const culprits = [...groups.values()].sort((a, b) => b.total - a.total);

  const n = scripted + laidOut + drawn;
  // When some freezes went untraced, the counts below cover only the rest.
  const over = untraced ? "the browser traced" : `over ${FREEZE} ms`;
  const all = n === 1 ? "the freeze" : n === 2 ? "both freezes" : `all ${n} freezes`;
  const the = n === 1 ? "the freeze" : `the ${n} freezes`;
  const causes: [number, string][] = [
    [scripted, "slow scripts"],
    [laidOut, "style and layout"],
    [drawn, "drawing, like effects, large images or WebGL"],
  ];
  const found = causes.filter(([c]) => c > 0);

  let text = "";
  if (s.rating === "smooth" && !s.freezes) {
    text = "";
  } else if (!run.support.loaf) {
    text = `${run.device.browser} doesn't report which scripts were running, so this run can't say what held frames up. A run in a Chromium browser, like Chrome, Edge, Arc or Dia, on the same page can.`;
  } else if (n && found.length > 1) {
    const parts = found.map(([c, what], i) => (i ? `${c} from ${what}` : `${c} came from ${what}`));
    text = `Of the ${n} freezes ${over}, ${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}.`;
  } else if (n && scripted) {
    text = `A slow script was running during ${all} ${over}, so JavaScript held the page up.`;
  } else if (n && laidOut) {
    text = `No script ran long during ${the} ${over}. The browser was busy with style and layout instead, which usually comes from large DOM changes or costly CSS.`;
  } else if (n) {
    text = `No script ran long during ${the} ${over}, so the time went to drawing rather than JavaScript: effects, large images or WebGL.`;
  } else if (s.freezes) {
    text = "Frames kept running late, some by a few refreshes, but none long enough for the browser to trace. That usually means steady work every frame, from scroll-linked scripts, effects or animation.";
  } else if (s.late) {
    text = "Frames ran a little late, again and again, with no single long stall. That usually means steady work every frame, from scroll-linked scripts, effects or animation.";
  }
  // Long freezes can be traced; shorter late frames can't. Say so when they
  // are most of the problem.
  if (n && run.support.loaf && tracedDrops < s.dropped / 2) {
    text += " Most dropped frames were too short for the browser to trace to a script.";
  }
  let kind: CauseKind | null = null;
  if (!text) kind = null;
  else if (!run.support.loaf) kind = "unknown";
  else if (n) kind = scripted >= laidOut && scripted >= drawn ? "script" : laidOut >= drawn ? "layout" : "drawing";
  else kind = "steady";
  return { scripted, laidOut, drawn, untraced, kind, culprits, text };
}
/** Index of the frame in progress at time t (ms from start). */
export function frameAt(times: Float64Array, t: number): number {
  let lo = 0, hi = times.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** fps across a window of time centered on t. */
export function fpsAround(run: Run, times: Float64Array, t: number, span = 500): number {
  const a = frameAt(times, t - span / 2);
  const b = frameAt(times, t + span / 2);
  const start = a > 0 ? times[a - 1] : 0;
  const elapsed = times[b] - start;
  return elapsed > 0 ? Math.min(run.hz, ((b - a + 1) / elapsed) * 1000) : run.hz;
}

export const MODE_LABEL: Record<Run["mode"], string> = {
  steady: "Steady scroll",
  fast: "Fast scroll",
  idle: "Idle",
  manual: "Manual",
};
