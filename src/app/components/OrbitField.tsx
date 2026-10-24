import { useEffect, useRef } from "react";
import { reducedMotion } from "../../shared/motion";
import { token, useTheme } from "../theme";

// The hero's visual: tilted orbits with dots gliding at a steady cadence, each
// with a fading trail. Every few seconds one dot stutters (it freezes, then
// jumps ahead in red, with a ring where it skipped), the way a dropped frame
// does. Canvas, paused off screen, still under reduced motion.

const W = 360, H = 300;
const TILT = -0.26;                    // radians
const SQUASH = 0.42;                   // ellipse height over width
const ORBITS = [46, 74, 102, 130, 158];
const DOTS = [                          // [orbit, phase, laps per minute]
  [0, 0.1, 14], [1, 2.4, 10], [2, 4.2, 8], [2, 1.0, 8], [3, 3.1, 6.5], [4, 5.0, 5.5], [4, 1.9, 5.5],
] as const;
const STUTTER_DOT = 3;                  // which dot drops frames
const STUTTER_EVERY = 3200, FREEZE = 260, FLASH = 700;

export function OrbitField() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();

  useEffect(() => {
    const cv = canvas.current!;
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = W * dpr;
    cv.height = H * dpr;
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const col = { ring: token("--grid"), dot: token("--ink-2"), center: token("--ink"), bad: token("--bad") };
    const cx = W / 2, cy = H / 2;
    const cos = Math.cos(TILT), sin = Math.sin(TILT);
    const at = (r: number, a: number) => {
      const x = Math.cos(a) * r, y = Math.sin(a) * r * SQUASH;
      return [cx + x * cos - y * sin, cy + x * sin + y * cos] as const;
    };
    // The stuttering dot's lag behind where it should be, in radians.
    let lag = 0, frozenUntil = 0, flashUntil = 0, nextStutter = performance.now() + 1600;
    let skipAt: readonly [number, number] | null = null;

    const draw = (now: number) => {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.strokeStyle = col.ring;
      for (const r of ORBITS) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * SQUASH, TILT, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = col.center;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      DOTS.forEach(([o, phase, lpm], i) => {
        const r = ORBITS[o];
        const speed = (lpm / 60000) * Math.PI * 2;
        let a = phase + now * speed;
        if (i === STUTTER_DOT) {
          if (now < frozenUntil) lag += speed * 16.7;          // holds still while time moves on
          else if (lag > 0) { skipAt = at(r, a - lag); lag = 0; flashUntil = now + FLASH; }
          a -= lag;
        }
        const red = i === STUTTER_DOT && now < flashUntil;
        // Trail: a fading arc behind the dot.
        const steps = 18;
        for (let k = steps; k > 0; k--) {
          const t = k / steps;
          const [x, y] = at(r, a - t * 0.5);
          ctx.globalAlpha = (1 - t) * 0.35;
          ctx.fillStyle = red ? col.bad : col.dot;
          ctx.beginPath();
          ctx.arc(x, y, 2.2 * (1 - t * 0.6), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        const [x, y] = at(r, a);
        ctx.fillStyle = red ? col.bad : col.dot;
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // A ring where the dot skipped from, widening as it fades.
      if (skipAt && now < flashUntil) {
        const t = 1 - (flashUntil - now) / FLASH;
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = col.bad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(skipAt[0], skipAt[1], 4 + t * 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (now > nextStutter) {
        frozenUntil = now + FREEZE;
        nextStutter = now + STUTTER_EVERY;
      }
    };

    if (reducedMotion()) {
      draw(4000);
      return;
    }
    let raf = 0, visible = true;
    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting === visible) return;
      visible = e.isIntersecting;
      if (visible) raf = requestAnimationFrame(loop);
      else cancelAnimationFrame(raf);
    });
    io.observe(cv);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [theme]);

  return <canvas ref={canvas} className="orbit-field" style={{ width: W, height: H }} aria-hidden="true" />;
}
