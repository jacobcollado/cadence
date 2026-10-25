import { useEffect, useRef, useState, type CSSProperties } from "react";
import { reducedMotion } from "../../shared/motion";
import { tier } from "../../shared/stats";
import { CountUp } from "./ui";

// The same two seconds of scrolling on three devices, every frame drawn to
// scale: a bar's width is how long the frame lasted, its height too. On time
// is gray, late amber, a freeze red. A playhead sweeps the lanes in real time
// the first time they come into view.

const SPAN = 2000;          // ms shown
const BUDGET = 1000 / 60;   // one refresh at 60 Hz
const TOP = 60;             // ms at the top of a lane
const LEAD = 300;           // ms before the sweep starts

type Device = "laptop" | "apple" | "android";
type Lane = { name: string; device: Device; frames: number[] };

/** The device beside each lane: the Apple and Android marks, and a plain laptop drawn to the same weight. */
function DeviceIcon({ device }: { device: Device }) {
  if (device === "apple") return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
  if (device === "android") return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M2 19a10 10 0 0 1 20 0zM7 15a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0zM14.8 15a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0z" />
      <path d="M6.6 10.2L4.4 6.4M17.4 10.2l2.2-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M5.5 4h13A1.5 1.5 0 0 1 20 5.5V16H4V5.5A1.5 1.5 0 0 1 5.5 4zM6 6v8h12V6z" />
      <rect x="1.5" y="17.5" width="21" height="2.5" rx="1.25" />
    </svg>
  );
}

/** A repeatable run of frame durations: mostly on time, with the given mix of slow ones. */
function run(seed: number, late: number, freezes: number[]): number[] {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out: number[] = [];
  let t = 0;
  while (t < SPAN) {
    // Freezes land where the run says, as fractions of the span.
    const freeze = freezes.find((f) => t >= f * SPAN && t < f * SPAN + BUDGET * 2);
    const d = freeze !== undefined ? 50 + rand() * 40
      : rand() < late ? BUDGET * 2
      : BUDGET * (0.97 + rand() * 0.06);
    if (freeze !== undefined) freezes = freezes.filter((f) => f !== freeze);
    out.push(Math.min(d, SPAN - t));
    t += d;
  }
  return out;
}

const LANES: Lane[] = [
  { name: "Laptop", device: "laptop", frames: run(7, 0, []) },
  { name: "iPhone", device: "apple", frames: run(11, 0.03, []) },
  { name: "Android", device: "android", frames: run(23, 0.18, [0.34, 0.41, 0.72]) },
];

export function FrameLanes() {
  const el = useRef<HTMLElement>(null);
  const [play, setPlay] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (reducedMotion()) { setPlay(true); setDone(true); return; }
    let timer = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setPlay(true);
      timer = window.setTimeout(() => setDone(true), LEAD + SPAN);
    }, { rootMargin: "0px 0px -20% 0px" });
    io.observe(el.current!);
    return () => { io.disconnect(); clearTimeout(timer); };
  }, []);

  return (
    <figure ref={el} className="lanes" data-play={play || undefined} aria-label="The same two seconds of scrolling on a laptop, an iPhone and an Android phone">
      <div className="lanes-plot">
        {LANES.map((lane) => {
          let t = 0;
          const fps = Math.round(lane.frames.length / (SPAN / 1000));
          return (
            <div key={lane.name} className="lane">
              <div className="lane-name">
                <span><span className="lane-icon"><DeviceIcon device={lane.device} /></span>{lane.name}</span>
                <span className="lane-fps num"><CountUp value={done ? fps : 0} /> fps</span>
              </div>
              <div className="lane-track" aria-hidden="true">
                <span className="lane-budget" />
                {lane.frames.map((d, i) => {
                  const start = t;
                  t += d;
                  return (
                    <span
                      key={i}
                      className="lane-bar"
                      data-tier={tier(d, BUDGET) || undefined}
                      style={{
                        left: `${(start / SPAN) * 100}%`,
                        width: `${(d / SPAN) * 100}%`,
                        height: `${(Math.min(d, TOP) / TOP) * 100}%`,
                        "--t": `${LEAD + start + d}ms`,
                      } as CSSProperties}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="lanes-axis" aria-hidden="true">
          <span />
          <span className="lanes-ticks"><span>0 s</span><span className="lanes-key"><i />16.7 ms, one refresh</span><span>2 s</span></span>
        </div>
        <span className="lanes-head" aria-hidden="true" style={{ "--lead": `${LEAD}ms`, "--span": `${SPAN}ms` } as CSSProperties} />
      </div>
    </figure>
  );
}
