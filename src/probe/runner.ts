import { estimateHz } from "../shared/stats";
import { shortId, type Device, type Mode, type Run } from "../shared/run";
import type { Monitor } from "./monitor";
import type { Observers } from "./observers";
import type { Sections } from "./sections";

export type Phase = "ready" | "settling" | "running" | "finishing";

const SPEED: Partial<Record<Mode, number>> = { steady: 1, fast: 4 };
const LIMIT: Partial<Record<Mode, number>> = { idle: 10_000, manual: 120_000 };
const SETTLE = 900;

interface Lenis {
  scrollTo(target: number, options?: { immediate?: boolean; force?: boolean }): void;
}

/**
 * Drives a run: puts the page in its starting place, scrolls it (or doesn't),
 * adds load if asked, and hands back a finished Run.
 */
export class Runner {
  phase: Phase = "ready";
  mode: Mode = "steady";
  load = 0;
  elapsed = 0;
  progress = 0;
  onPhase?: () => void;
  onDone?: (run: Run) => void;

  private began = 0;
  private settleUntil = 0;
  private max = 0;
  private ticks = 0;
  private memTimer = 0;
  private mem: [number, number][] = [];
  private sectionsAtStart: Run["sections"] = [];

  constructor(
    private monitor: Monitor,
    private sections: Sections,
    private observers: Observers,
    private device: Promise<Device>,
  ) {
    monitor.onFrame.push(this.frame);
  }

  start(mode: Mode, load: number) {
    if (this.phase !== "ready") return;
    this.mode = mode;
    this.load = load;
    this.elapsed = 0;
    this.progress = 0;
    if (SPEED[mode]) {
      scrollToY(0);
      this.settleUntil = performance.now() + SETTLE;
      this.setPhase("settling");
    } else {
      this.begin();
    }
  }

  stop() {
    if (this.phase === "settling") {
      this.setPhase("ready");
    } else if (this.phase === "running") {
      this.finish();
    }
  }

  private begin() {
    this.max = scrollMax();
    this.sectionsAtStart = this.sections.layout();
    this.mem = [];
    const rec = this.monitor.record();
    this.began = rec.start;
    if (this.observers.support.memory) {
      const sample = () => {
        const heap = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
        if (heap) this.mem.push([Math.round(performance.now() - this.began), Math.round(heap.usedJSHeapSize / 1e5)]);
      };
      sample();
      this.memTimer = window.setInterval(sample, 500);
    }
    this.setPhase("running");
  }

  private frame = (now: number) => {
    if (this.load && this.phase !== "ready") burn(this.load);

    if (this.phase === "settling" && now >= this.settleUntil) this.begin();
    if (this.phase !== "running") return;

    this.elapsed = now - this.began;
    const speed = SPEED[this.mode];
    if (speed) {
      // Pages can grow as they lazy-load; check the height now and then.
      if (++this.ticks % 30 === 0) this.max = scrollMax();
      const y = Math.min(this.max, (this.elapsed / 1000) * speed * innerHeight);
      scrollToY(y);
      this.progress = this.max ? y / this.max : 1;
      if (y >= this.max) this.finish();
    } else {
      const limit = LIMIT[this.mode]!;
      this.progress = Math.min(1, this.elapsed / limit);
      if (this.elapsed >= limit) this.finish();
    }
  };

  private async finish() {
    this.phase = "finishing";
    clearInterval(this.memTimer);
    const rec = this.monitor.endRecording();
    if (!rec || rec.frames.length < 2) return this.setPhase("ready");

    const t0 = rec.start;
    const t1 = performance.now();
    // The frame that ended the run is still open; its long-frame entry
    // arrives a moment later.
    await new Promise((r) => setTimeout(r, 250));
    this.observers.flush();
    const within = (t: number) => t >= t0 && t <= t1;

    const run: Run = {
      v: 1,
      id: shortId(),
      at: Date.now(),
      url: location.href.replace(/([?&])perf(?:=[^&#]*)?(?:&|(?=#)|$)/, "$1").replace(/[?&](?=#|$)/, ""),
      title: document.title,
      mode: this.mode,
      load: this.load,
      hz: Math.max(this.monitor.best, estimateHz(rec.frames.map((f) => f / 10))) || 60,
      device: await this.device,
      frames: rec.frames,
      scroll: rec.scroll,
      seg: rec.seg,
      sections: this.sectionsAtStart,
      tasks: this.observers.tasks
        .filter((t) => within(t.start))
        .map(({ start, d, b, src, fn, inv }) => ({
          t: Math.round(start - t0), d: Math.round(d), b: Math.round(b), src, fn, inv,
        })),
      shifts: this.observers.shifts
        .filter(([t]) => within(t))
        .map(([t, v]) => [Math.round(t - t0), Math.round(v * 10000)]),
      mem: this.mem,
      vitals: this.observers.snapshot(),
      support: this.observers.support,
    };
    this.onDone?.(run);
    this.setPhase("ready");
  }

  private setPhase(p: Phase) {
    this.phase = p;
    this.onPhase?.();
  }
}

function scrollMax() {
  return Math.max(0, document.documentElement.scrollHeight - innerHeight);
}

function scrollToY(y: number) {
  const w = window as Window & { __lenis?: Lenis; lenis?: Lenis };
  const lenis = w.__lenis ?? w.lenis;
  if (lenis?.scrollTo) lenis.scrollTo(y, { immediate: true, force: true });
  else scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
}

/** Hold the main thread, the way a slower processor would. */
function burn(ms: number) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    // spin
  }
}
