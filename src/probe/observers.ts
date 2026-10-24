import type { Support, Vitals } from "../shared/run";

export interface RawTask {
  start: number;
  d: number;
  b: number;
  src?: string;
  fn?: string;
  inv?: string;
}

interface ScriptTiming {
  duration: number;
  sourceURL?: string;
  sourceFunctionName?: string;
  invoker?: string;
}

interface LoAF extends PerformanceEntry {
  blockingDuration?: number;
  scripts?: ScriptTiming[];
}

const MAX = 600;

/**
 * Everything the browser reports on its own: long animation frames, layout
 * shifts, paint and interaction timings. Each is used only where the browser
 * supports it; the rest is marked unsupported rather than reported as zero.
 */
export class Observers {
  support: Support;
  tasks: RawTask[] = [];
  shifts: [number, number][] = [];
  private vitals: Vitals = {};
  private clsWindow = { value: 0, first: 0, last: 0 };
  private observers: { o: PerformanceObserver; fn: (e: PerformanceEntry) => void }[] = [];

  constructor(private probeSrc: string) {
    const types = PerformanceObserver.supportedEntryTypes ?? [];
    this.support = {
      loaf: types.includes("long-animation-frame") || types.includes("longtask"),
      shifts: types.includes("layout-shift"),
      memory: "memory" in performance,
      inp: types.includes("event"),
      lcp: types.includes("largest-contentful-paint"),
    };

    if (types.includes("long-animation-frame")) {
      this.observe("long-animation-frame", (e) => this.onLoaf(e as LoAF));
    } else if (types.includes("longtask")) {
      this.observe("longtask", (e) =>
        this.push({ start: e.startTime, d: e.duration, b: Math.max(0, e.duration - 50) }),
      );
    }
    if (this.support.shifts) this.observe("layout-shift", (e) => this.onShift(e));
    if (this.support.lcp) {
      this.observe("largest-contentful-paint", (e) => (this.vitals.lcp = Math.round(e.startTime)));
    }
    if (types.includes("paint")) {
      this.observe("paint", (e) => {
        if (e.name === "first-contentful-paint") this.vitals.fcp = Math.round(e.startTime);
      });
    }
    if (this.support.inp) {
      this.observe("event", (e) => {
        const ev = e as PerformanceEntry & { interactionId?: number };
        if (ev.interactionId && e.duration > (this.vitals.inp ?? 0)) this.vitals.inp = Math.round(e.duration);
      }, { durationThreshold: 16 });
    }
  }

  snapshot(): Vitals {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return {
      ...this.vitals,
      ttfb: nav ? Math.round(nav.responseStart) : undefined,
      nodes: document.getElementsByTagName("*").length,
      canvases: document.getElementsByTagName("canvas").length,
    };
  }

  /** Take entries the browser has queued but not yet delivered. */
  flush() {
    for (const { o, fn } of this.observers) o.takeRecords().forEach(fn);
  }

  disconnect() {
    for (const { o } of this.observers) o.disconnect();
  }

  private observe(type: string, fn: (e: PerformanceEntry) => void, extra: Record<string, unknown> = {}) {
    try {
      const o = new PerformanceObserver((list) => list.getEntries().forEach(fn));
      o.observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
      this.observers.push({ o, fn });
    } catch {}
  }

  private onLoaf(e: LoAF) {
    const top = (e.scripts ?? []).reduce<ScriptTiming | undefined>(
      (a, s) => (!a || s.duration > a.duration ? s : a),
      undefined,
    );
    const src = top?.sourceURL ? this.shortSource(top.sourceURL) : undefined;
    this.push({
      start: e.startTime,
      d: e.duration,
      b: e.blockingDuration ?? Math.max(0, e.duration - 50),
      src,
      fn: top?.sourceFunctionName || undefined,
      inv: top?.invoker || undefined,
    });
  }

  private onShift(e: PerformanceEntry) {
    const s = e as PerformanceEntry & { value: number; hadRecentInput: boolean };
    if (s.hadRecentInput) return;
    this.shifts.push([s.startTime, s.value]);
    if (this.shifts.length > MAX) this.shifts.shift();
    // CLS: the worst burst of shifts, each burst under 5s with gaps under 1s.
    const w = this.clsWindow;
    if (w.value && s.startTime - w.last < 1000 && s.startTime - w.first < 5000) {
      w.value += s.value;
    } else {
      w.value = s.value;
      w.first = s.startTime;
    }
    w.last = s.startTime;
    this.vitals.cls = Math.max(this.vitals.cls ?? 0, Math.round(w.value * 1000) / 1000);
  }

  private push(t: RawTask) {
    this.tasks.push(t);
    if (this.tasks.length > MAX) this.tasks.shift();
  }

  private shortSource(url: string): string {
    if (url === this.probeSrc) return "Cadence";
    try {
      const u = new URL(url, location.href);
      const file = u.pathname.split("/").filter(Boolean).pop() ?? u.pathname;
      return u.origin === location.origin ? file : `${u.host}/${file}`;
    } catch {
      return url;
    }
  }
}
