import { useEffect, useRef } from "react";
import { reducedMotion } from "../../shared/motion";
import { estimateHz, missed } from "../../shared/stats";
import { token, useTheme } from "../theme";

// The hero's visual: a ring of 60 dots fed by this browser's real frames. Each
// dot covers a fifteenth of a second, so the head goes round every four
// seconds. A dot turns red when one of its frames dropped. The center shows
// the current frame rate.

const SIZE = 240;
const R = 96;
const DOTS = 60;
const DOTS_PER_SECOND = 15;   // one lap every four seconds
const TAIL = 2400;            // ms a lit dot takes to fade

export function FrameClock() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();

  useEffect(() => {
    const cv = canvas.current!;
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = SIZE * dpr;
    cv.height = SIZE * dpr;
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const col = { base: token("--grid"), lit: token("--ink"), bad: token("--bad"), ink: token("--ink"), ink3: token("--ink-3") };
    const font = getComputedStyle(document.body).fontFamily;
    const still = reducedMotion();

    let hz = 60;
    const n = DOTS;
    const lit = new Float64Array(DOTS);      // when each dot last lit
    const dropped = new Float64Array(DOTS);  // when each dot was last dropped
    let head = 0, last = 0, skip = true, raf = 0, visible = true, shownFps = 60, lastText = 0;
    let frames = 0, groupDropped = false;    // frames counted toward the next dot
    const deltas: number[] = [];
    const recent: number[] = [];                 // frame end times, last second

    const draw = (now: number) => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      const c = SIZE / 2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = c + Math.cos(a) * R, y = c + Math.sin(a) * R;
        const sinceDrop = now - dropped[i];
        const sinceLit = now - lit[i];
        let fill = col.base, alpha = 1, r = 2.2;
        if (dropped[i] && sinceDrop < 2400 && dropped[i] >= lit[i]) {
          fill = col.bad;
          r = 2.8;
        } else if (!still && sinceLit < TAIL) {
          fill = col.lit;
          alpha = Math.pow(1 - sinceLit / TAIL, 1.6);
          r = 2.2 + 1.2 * alpha;
        }
        ctx.fillStyle = col.base;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        if (fill !== col.base) {
          ctx.fillStyle = fill;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      // Update the reading a few times a second, slow enough to read.
      if (now - lastText > 500) {
        while (recent.length && recent[0] < now - 1000) recent.shift();
        shownFps = Math.min(hz, recent.length);
        lastText = now;
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = col.ink;
      ctx.font = `600 40px ${font}`;
      ctx.fillText(String(Math.round(shownFps)), c, c + 8);
      ctx.fillStyle = col.ink3;
      ctx.font = `400 12px ${font}`;
      ctx.fillText(`fps of ${hz}`, c, c + 28);
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!skip && last) {
        const d = now - last;
        deltas.push(d);
        if (deltas.length > 120) deltas.shift();
        if (deltas.length >= 30 && deltas.length % 30 === 0) {
          const est = estimateHz(deltas);
          if (est && est > hz) hz = est;
        }
        const perDot = Math.max(1, Math.round(hz / DOTS_PER_SECOND));
        const lost = missed(d, 1000 / hz);
        if (lost) groupDropped = true;
        // Every frame counts, drawn or dropped; each full group lights a dot.
        frames += 1 + lost;
        while (frames >= perDot) {
          frames -= perDot;
          head = (head + 1) % n;
          lit[head] = now;
          if (groupDropped) dropped[head] = now;
          groupDropped = false;
        }
        recent.push(now);
      }
      skip = false;
      last = now;
      draw(now);
    };

    // Coming back from a hidden tab or off screen isn't a dropped frame.
    const resume = () => {
      skip = true;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    const onVisibility = () => (document.hidden ? cancelAnimationFrame(raf) : resume());
    document.addEventListener("visibilitychange", onVisibility);
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting === visible) return;
      visible = e.isIntersecting;
      if (visible) resume();
      else cancelAnimationFrame(raf);
    });
    io.observe(cv);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [theme]);

  return <canvas ref={canvas} className="frame-clock" style={{ width: SIZE, height: SIZE }} role="img" aria-label="This browser's frame rate, live" />;
}
