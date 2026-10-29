import { useEffect, useRef, useState, type CSSProperties } from "react";
import { reducedMotion } from "../../shared/motion";
import { Icon, RatingTag, ScoreRing } from "./ui";

// One scroll down a page, read by three tools, in aligned rows: each tool's
// name and verdict on the left, what it shows of the scroll in a panel on the
// right, so the same frames line up down all three. Lighthouse grades the
// load and never sees the scroll. DevTools records every frame as a raw
// trace, unnamed. Cadence shows the same frames in the home page's flat art,
// late ones in red, split by the section on screen, with the section that
// stuttered held in a selection frame tagged with its cause.

const BUDGET = 1000 / 60;
const CAP = 60; // ms at full bar height

// How long each frame took, in ms, section by section.
const SECTIONS: { name: string; times: number[]; cause?: string }[] = [
  { name: "Hero", times: [16, 15, 17, 16, 16, 15, 16, 17] },
  { name: "Features", times: [16, 16, 15, 33, 16, 17, 16, 15] },
  { name: "Pricing", times: [17, 50, 58, 34, 52, 33, 48, 17], cause: "Forced layout" },
  { name: "Footer", times: [16, 15, 16, 17, 16, 16, 15, 16] },
];
const STEP = 24; // ms between bars as they rise

export function VsFrames() {
  const el = useRef<HTMLElement>(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    if (reducedMotion()) { setPlay(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setPlay(true);
    }, { rootMargin: "0px 0px -20% 0px" });
    io.observe(el.current!);
    return () => io.disconnect();
  }, []);

  // Each bar's place in the whole run, so the rows rise in step.
  let k = 0;
  const bars = SECTIONS.map((s) => s.times.map((ms) => ({ ms, i: k++ })));

  return (
    <figure ref={el} className="vs" data-play={play || undefined} aria-label="The same scroll read three ways. Lighthouse scores the load 96 and doesn't measure the scroll. DevTools shows every frame as a raw trace. Cadence splits the frames by section and shows that Pricing stuttered from forced layout.">
      <div className="vs-row">
        <div className="vs-head">
          <span className="vs-tool">Lighthouse</span>
          <span className="vs-verdict">{play ? <ScoreRing score={96} size={28} /> : <span className="vs-ring" />}Load only</span>
        </div>
        <div className="vs-panel vs-blind" aria-hidden="true">Scroll not measured</div>
      </div>

      <div className="vs-row">
        <div className="vs-head">
          <span className="vs-tool">DevTools</span>
          <span className="vs-verdict">Raw trace, unnamed</span>
        </div>
        <div className="vs-panel" aria-hidden="true">
          <span className="vs-track">
            {bars.map((group, g) => (
              <span key={g} className="vs-group">
                <span className="vs-bars">
                  {group.map(({ ms, i }) => <span key={i} className="vs-bar vs-raw" style={bar(ms, i)} />)}
                </span>
              </span>
            ))}
          </span>
        </div>
      </div>

      <div className="vs-row vs-row-ours">
        <div className="vs-head">
          <span className="vs-tool vs-ours">cadence</span>
          <span className="vs-verdict"><RatingTag rating="choppy" /></span>
        </div>
        <div className="vs-panel" aria-hidden="true">
          <span className="vs-track">
            {bars.map((group, g) => {
              const s = SECTIONS[g];
              return (
                <span key={g} className="vs-group" data-flagged={s.cause ? true : undefined}>
                  {s.cause && (
                    <span className="vs-flag">
                      {["tl", "tr", "bl", "br"].map((c) => <span key={c} className="vs-handle" data-at={c} />)}
                      <span className="vs-cause"><Icon name="choppy" size={14} />{s.cause}</span>
                    </span>
                  )}
                  <span className="vs-bars">
                    {group.map(({ ms, i }) => (
                      <span key={i} className="art vs-bar" data-late={ms > BUDGET + 1 || undefined} style={bar(ms, i)} />
                    ))}
                  </span>
                  <span className="vs-label">{s.name}</span>
                </span>
              );
            })}
          </span>
        </div>
      </div>
    </figure>
  );
}

function bar(ms: number, i: number): CSSProperties {
  return { "--h": `${Math.min(ms / CAP, 1) * 100}%`, "--t": `${i * STEP}ms` } as CSSProperties;
}
