import { useEffect, useRef, useState } from "react";
import type { Run } from "../../shared/run";
import { computeStats, MODE_LABEL, type RunStats } from "../../shared/stats";
import { Bar, CountUp, Fields, Icon, RatingTag, splitName } from "../components/ui";
import { TopBar } from "../components/TopBar";
import { decodeRun, listRuns, navigate, pathOf, when, SERIES } from "../lib";

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
    const name = e.run.device.name.replace(" · ", " ");
    const same = entries.filter((o) => o.run.device.name === e.run.device.name);
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

  if (!entries) return <div className="shell"><TopBar /></div>;
  if (entries.length < 2) {
    return (
      <div className="shell">
        <TopBar />
        <div className="rails report">
          <section className="report-sec report-top">
            <div className="recess empty enter">
              <strong>Pick two runs or more</strong>
              Select runs in the list, then compare them.
            </div>
          </section>
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
  const saved = listRuns();
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
        <div className="tooltip-title"><span>{splitName(e.run.device.name).device}</span><span className="muted">{splitName(e.run.device.name).browser}</span></div>
        <div className="tooltip-row"><span>{g.label}</span><span className="num">{Math.round(g.values[hover.entry] ?? 0)} fps</span></div>
        <div className="tooltip-row"><span>Dropped frames</span><span className="num">{g.dropped[hover.entry]}</span></div>
        <div className="tooltip-row"><span>Refresh rate</span><span className="num">{e.run.hz} Hz</span></div>
      </div>
    );
  })();

  return (
    <div className="shell">
      <TopBar />
      <div className="rails report compare">
        <section className="report-sec report-top">
          <header className="compare-head enter">
            <a href="/#runs" className="compare-back" onClick={(e) => { e.preventDefault(); navigate("/#runs"); }}>
              <Icon name="back" size={14} />All runs
            </a>
            <div className="compare-title">
              <h1 className="subtitle">Compare runs</h1>
              <span className="compare-count num">{entries.length} runs</span>
            </div>
            {/* The verdict, labeled, so it reads as the answer and not as more title. */}
            <div className="compare-verdict">
              <span className="field-label">Summary</span>
              <p className="compare-summary">{summary(entries, groups)}</p>
            </div>
          </header>
        </section>

        {/* One card per run, keyed by its color in the chart below; each opens its report. */}
        <section className="report-sec">
          <h2 className="h2 compare-sec-title">Runs</h2>
          <div className="compare-runs enter">
            {entries.map((e, i) => {
              const n = splitName(e.run.device.name);
              const data = saved.find((r) => r.id === e.run.id)?.data;
              const href = data ? `/r#${data}` : undefined;
              return (
                <a key={e.run.id} className="card compare-run" href={href} onClick={(ev) => { if (!href) return; ev.preventDefault(); navigate(href); }}>
                  <span className="compare-run-top">
                    <span className="compare-run-label"><i className="compare-key" style={{ background: e.color }} />Run {i + 1}</span>
                    <RatingTag rating={e.stats.rating} />
                  </span>
                  <span className="compare-run-name">
                    <span className="compare-device">{n.device}</span>
                    <span className="meta">{n.browser}</span>
                  </span>
                  <span className="compare-run-stat">
                    <span className="field-label">Average frame rate</span>
                    <span className="compare-fps num"><CountUp value={Math.round(e.stats.fps)} /><span>fps</span></span>
                  </span>
                  <Fields items={[["Mode", MODE_LABEL[e.run.mode]], ["Page", pathOf(e.run.url)], ["Tested", when(e.run.at)]]} />
                </a>
              );
            })}
          </div>
        </section>

        <section className="report-sec report-panel">
          <section className="card block enter">
            <div className="block-head">
              <div className="block-title">
                <h2 className="h2">Frame rate by section</h2>
                <p className="meta">Longer bars held more frames a second, out of {max}.</p>
              </div>
              {/* Which color is which run, matching the cards above. */}
              <div className="legend">
                {entries.map((e, i) => <span key={e.run.id}><i className="swatch" style={{ background: e.color }} />Run {i + 1}</span>)}
              </div>
            </div>
            <div ref={chart} className="compare-chart" onPointerLeave={() => setHover(null)}>
              {/* Gridlines at each tick, behind the bars. */}
              <div className="compare-grid" aria-hidden="true">
                <span />
                <div className="compare-grid-lines">
                  {ticks.map((t) => <i key={t} style={{ left: `${(t / max) * 100}%` }} />)}
                </div>
              </div>
              {groups.map((g, gi) => (
                <div className="group" data-whole={gi === 0 || undefined} key={g.label}>
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
                              <div style={{ flex: `0 0 calc((100% - 40px) * ${v / max})`, minWidth: 2 }}>
                                <Bar value={1} className="gbar" color={e.color} delay={gi * 30 + ei * 20} />
                              </div>
                              <span className="num">{Math.round(v)}</span>
                            </>
                          )}
                          {v !== null && (
                            <span
                              className="gbar-hit"
                              onPointerEnter={(ev) => ev.pointerType === "mouse" && showTip(gi, ei, ev.currentTarget.parentElement!.firstElementChild as HTMLElement)}
                              onClick={(ev) => showTip(gi, ei, ev.currentTarget.parentElement!.firstElementChild as HTMLElement)}
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
                <div className="axis-ticks">
                  {ticks.map((t) => <span key={t} className="num" style={{ left: `${(t / max) * 100}%` }}>{t}</span>)}
                </div>
              </div>
              {tip}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
