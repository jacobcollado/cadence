import { useEffect, useRef } from "react";
import { reducedMotion } from "../../shared/motion";

// The hero's visual: the mark drawn huge in the home page's flat art. The
// ring lies back as a wide ellipse that runs off both sides of the page, a
// thick gray tube with an outline, over a flat shadow of itself, gap and
// dot included. The dot, the page's
// one violet moment, rides in the ring's gap: it turns at a steady beat and
// all but stops once a lap, like a missed frame, growing as it comes to the
// front. Everything is sized from the box, so it fills it at any width.

const LAP = 7000;                         // ms per turn
const CATCH = { at: 0.62, width: 0.07 };  // where in the lap it catches, and for how long
const REST = 0.18;                        // where the dot rests when still: front right, as in the mark

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/** Lap progress with the catch: a steady turn that all but stops for a moment, then carries on. */
function beat(p: number) {
  const hold = 0.6 * CATCH.width;
  return (p - hold * smooth(CATCH.at, CATCH.at + CATCH.width, p)) / (1 - hold);
}

export function HeroOrbit() {
  const host = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const box = host.current!, root = svg.current!;
    const part = <T extends SVGElement>(k: string) => root.querySelector(`[data-part="${k}"]`) as T;
    const shadow = part<SVGPathElement>("shadow"), edge = part<SVGPathElement>("edge"), tube = part<SVGPathElement>("tube");
    const dot = part<SVGCircleElement>("dot"), dotShadow = part<SVGEllipseElement>("dot-shadow");
    let drop = 0;
    let len = 0, gap = 0, cy = 0, ry = 0, r = 0, raf = 0, start = 0, visible = true;
    const still = reducedMotion();

    const size = () => {
      const { width: w, height: h } = box.getBoundingClientRect();
      root.setAttribute("viewBox", `0 0 ${w} ${h}`);
      // Wide enough to run off both sides of the screen; as tall as the box allows.
      const rx = Math.max(w, document.documentElement.clientWidth) * 0.58;
      ry = Math.min(h * 0.3, rx * 0.36);
      cy = h * 0.46;
      const stroke = Math.max(18, Math.min(ry * 0.26, 52));
      r = stroke * 1.25;
      // Drawn from the right-hand end, clockwise on screen, so it comes round the front first.
      const ring = (y: number) => `M ${w / 2 + rx} ${y} A ${rx} ${ry} 0 1 1 ${w / 2 - rx} ${y} A ${rx} ${ry} 0 1 1 ${w / 2 + rx} ${y}`;
      for (const p of [edge, tube]) p.setAttribute("d", ring(cy));
      // The shadow is the same ring dropped straight down onto the floor.
      drop = ry * 0.5;
      shadow.setAttribute("d", ring(cy + drop));
      edge.style.strokeWidth = `${stroke + 6}`;
      tube.style.strokeWidth = `${stroke}`;
      shadow.style.strokeWidth = `${stroke}`;
      len = tube.getTotalLength();
      // Room for the dot and a clear space either side of it, past the tube's round ends.
      gap = r * 2 + stroke + r * 1.1;
      for (const p of [edge, tube, shadow]) p.style.strokeDasharray = `${len - gap} ${gap}`;
    };

    const place = (p: number) => {
      const s = (((p % 1) + 1) % 1) * len;
      for (const q of [edge, tube, shadow]) q.style.strokeDashoffset = `${-(s + gap / 2)}`;
      const at = tube.getPointAtLength(s);
      const depth = (at.y - (cy - ry)) / (2 * ry); // 0 at the back, 1 at the front
      const size = r * (0.72 + 0.4 * depth);
      dot.setAttribute("cx", `${at.x}`);
      dot.setAttribute("cy", `${at.y}`);
      dot.setAttribute("r", `${size}`);
      dotShadow.setAttribute("cx", `${at.x}`);
      dotShadow.setAttribute("cy", `${at.y + drop}`);
      dotShadow.setAttribute("rx", `${size}`);
      dotShadow.setAttribute("ry", `${size * 0.45}`);
    };

    const frame = (now: number) => {
      if (!start) start = now;
      const t = now - start;
      place(REST + Math.floor(t / LAP) + beat((t % LAP) / LAP));
      if (visible) raf = requestAnimationFrame(frame);
    };

    size();
    place(REST);
    const ro = new ResizeObserver(() => { size(); if (still) place(REST); });
    ro.observe(box);
    // Past the page's width the box stops growing, but the screen still does.
    const widen = () => { size(); if (still) place(REST); };
    addEventListener("resize", widen);
    if (still) return () => { ro.disconnect(); removeEventListener("resize", widen); };

    // Off screen, nothing moves.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(frame);
    });
    io.observe(box);
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); removeEventListener("resize", widen); };
  }, []);

  return (
    <div ref={host} className="hero-ring" aria-hidden="true">
      <svg ref={svg}>
        <path data-part="shadow" className="hero-ring-shadow" />
        <ellipse data-part="dot-shadow" className="hero-ring-dot-shadow" />
        <path data-part="edge" className="hero-ring-edge" />
        <path data-part="tube" className="hero-ring-tube" />
        <circle data-part="dot" className="hero-ring-dot" />
      </svg>
    </div>
  );
}
