import { useEffect, useRef, useState, type CSSProperties } from "react";
import { reducedMotion } from "../../shared/motion";
import { tier } from "../../shared/stats";
import { SERIES } from "../lib";
import { CountUp } from "./ui";

// The same two seconds of scrolling on three devices, every frame drawn to
// scale: a bar's width is how long the frame lasted, its height too. On time
// is gray, late amber, a freeze red. A playhead sweeps the lanes in real time
// the first time they come into view.

const SPAN = 2000;          // ms shown
const BUDGET = 1000 / 60;   // one refresh at 60 Hz
const TOP = 60;             // ms at the top of a lane
const LEAD = 300;           // ms before the sweep starts

type Lane = { name: string; color: string; frames: number[] };

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
  { name: "Laptop", color: SERIES[2], frames: run(7, 0, []) },
  { name: "iPhone", color: SERIES[0], frames: run(11, 0.03, []) },
  { name: "Android", color: SERIES[1], frames: run(23, 0.18, [0.34, 0.41, 0.72]) },
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
                <span><i style={{ background: lane.color }} />{lane.name}</span>
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
