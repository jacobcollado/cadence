import { estimateHz } from "../shared/stats";

export const RING = 240;

export interface Recording {
  start: number;
  frames: number[];
  scroll: number[];
  seg: number[];
}

/**
 * Watches every frame the browser paints. One requestAnimationFrame loop,
 * nothing else on the hot path: the gap between frame timestamps is the frame
 * duration, and anything past the refresh interval is a frame the screen
 * showed twice.
 */
export class Monitor {
  /**
   * Refresh rate: the fastest steady cadence seen this session. Frames can't
   * arrive faster than the screen refreshes, so a slow stretch never lowers it.
   */
  best = 0;
  /** Last RING frame durations, oldest first once full. */
  ring = new Float32Array(RING);
  ringCount = 0;
  ringHead = 0;
  scrollY = scrollY;
  section = -1;
  rec: Recording | null = null;
  onFrame: ((now: number, duration: number) => void)[] = [];

  private last = 0;
  private skip = true;
  private sinceEstimate = 0;
  private raf = 0;

  start() {
    addEventListener("scroll", this.onScroll, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibility);
    this.raf = requestAnimationFrame(this.tick);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    removeEventListener("scroll", this.onScroll);
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  record(): Recording {
    this.rec = { start: performance.now(), frames: [], scroll: [], seg: [] };
    return this.rec;
  }

  endRecording(): Recording | null {
    const rec = this.rec;
    this.rec = null;
    return rec;
  }

  /** Durations of the newest `count` frames, oldest first. */
  recent(count = RING): number[] {
    const n = Math.min(count, this.ringCount);
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) out[i] = this.ring[(this.ringHead - n + i + RING) % RING];
    return out;
  }

  get hz(): number {
    return this.best || 60;
  }

  /** fps across the last `ms` of frames. */
  fps(ms = 1000): number {
    let elapsed = 0, count = 0;
    for (let i = 1; i <= this.ringCount && elapsed < ms; i++) {
      elapsed += this.ring[(this.ringHead - i + RING) % RING];
      count++;
    }
    return elapsed > 0 ? Math.min(this.hz, (count / elapsed) * 1000) : this.hz;
  }

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    if (!this.skip && this.last) {
      const d = now - this.last;
      this.ring[this.ringHead] = d;
      this.ringHead = (this.ringHead + 1) % RING;
      if (this.ringCount < RING) this.ringCount++;
      if (++this.sinceEstimate >= 60) {
        this.sinceEstimate = 0;
        this.best = Math.max(this.best, estimateHz(this.recent()));
      }
      const rec = this.rec;
      if (rec) {
        rec.frames.push(Math.round(d * 10));
        rec.scroll.push(Math.round(this.scrollY));
        rec.seg.push(this.section);
      }
      for (const fn of this.onFrame) fn(now, d);
    } else {
      for (const fn of this.onFrame) fn(now, 0);
    }
    this.skip = false;
    this.last = now;
  };

  private onScroll = () => {
    this.scrollY = scrollY;
  };

  // A hidden tab stops painting. The gap that follows isn't a slow frame, so
  // the first frame back is skipped.
  private onVisibility = () => {
    this.skip = true;
  };
}
