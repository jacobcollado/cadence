import { useEffect, useRef, useState } from "react";
import type { Run } from "../../shared/run";
import { computeStats, MODE_LABEL, type RunStats } from "../../shared/stats";
import { Bar, RatingTag } from "../components/ui";
import { TopBar } from "../components/TopBar";
import { decodeRun, listRuns, pathOf, when, SERIES } from "../lib";

interface Entry {
  run: Run;
  stats: RunStats;
  color: string;
}

interface Group {
  label: string;
  values: (number | null)[];
  dropped: (number | null)[];
}

interface Hover {
  group: number;
  entry: number;
  x: number;
  y: number;
}

// What tells runs apart in a sentence: the device, then the page, the mode or
// the time when the same device ran more than once.
function names(entries: Entry[]): string[] {
  return entries.map((e) => {
    const name = e.run.device.name;
    const same = entries.filter((o) => o.run.device.name === name);
    if (same.length === 1) return name;
    const page = pathOf(e.run.url);
    if (same.filter((o) => pathOf(o.run.url) === page).length === 1) return `${name} on ${page}`;
    if (same.filter((o) => o.run.mode === e.run.mode).length === 1) return `${name}, ${MODE_LABEL[e.run.mode].toLowerCase()}`;
    return `${name}, ${when(e.run.at).toLowerCase()}`;
  });
}

function summary(entries: Entry[], groups: Group[]): string {
  const r = Math.round;
  if (entries.every((e) => e.stats.rating === "smooth")) return `All ${entries.length} runs were smooth.`;
  const label = names(entries);
  const fps = entries.map((e) => e.stats.fps);
  const lo = fps.indexOf(Math.min(...fps));
  const hi = fps.indexOf(Math.max(...fps));
  if (r(fps[lo]) === r(fps[hi])) return `All ${entries.length} runs averaged ${r(fps[lo])} fps.`;
  let text = `${label[lo]} was the slowest at ${r(fps[lo])} fps, against ${r(fps[hi])} on ${label[hi]}.`;
  // The section where the runs split furthest apart.
  let widest: { label: string; min: number; max: number } | undefined;
  for (const g of groups.slice(1)) {
    const v = g.values.filter((x): x is number => x !== null);
    if (v.length < 2) continue;
    const min = Math.min(...v), max = Math.max(...v);
    if (!widest || max - min > widest.max - widest.min) widest = { label: g.label, min, max };
  }
  if (widest && r(widest.max - widest.min) >= 5) {
    text += ` The widest gap was in ${widest.label}, ${r(widest.min)} against ${r(widest.max)} fps.`;
  }
  return text;
}

export function Compare() {
  const ids = location.hash.slice(1).split(",").filter(Boolean);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const chart = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = listRuns();
    const picked = ids.map((id) => saved.find((r) => r.id === id)).filter((r) => !!r).slice(0, SERIES.length);
    Promise.all(picked.map((r) => decodeRun(r.data))).then((runs) =>
      setEntries(runs.map((run, i) => ({ run, stats: computeStats(run), color: SERIES[i] }))),
    );
  }, [location.hash]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!entries) return <div className="shell"><TopBar back /></div>;
  if (entries.length < 2) {
    return (
      <div className="shell">
        <TopBar back />
        <div className="recess empty enter" style={{ marginTop: 48 }}>
          <strong>Pick two runs or more</strong>
          Select runs in the list, then compare them.
        </div>
      </div>
    );
  }

  // Sections line up by name, in page order, merged across runs.
  const merged: string[] = [];
  for (const e of entries) {
    let at = 0;
    for (const s of e.stats.sections) {
      const i = merged.indexOf(s.label);
      if (i >= 0) at = i + 1;
      else merged.splice(at++, 0, s.label);
    }
  }
  const labels = merged.filter((l) => entries.some((e) => e.stats.judged.some((s) => s.label === l)));
  const groups: Group[] = [
    { label: "Whole run", values: entries.map((e) => e.stats.fps), dropped: entries.map((e) => e.stats.dropped) },
    ...labels.map((label) => {
      const found = entries.map((e) => e.stats.judged.find((s) => s.label === label));
      return { label, values: found.map((s) => s?.fps ?? null), dropped: found.map((s) => s?.dropped ?? null) };
    }),
  ];
  const max = Math.max(...entries.map((e) => e.run.hz));
  const ticks = [0, 30, 60, 90, 120, 144, 240].filter((t) => t <= max);

  const showTip = (group: number, entry: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const c = chart.current!.getBoundingClientRect();
    setHover({ group, entry, x: r.right - c.left, y: r.top - c.top });
  };

  const tip = hover && (() => {
    const e = entries[hover.entry];
    const g = groups[hover.group];
    const left = Math.min(hover.x + 12, (chart.current?.offsetWidth ?? 0) - 200);
    return (
      <div className="tooltip" style={{ left: Math.max(0, left), top: hover.y - 8 }}>
        <div className="tooltip-title">{e.run.device.name}</div>
        <div className="tooltip-row"><span>{g.label}</span><span className="num">{Math.round(g.values[hover.entry] ?? 0)} fps</span></div>
        <div className="tooltip-row"><span>Dropped frames</span><span className="num">{g.dropped[hover.entry]}</span></div>
        <div className="tooltip-row"><span>Refresh rate</span><span className="num">{e.run.hz} Hz</span></div>
      </div>
    );
  })();

  return (
    <div className="shell">
      <TopBar back />
      <header className="report-head enter">
        <h1 className="subtitle">Compare runs</h1>
        <p className="compare-summary">{summary(entries, groups)}</p>
      </header>

      <div className="compare-legend enter">
        {entries.map((e) => (
          <div className="compare-legend-row" key={e.run.id}>
            <i className="dot" style={{ background: e.color }} />
            <div className="compare-legend-name">
              <span>{e.run.device.name}</span>
              <span className="muted">{MODE_LABEL[e.run.mode]} · {when(e.run.at)}</span>
            </div>
            <RatingTag rating={e.stats.rating} />
            <div className="run-fps">
              <strong className="num">{Math.round(e.stats.fps)}</strong>
              <span>fps</span>
            </div>
          </div>
        ))}
      </div>

      <section className="card block enter">
        <div className="block-head">
          <div className="block-title">
            <h2 className="h2">Frame rate by section</h2>
            <p className="meta">Longer bars held more frames a second, out of {max}.</p>
          </div>
        </div>
        <div ref={chart} style={{ position: "relative" }} onPointerLeave={() => setHover(null)}>
          {groups.map((g, gi) => (
            <div className="group" key={g.label}>
              <span className="group-label">{g.label}</span>
              <div className="group-bars">
                {entries.map((e, ei) => {
                  const v = g.values[ei];
                  return (
                    <div className="gbar-row" key={e.run.id}>
                      {v === null ? (
                        <span className="brief">Too brief</span>
                      ) : (
                        <>
                          <div style={{ flex: `0 0 calc((100% - 32px) * ${v / max})`, minWidth: 2 }}>
                            <Bar value={1} className="gbar" color={e.color} delay={gi * 30 + ei * 20} />
                          </div>
                          <span className="num">{Math.round(v)}</span>
                        </>
                      )}
                      {v !== null && (
                        <span
                          className="gbar-hit"
                          onPointerEnter={(ev) => showTip(gi, ei, ev.currentTarget.previousElementSibling as HTMLElement)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="axis">
            <span />
            <div className="axis-ticks" style={{ marginRight: 32 }}>
              {ticks.map((t) => <span key={t} className="num" style={{ left: `${(t / max) * 100}%` }}>{t}</span>)}
            </div>
          </div>
          {tip}
        </div>
      </section>
    </div>
  );
}
