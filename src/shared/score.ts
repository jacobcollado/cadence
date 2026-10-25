import { FREEZE, type RunStats } from "./stats";
import type { Level, MemoryReport, Metric } from "./vitals";

// Scores out of 100, the way Lighthouse gives them, so they read the way
// people already expect: 90 and up is good, 50 to 89 needs work, under 50 is
// poor. Each measurement is scored on Lighthouse's log-normal curve, pinned
// so that Cadence's own "good" threshold scores 90 and its "poor" threshold
// scores 50. A category's score is a weighted mean of its measurements, and
// the overall score a weighted mean of the categories that were measured.

/** The band a score falls in, on the same scale as every other grade. */
export function scoreLevel(score: number): Level {
  return score >= 90 ? "good" : score >= 50 ? "warn" : "bad";
}

// Lighthouse's approximation of the error function.
function erf(x: number): number {
  const sign = Math.sign(x);
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return sign * (1 - y * Math.exp(-x * x));
}

/** 0 to 1 for a value where lower is better: `good` scores 0.9, `poor` 0.5. */
export function curve(value: number, good: number, poor: number): number {
  if (value <= 0) return 1;
  const standardized = (Math.log(value / poor) * 0.9061938024368232) / -Math.log(good / poor);
  return Math.min(1, Math.max(0, (1 - erf(standardized)) / 2));
}

type Part = { score: number; weight: number };

function mean(parts: Part[]): number | null {
  const total = parts.reduce((n, p) => n + p.weight, 0);
  if (!total) return null;
  return Math.round((parts.reduce((n, p) => n + p.score * p.weight, 0) / total) * 100);
}

/** Keeps a score inside the band its word already says, so the two never disagree. */
function within(score: number, level: Level): number {
  return level === "good" ? Math.max(score, 90) : level === "warn" ? Math.min(Math.max(score, 50), 89) : Math.min(score, 49);
}

/**
 * Smoothness: the frame rate against the screen's (half the weight), the
 * share of frames on time, and the longest frame. Pinned to the same lines
 * as the Smooth rating: 92% of the refresh rate, 95% on time, nothing over
 * 50 ms.
 */
export const SMOOTH_WEIGHTS = { fps: 50, onTime: 30, worst: 20 };

export function smoothScore(stats: RunStats): number {
  const raw = mean([
    { score: curve(1 - Math.min(1, stats.fps / stats.hz), 0.08, 0.25), weight: SMOOTH_WEIGHTS.fps },
    { score: curve(1 - stats.onTime, 0.05, 0.25), weight: SMOOTH_WEIGHTS.onTime },
    { score: curve(stats.worst, FREEZE, 200), weight: SMOOTH_WEIGHTS.worst },
  ])!;
  return within(raw, stats.rating === "smooth" ? "good" : stats.rating === "uneven" ? "warn" : "bad");
}

/** Page load, weighted like Lighthouse leans: the main paint and layout shift count most. */
export const LOAD_WEIGHTS: Record<string, number> = { lcp: 30, cls: 25, fcp: 15, inp: 15, ttfb: 10, nodes: 5 };

export function loadScore(metrics: Metric[]): number | null {
  return mean(metrics
    .filter((m) => m.value !== undefined && m.good !== undefined && LOAD_WEIGHTS[m.key])
    .map((m) => ({ score: curve(m.value!, m.good!, m.poor!), weight: LOAD_WEIGHTS[m.key] })));
}

/**
 * Memory: how much the heap and the page's elements grew, as a share of where
 * they started. Steady is good; growth Cadence flags lands in needs work.
 */
export function memoryScore(mem: MemoryReport | null): number | null {
  if (!mem) return null;
  const parts = [mem.heap, mem.nodes]
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map((s) => ({ score: curve(Math.max(0, s.change) / (s.start || 1), 0.1, 0.5), weight: 1 }));
  // The weakest measure decides: one leak is enough.
  const worst = Math.round(Math.min(...parts.map((p) => p.score)) * 100);
  return within(worst, mem.level);
}

/** The overall score: smoothness counts most, since that's what Cadence is for. */
export const CATEGORY_WEIGHTS = { smooth: 50, load: 30, memory: 20 };

export interface Scores {
  overall: number;
  smooth: number;
  load: number | null;
  memory: number | null;
}

export function scores(stats: RunStats, metrics: Metric[], mem: MemoryReport | null): Scores {
  const smooth = smoothScore(stats);
  const load = loadScore(metrics);
  const memory = memoryScore(mem);
  const overall = mean([
    { score: smooth / 100, weight: CATEGORY_WEIGHTS.smooth },
    ...(load !== null ? [{ score: load / 100, weight: CATEGORY_WEIGHTS.load }] : []),
    ...(memory !== null ? [{ score: memory / 100, weight: CATEGORY_WEIGHTS.memory }] : []),
  ])!;
  return { overall, smooth, load, memory };
}
