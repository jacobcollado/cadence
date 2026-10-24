import { useEffect, useRef } from "react";
import { reducedMotion } from "../../shared/motion";
import { estimateHz, missed } from "../../shared/stats";
import { token, useTheme } from "../theme";

// The hero's visual, live: a ring of one dot per frame in a second. Each frame
// this browser draws lights the next dot, so a bright head sweeps round with a
// fading tail; a frame it drops leaves its dot red. The center reads the frame
// rate right now. Nothing here is staged.

const SIZE = 240;
const R = 96;
const MAX_DOTS = 120;   // past 120 Hz, a dot stands for two frames

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

    let hz = 60, n = 60;
    const lit = new Float64Array(MAX_DOTS);      // when each dot last lit
    const dropped = new Float64Array(MAX_DOTS);  // when each dot was last dropped
    let head = 0, last = 0, skip = true, raf = 0, visible = true, shownFps = 60, lastText = 0;
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
        if (sinceDrop < 1400 && dropped[i] > lit[i]) {
          fill = col.bad;
          r = 2.8;
        } else if (!still && sinceLit < 900) {
          fill = col.lit;
          alpha = 1 - sinceLit / 900;
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
      // The live reading, refreshed a few times a second so it can be read.
      if (now - lastText > 250) {
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
          if (est && est > hz) {
            hz = est;
            n = Math.min(MAX_DOTS, hz);
          }
        }
        const interval = 1000 / hz;
        const step = hz > MAX_DOTS ? 2 : 1;
        const lost = missed(d, interval);
        // Frames the browser never drew: their dots turn red.
        for (let k = 0; k < lost; k += step) {
          head = (head + 1) % n;
          dropped[head] = now;
        }
        head = (head + 1) % n;
        lit[head] = now;
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
