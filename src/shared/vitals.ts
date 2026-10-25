import type { Run } from "./run";
import type { Rating } from "./stats";

// One status scale for everything Cadence grades. Frame ratings map onto it,
// so a smooth section and a good paint time read the same way.

export type Level = "good" | "warn" | "bad";

export const LEVEL_LABEL: Record<Level, string> = {
  good: "Good",
  warn: "Needs work",
  bad: "Poor",
};

export const RATING_LEVEL: Record<Rating, Level> = {
  smooth: "good",
  uneven: "warn",
  choppy: "bad",
};

export interface Metric {
  key: string;
  name: string;
  /** What it measures, in one line. */
  what: string;
  /** Why it matters to the person using the page. */
  why: string;
  value?: number;
  display: string;
  level?: Level;
  /** Good at or under this, poor over `poor`. */
  good?: number;
  poor?: number;
  /** Why there's no value, when there isn't one. */
  missing?: string;
  format: (v: number) => string;
}

export function formatMs(v: number): string {
  return v >= 1000 ? `${+(v / 1000).toFixed(v >= 10000 ? 0 : 1)} s` : `${Math.round(v)} ms`;
}

const formatShift = (v: number) => (v === 0 ? "0" : v < 0.01 ? v.toFixed(3) : v.toFixed(2));
const formatCount = (v: number) => v.toLocaleString();

export function grade(value: number, good: number, poor: number): Level {
  return value <= good ? "good" : value > poor ? "bad" : "warn";
}

/**
 * Page load, graded on the Core Web Vitals thresholds (and Lighthouse's for
 * page size), most important first.
 */
export function pageLoad(run: Run): Metric[] {
  const v = run.vitals;
  const browser = run.device.browser;
  const unsupported = `${browser} doesn't report this`;
  const defs: (Omit<Metric, "display" | "level"> & { supported: boolean })[] = [
    {
      key: "lcp", why: "People judge a page as loaded when its main content shows. Google uses this in search ranking.", name: "Largest paint", what: "When the biggest image or block of text appeared.",
      value: v.lcp, good: 2500, poor: 4000, format: formatMs, supported: run.support.lcp,
    },
    {
      key: "cls", why: "Content that moves under a reader's finger causes misclicks and lost place. It's a score, not a time: how much of the screen moved, times how far. 0 means nothing moved once it appeared.", name: "Layout shift", what: "How much the page jumped around as it loaded.",
      value: v.cls ?? (run.support.shifts ? 0 : undefined), good: 0.1, poor: 0.25, format: formatShift,
      supported: run.support.shifts,
    },
    {
      key: "inp", why: "How quickly the page answers. Past 200 ms a tap starts to feel ignored.", name: "Slowest interaction", what: "The longest wait between a tap or click and the screen answering.",
      value: v.inp, good: 200, poor: 500, format: formatMs, supported: run.support.inp,
      missing: run.support.inp ? "No taps or clicks during this visit" : undefined,
    },
    {
      key: "fcp", why: "The first sign the page is working. A blank screen for long makes people leave.", name: "First paint", what: "When anything first appeared on screen.",
      value: v.fcp, good: 1800, poor: 3000, format: formatMs, supported: true,
    },
    {
      key: "ttfb", why: "Everything else waits on the server. A slow start leaves less time for the rest of the load.", name: "Server response", what: "How long the server took to send the first byte.",
      value: v.ttfb, good: 800, poor: 1800, format: formatMs, supported: true,
    },
    {
      key: "nodes", why: "Every element costs style and layout time, again on every change. Lighthouse flags pages past 800.", name: "Page size", what: "Elements on the page. More of them means slower style and layout.",
      value: v.nodes, good: 800, poor: 1400, format: formatCount, supported: true,
    },
    {
      key: "canvases", why: "Not graded: one canvas can be cheap or very costly. Worth checking when a section with canvases runs slow.", name: "Canvases", what: "Canvas elements, often WebGL. Each one draws on the GPU every frame it animates.",
      value: v.canvases, format: formatCount, supported: true,
    },
  ];
  return defs.map(({ supported, ...m }) => ({
    ...m,
    display: m.value !== undefined ? m.format(m.value) : "",
    level: m.value !== undefined && m.good !== undefined ? grade(m.value, m.good, m.poor!) : undefined,
    missing: m.value !== undefined ? undefined : supported ? m.missing ?? "Not measured" : unsupported,
  }));
}

export interface Series {
  /** [ms from start, value] */
  samples: [number, number][];
  start: number;
  end: number;
  peak: number;
  change: number;
  grew: boolean;
}

export interface MemoryReport {
  /** The JavaScript heap in MB, or null when it couldn't be measured. */
  heap: Series | null;
  /** Why the heap is missing, when it is. */
  heapNote: string;
  /** Elements on the page. Missing on runs from before it was recorded. */
  nodes: Series | null;
  level: Level;
  text: string;
}

/** Heap growth past this, and past a fifth of where it started, is worth a look. */
const GROWTH_MB = 10;
/** Element growth past this, and past a fifth of where it started. */
const GROWTH_NODES = 500;

function series(samples: [number, number][], min: number): Series {
  const start = samples[0][1], end = samples[samples.length - 1][1];
  const change = end - start;
  return {
    samples, start, end, change,
    peak: Math.max(...samples.map(([, v]) => v)),
    grew: change > min && change / start > 0.2,
  };
}

/** Why this run has no heap figure worth showing, or "" when it has one. */
export function heapMissing(run: Run): string {
  if (!run.support.memory) return `${run.device.browser} doesn't expose memory use to pages. Chromium browsers, like Chrome, Edge, Arc and Dia, do.`;
  if (run.mem.length < 2) return "The heap wasn't measured on this run.";
  if (run.mem.every(([, v]) => v === run.mem[0][1])) {
    return "Chromium browsers only give pages a rounded heap figure that they rarely refresh, and it didn't change during this run, so it isn't shown. Page elements are the leak signal to watch instead.";
  }
  return "";
}

/**
 * Memory over the run, only from numbers that are real. Most pages can read
 * just a rounded heap figure that Chromium browsers rarely refresh, so a heap that
 * never moved is left out rather than called steady. Page elements are exact
 * everywhere, and elements that pile up are the most common leak.
 */
export function memory(run: Run): MemoryReport | null {
  const nodes = run.dom && run.dom.length >= 2 ? series(run.dom, GROWTH_NODES) : null;

  const heapNote = heapMissing(run);
  const heap: MemoryReport["heap"] = heapNote
    ? null
    : series(run.mem.map(([t, v]) => [t, v / 10]), GROWTH_MB);

  if (!heap && !nodes) return null;
  const grew = !!heap?.grew || !!nodes?.grew;
  const parts: string[] = [];
  if (heap?.grew) parts.push(`the heap grew ${heap.change.toFixed(1)} MB`);
  if (nodes?.grew) parts.push(`the page gained ${nodes.change.toLocaleString()} elements`);
  const text = grew
    ? `During the run ${parts.join(" and ")}. Lazy loading can explain some of it. Run it again: if it keeps climbing, something is holding on.`
    : heap
      ? "Held steady during the run, with nothing building up."
      : "The page kept the same elements during the run, with nothing building up.";
  return { heap, heapNote, nodes, level: grew ? "warn" : "good", text };
}
