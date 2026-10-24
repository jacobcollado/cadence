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
      key: "lcp", name: "Largest paint", what: "When the biggest image or block of text appeared.",
      value: v.lcp, good: 2500, poor: 4000, format: formatMs, supported: run.support.lcp,
    },
    {
      key: "cls", name: "Layout shift", what: "How much the page jumped around as it loaded.",
      value: v.cls ?? (run.support.shifts ? 0 : undefined), good: 0.1, poor: 0.25, format: formatShift,
      supported: run.support.shifts,
    },
    {
      key: "inp", name: "Slowest interaction", what: "The longest wait between a tap or click and the screen answering.",
      value: v.inp, good: 200, poor: 500, format: formatMs, supported: run.support.inp,
      missing: run.support.inp ? "No taps or clicks during this visit" : undefined,
    },
    {
      key: "fcp", name: "First paint", what: "When anything first appeared on screen.",
      value: v.fcp, good: 1800, poor: 3000, format: formatMs, supported: true,
    },
    {
      key: "ttfb", name: "Server response", what: "How long the server took to send the first byte.",
      value: v.ttfb, good: 800, poor: 1800, format: formatMs, supported: true,
    },
    {
      key: "nodes", name: "Page size", what: "Elements on the page. More of them means slower style and layout.",
      value: v.nodes, good: 800, poor: 1400, format: formatCount, supported: true,
    },
    {
      key: "canvases", name: "Canvases", what: "Canvas elements, often WebGL. Each one draws on the GPU every frame it animates.",
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

export interface MemoryReport {
  /** [ms from start, MB] */
  samples: [number, number][];
  start: number;
  end: number;
  peak: number;
  change: number;
  level: Level;
  text: string;
}

/** Growth past this, and past a fifth of where it started, is worth a look. */
const GROWTH_MB = 10;

export function memory(run: Run): MemoryReport | null {
  if (!run.support.memory || run.mem.length < 2) return null;
  const samples = run.mem.map(([t, v]) => [t, v / 10] as [number, number]);
  const start = samples[0][1], end = samples[samples.length - 1][1];
  const peak = Math.max(...samples.map(([, v]) => v));
  const change = end - start;
  const grew = change > GROWTH_MB && change / start > 0.2;
  return {
    samples, start, end, peak, change,
    level: grew ? "warn" : "good",
    text: grew
      ? `Grew ${change.toFixed(1)} MB during the run. Run it again: if it keeps climbing, something is holding on to memory.`
      : "Held steady during the run, with nothing building up.",
  };
}
